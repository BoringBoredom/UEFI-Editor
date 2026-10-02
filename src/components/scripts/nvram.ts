// Parser/patcher for AMI NVAR stores (Aptio V NVRAM) containing the
// "StdDefaults" (Optimal) and "MfgDefaults" (Failsafe) variables.
//
// The data of those variables is itself an NVAR store holding a copy of every
// VarStore variable ("Setup", "PchSetup", "CpuSetup", ...). On many boards
// "Load Optimized Defaults" reads its values from these copies instead of the
// defaults stored in the HII database / setupdata.

const NVAR_SIGNATURE = 0x5241564e; // "NVAR"
const NVAR_HEADER_SIZE = 10;
const NVAR_NEXT_NONE = 0xffffff;
const MAX_CHAIN_LENGTH = 1024;

const ATTR_ASCII_NAME = 0x02;
const ATTR_GUID = 0x04;
const ATTR_DATA_ONLY = 0x08;
const ATTR_EXT_HEADER = 0x10;
const ATTR_VALID = 0x80;

const EXT_ATTR_CHECKSUM = 0x01;

export const STD_DEFAULTS = "StdDefaults";
export const MFG_DEFAULTS = "MfgDefaults";

export type DefaultsStoreName = typeof STD_DEFAULTS | typeof MFG_DEFAULTS;

export interface NvramVariable {
  name: string;
  /** Uppercase GUID string or null when it couldn't be determined */
  guid: string | null;
  /** Absolute offset of the variable data in the file */
  dataOffset: number;
  dataLength: number;
  /**
   * Absolute offsets of the checksum bytes of all enclosing entries that
   * carry a checksum, ordered from innermost (the variable itself) to
   * outermost (the StdDefaults/MfgDefaults entry).
   */
  checksumOffsets: number[];
}

export interface NvramDefaultsStore {
  storeName: DefaultsStoreName;
  /** Absolute offset of the (latest) StdDefaults/MfgDefaults entry */
  entryOffset: number;
  variables: NvramVariable[];
}

export interface NvramDefaults {
  std: NvramDefaultsStore[];
  mfg: NvramDefaultsStore[];
}

export interface NvramChange {
  offset: number;
  oldValue: number;
  newValue: number;
}

interface NvarEntry {
  offset: number;
  size: number;
  next: number;
  attributes: number;
  name: string | null;
  guid: string | null;
  guidIndex: number | null;
  dataStart: number;
  dataEnd: number;
  checksumOffset: number | null;
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readU32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function hex(value: number, digits: number) {
  return value.toString(16).toUpperCase().padStart(digits, "0");
}

export function formatGuid(bytes: Uint8Array, offset: number) {
  const data4 = [];
  for (let i = 0; i < 8; i++) {
    data4.push(hex(bytes[offset + 8 + i], 2));
  }

  return `${hex(readU32(bytes, offset), 8)}-${hex(
    readU16(bytes, offset + 4),
    4,
  )}-${hex(readU16(bytes, offset + 6), 4)}-${data4
    .slice(0, 2)
    .join("")}-${data4.slice(2).join("")}`;
}

export function normalizeGuid(guid: string) {
  return guid.replace(/[{}\s]/g, "").toUpperCase();
}

function isNvarSignature(bytes: Uint8Array, offset: number) {
  return (
    offset >= 0 &&
    offset + 4 <= bytes.length &&
    readU32(bytes, offset) === NVAR_SIGNATURE
  );
}

/**
 * Parses a single NVAR entry. Returns null if the entry is malformed or does
 * not fit within [offset, limit).
 */
function parseEntry(
  bytes: Uint8Array,
  offset: number,
  limit: number,
): NvarEntry | null {
  if (offset < 0 || offset + NVAR_HEADER_SIZE > limit) {
    return null;
  }

  if (!isNvarSignature(bytes, offset)) {
    return null;
  }

  const size = readU16(bytes, offset + 4);
  const next = readU24(bytes, offset + 6);
  const attributes = bytes[offset + 9];

  if (size < NVAR_HEADER_SIZE || offset + size > limit) {
    return null;
  }

  const entryEnd = offset + size;
  let dataStart = offset + NVAR_HEADER_SIZE;
  let dataEnd = entryEnd;
  let name: string | null = null;
  let guid: string | null = null;
  let guidIndex: number | null = null;
  let checksumOffset: number | null = null;

  const valid = (attributes & ATTR_VALID) !== 0;

  if (valid && !(attributes & ATTR_DATA_ONLY)) {
    if (attributes & ATTR_GUID) {
      if (dataStart + 16 > entryEnd) {
        return null;
      }
      guid = formatGuid(bytes, dataStart);
      dataStart += 16;
    } else {
      if (dataStart + 1 > entryEnd) {
        return null;
      }
      guidIndex = bytes[dataStart];
      dataStart += 1;
    }

    let nameChars = "";
    if (attributes & ATTR_ASCII_NAME) {
      let terminated = false;
      while (dataStart < entryEnd) {
        const char = bytes[dataStart++];
        if (char === 0) {
          terminated = true;
          break;
        }
        nameChars += String.fromCharCode(char);
      }
      if (!terminated) {
        return null;
      }
    } else {
      let terminated = false;
      while (dataStart + 2 <= entryEnd) {
        const char = readU16(bytes, dataStart);
        dataStart += 2;
        if (char === 0) {
          terminated = true;
          break;
        }
        nameChars += String.fromCharCode(char);
      }
      if (!terminated) {
        return null;
      }
    }
    name = nameChars;
  }

  if (valid && attributes & ATTR_EXT_HEADER && size > 12) {
    const extHeaderSize = readU16(bytes, entryEnd - 2);

    if (extHeaderSize >= 3 && entryEnd - extHeaderSize >= dataStart) {
      const extAttributes = bytes[entryEnd - extHeaderSize];
      dataEnd = entryEnd - extHeaderSize;

      if (extAttributes & EXT_ATTR_CHECKSUM) {
        checksumOffset = entryEnd - 3;
      }
    }
  }

  if (dataEnd < dataStart) {
    return null;
  }

  return {
    offset,
    size,
    next,
    attributes,
    name,
    guid,
    guidIndex,
    dataStart,
    dataEnd,
    checksumOffset,
  };
}

/**
 * Follows the "Next" chain of an entry to the latest version of the variable.
 * Returns null if the chain is broken or the latest version is invalid.
 */
function followChain(
  bytes: Uint8Array,
  head: NvarEntry,
  limitStart: number,
  limitEnd: number,
): NvarEntry | null {
  let current = head;
  const visited = new Set<number>([head.offset]);

  for (let i = 0; i < MAX_CHAIN_LENGTH; i++) {
    if (current.next === NVAR_NEXT_NONE || current.next === 0) {
      return current.attributes & ATTR_VALID ? current : null;
    }

    const nextOffset = current.offset + current.next;

    if (
      nextOffset < limitStart ||
      nextOffset >= limitEnd ||
      visited.has(nextOffset)
    ) {
      return null;
    }

    const nextEntry = parseEntry(bytes, nextOffset, limitEnd);

    if (!nextEntry) {
      return null;
    }

    visited.add(nextOffset);
    current = nextEntry;
  }

  return null;
}

function parseNestedStore(
  bytes: Uint8Array,
  start: number,
  end: number,
  outerChecksumOffsets: number[],
): NvramVariable[] {
  const heads: NvarEntry[] = [];
  let offset = start;

  while (offset + NVAR_HEADER_SIZE <= end) {
    const entry = parseEntry(bytes, offset, end);

    if (!entry) {
      break;
    }

    if (
      entry.attributes & ATTR_VALID &&
      !(entry.attributes & ATTR_DATA_ONLY) &&
      entry.name !== null
    ) {
      heads.push(entry);
    }

    offset += entry.size;
  }

  // Entries without a local GUID reference the GUID store by index. In a
  // nested store it sits at the very end of the enclosing variable's data and
  // grows backwards (same as UEFITool). It must not overlap the entries.
  const entriesEnd = offset;
  const resolveGuidIndex = (index: number) => {
    const guidOffset = end - (index + 1) * 16;

    if (guidOffset < entriesEnd) {
      return null;
    }

    // erased/zeroed space is not a GUID
    const guidBytes = bytes.subarray(guidOffset, guidOffset + 16);
    if (
      guidBytes.every((byte) => byte === 0xff) ||
      guidBytes.every((byte) => byte === 0)
    ) {
      return null;
    }

    return formatGuid(bytes, guidOffset);
  };

  const variables: NvramVariable[] = [];

  for (const head of heads) {
    const latest = followChain(bytes, head, start, end);

    if (!latest) {
      continue;
    }

    const guid =
      head.guid ??
      (head.guidIndex !== null ? resolveGuidIndex(head.guidIndex) : null);

    const checksumOffsets = [...outerChecksumOffsets];
    if (latest.checksumOffset !== null) {
      checksumOffsets.unshift(latest.checksumOffset);
    }

    variables.push({
      name: head.name ?? "",
      guid,
      dataOffset: latest.dataStart,
      dataLength: latest.dataEnd - latest.dataStart,
      checksumOffsets,
    });
  }

  return variables;
}

/**
 * Scans a whole buffer (NVRAM volume or full BIOS image) for StdDefaults and
 * MfgDefaults stores. Every copy found is returned. Never throws on garbage.
 */
export function parseNvramDefaults(bytes: Uint8Array): NvramDefaults {
  const result: NvramDefaults = { std: [], mfg: [] };
  const seen = new Set<number>();
  const length = bytes.length;

  for (let offset = 0; offset + NVAR_HEADER_SIZE <= length; offset++) {
    // fast path: "N"
    if (bytes[offset] !== 0x4e || !isNvarSignature(bytes, offset)) {
      continue;
    }

    try {
      const entry = parseEntry(bytes, offset, length);

      if (
        !entry ||
        !(entry.attributes & ATTR_VALID) ||
        entry.attributes & ATTR_DATA_ONLY ||
        (entry.name !== STD_DEFAULTS && entry.name !== MFG_DEFAULTS)
      ) {
        continue;
      }

      const latest = followChain(bytes, entry, 0, length);

      if (!latest || seen.has(latest.offset)) {
        continue;
      }

      seen.add(latest.offset);

      if (!isNvarSignature(bytes, latest.dataStart)) {
        continue;
      }

      const variables = parseNestedStore(
        bytes,
        latest.dataStart,
        latest.dataEnd,
        latest.checksumOffset !== null ? [latest.checksumOffset] : [],
      );

      if (variables.length === 0) {
        continue;
      }

      const store: NvramDefaultsStore = {
        storeName: entry.name,
        entryOffset: latest.offset,
        variables,
      };

      if (entry.name === STD_DEFAULTS) {
        result.std.push(store);
      } else {
        result.mfg.push(store);
      }
    } catch {
      // ignore garbage
    }
  }

  return result;
}

/**
 * Returns every copy of a variable across all given defaults stores (one per
 * store at most). If a GUID is given and a store contains several variables
 * with the same name, only the one with the matching GUID is used (ambiguous
 * matches are skipped). Variables whose GUID is known and differs from the
 * wanted GUID are skipped.
 */
export function findVariables(
  stores: NvramDefaultsStore[],
  name: string,
  guid?: string | null,
): NvramVariable[] {
  const wanted = guid ? normalizeGuid(guid) : null;
  const found: NvramVariable[] = [];

  for (const store of stores) {
    const candidates = store.variables.filter(
      (variable) =>
        variable.name === name &&
        (wanted === null ||
          variable.guid === null ||
          normalizeGuid(variable.guid) === wanted),
    );

    const exact = candidates.find(
      (variable) =>
        wanted !== null &&
        variable.guid !== null &&
        normalizeGuid(variable.guid) === wanted,
    );

    // Several variables can share a name (e.g. two "Setup" variables with
    // different GUIDs). Without an exact GUID match, don't guess.
    if (exact) {
      found.push(exact);
    } else if (candidates.length === 1) {
      found.push(candidates[0]);
    }
  }

  return found;
}

export function fitsInVariable(
  variable: NvramVariable,
  offset: number,
  size: number,
) {
  return (
    Number.isInteger(offset) &&
    Number.isInteger(size) &&
    offset >= 0 &&
    size > 0 &&
    offset + size <= variable.dataLength
  );
}

/** Reads a little-endian unsigned value as bigint. */
export function readValue(
  bytes: Uint8Array,
  variable: NvramVariable,
  offset: number,
  size: number,
): bigint | null {
  if (!fitsInVariable(variable, offset, size)) {
    return null;
  }

  let value = 0n;
  for (let i = size - 1; i >= 0; i--) {
    value = (value << 8n) | BigInt(bytes[variable.dataOffset + offset + i]);
  }

  return value;
}

/**
 * Writes a little-endian value and fixes the checksums of the enclosing
 * entries. Returns the list of changed bytes (including checksum bytes).
 *
 * Only the innermost entry that carries a checksum needs a correction: the
 * corrected checksum byte lies within all outer entries, so their byte sums
 * stay unchanged.
 */
export function writeValue(
  bytes: Uint8Array,
  variable: NvramVariable,
  offset: number,
  size: number,
  value: bigint,
): NvramChange[] {
  if (!fitsInVariable(variable, offset, size)) {
    return [];
  }

  const changes: NvramChange[] = [];
  let delta = 0;
  let remaining = value;

  for (let i = 0; i < size; i++) {
    const position = variable.dataOffset + offset + i;
    const newByte = Number(remaining & 0xffn);
    remaining >>= 8n;
    const oldByte = bytes[position];

    if (oldByte !== newByte) {
      bytes[position] = newByte;
      delta += newByte - oldByte;
      changes.push({ offset: position, oldValue: oldByte, newValue: newByte });
    }
  }

  for (const checksumOffset of variable.checksumOffsets) {
    if (((delta % 256) + 256) % 256 === 0) {
      break;
    }

    const oldByte = bytes[checksumOffset];
    const newByte = (((oldByte - delta) % 256) + 256) % 256;
    bytes[checksumOffset] = newByte;
    changes.push({
      offset: checksumOffset,
      oldValue: oldByte,
      newValue: newByte,
    });
    // the correction itself lies within all outer entries
    delta = 0;
  }

  return changes;
}

/** Formats a value as big-endian hex string padded to size * 2 digits. */
export function formatValue(value: bigint, size: number) {
  return value.toString(16).toUpperCase().padStart(size * 2, "0");
}
