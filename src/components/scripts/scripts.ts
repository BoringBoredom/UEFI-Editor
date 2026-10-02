import { saveAs } from "file-saver";
import type { PopulatedFiles } from "../FileUploads/FileUploads";
import type {
  CheckBoxPrompt,
  Data,
  Form,
  FormChildren,
  Forms,
  Menu,
  NumericPrompt,
  Offsets,
  OneOfPrompt,
  RefPrompt,
  Scopes,
  StringPrompt,
  Suppression,
  VarStores,
} from "./types";
import {
  findVariables,
  fitsInVariable,
  formatValue,
  parseNvramDefaults,
  readValue,
  writeValue,
  type NvramDefaultsStore,
} from "./nvram";

export const version = "0.2.0";
const wantedIFRExtractorVersions = ["1.6.1"];

async function sha256Hex(data: BufferSource) {
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hashFile(file: File) {
  return sha256Hex(await file.arrayBuffer());
}

export function validateByteInput(value: string, maxLength = 2) {
  return (
    value.length <= maxLength &&
    (value.length === 0 ||
      value.split("").every((char) => /[a-fA-F0-9]/.test(char)))
  );
}

function hasScope(hexString: string) {
  const header = hexString.split(" ")[1];

  return parseInt(header, 16).toString(2).padStart(8, "0").startsWith("1");
}

export async function calculateJsonChecksum(
  menu: Menu,
  forms: Forms,
  suppressions: Suppression[],
) {
  let offsetChecksum = "";

  for (const menuItem of menu) {
    offsetChecksum += menuItem.offset;
  }

  for (const form of forms) {
    for (const child of form.children) {
      offsetChecksum += JSON.stringify(child.offsets);

      if (child.stdDefault !== null) {
        offsetChecksum += "S";
      }

      if (child.mfgDefault !== null) {
        offsetChecksum += "M";
      }
    }
  }

  for (const suppression of suppressions) {
    offsetChecksum += suppression.offset + suppression.start + suppression.end;
  }

  return sha256Hex(new TextEncoder().encode(offsetChecksum));
}

function replaceAt(
  string: string,
  index: number,
  length: number,
  replacement: string,
) {
  return string.slice(0, index) + replacement + string.slice(index + length);
}

function offsetToIndex(offset: string) {
  return parseInt(offset, 16) * 2;
}

function decToHexString(decimal: number) {
  return `0x${decimal.toString(16).toUpperCase()}`;
}

function checkSuppressions(scopes: Scopes, formChild: FormChildren) {
  const suppressions = scopes
    .filter((scope) => scope.type === "SuppressIf")
    .map((scope) => scope.offset) as string[];

  if (suppressions.length !== 0) {
    formChild.suppressIf = [...suppressions];
  }
}

function getAdditionalData(
  bytes: string,
  hexSetupdataBin: string,
  isRef: boolean,
): {
  pageId: string | null;
  accessLevel: string | null;
  failsafe: string | null;
  optimal: string | null;
  offsets: Offsets | null;
} {
  const byteArray = bytes.split(" ");
  const regex = new RegExp(
    byteArray[6] +
      byteArray[7] +
      ".{20}(....).{4}(..).{6}" +
      byteArray[4] +
      byteArray[5] +
      ".{52}" +
      byteArray[2] +
      byteArray[3] +
      ".{4}(..)(..)",
    "g",
  );

  const matches = [...hexSetupdataBin.matchAll(regex)].filter(
    (element) => element.index % 2 === 0,
  );

  if (matches.length === 1) {
    const match = matches[0];
    const index = match.index;

    const offsets: Offsets = {
      accessLevel: decToHexString((index + 32) / 2),
      failsafe: decToHexString((index + 104) / 2),
      optimal: decToHexString((index + 106) / 2),
    };

    if (isRef) {
      offsets.pageId = decToHexString((index + 24) / 2);
    }

    return {
      pageId: match[1],
      accessLevel: match[2],
      failsafe: match[3],
      optimal: match[4],
      offsets,
    };
  }

  return {
    pageId: null,
    accessLevel: null,
    failsafe: null,
    optimal: null,
    offsets: null,
  };
}

export interface NvramTarget {
  varStoreName: string;
  varStoreGuid: string;
  /** Offset inside the variable in bytes */
  offset: number;
  /** Size in bytes */
  size: number;
}

export function getNvramTarget(
  child: FormChildren,
  varStores: VarStores,
): NvramTarget | null {
  if (
    child.type !== "CheckBox" &&
    child.type !== "OneOf" &&
    child.type !== "Numeric"
  ) {
    return null;
  }

  const varStore = varStores.find(
    (varStore) => varStore.varStoreId === child.varStoreId,
  );

  if (!varStore?.name) {
    return null;
  }

  const offset = parseInt(child.varOffset, 16);
  const size = child.type === "CheckBox" ? 1 : parseInt(child.size, 10) / 8;

  if (
    !Number.isInteger(offset) ||
    !Number.isInteger(size) ||
    offset < 0 ||
    size <= 0
  ) {
    return null;
  }

  return {
    varStoreName: varStore.name,
    varStoreGuid: varStore.guid,
    offset,
    size,
  };
}

function getNvramVariables(stores: NvramDefaultsStore[], target: NvramTarget) {
  return findVariables(stores, target.varStoreName, target.varStoreGuid).filter(
    (variable) => fitsInVariable(variable, target.offset, target.size),
  );
}

function readNvramDefault(
  bytes: Uint8Array,
  stores: NvramDefaultsStore[],
  target: NvramTarget | null,
) {
  if (!target) {
    return null;
  }

  const variables = getNvramVariables(stores, target);

  if (variables.length === 0) {
    return null;
  }

  const value = readValue(bytes, variables[0], target.offset, target.size);

  return value === null ? null : formatValue(value, target.size);
}

function getUint8Array(string: string) {
  const array = [];
  for (let i = 0, len = string.length; i < len; i += 2) {
    array[i / 2] = parseInt(string.slice(i, i + 2), 16);
  }

  return array;
}

export async function downloadModifiedFiles(data: Data, files: PopulatedFiles) {
  let wasSetupSctModified = false;
  let wasAmitseSctModified = false;
  let wasSetupdataBinModified = false;
  let wasNvramModified = false;

  let changeLog = "";

  let modifiedSetupSct = files.setupSctContainer.textContent;
  let setupSctChangeLog = "";

  const suppressions = JSON.parse(
    JSON.stringify(data.suppressions),
  ) as Suppression[];

  for (const suppression of suppressions) {
    if (!suppression.active) {
      if (
        modifiedSetupSct.slice(
          offsetToIndex(suppression.end),
          offsetToIndex(suppression.end) + 4,
        ) !== "2902"
      ) {
        alert("Something went wrong. Please file a bug report on Github.");
        return;
      }

      modifiedSetupSct = replaceAt(
        modifiedSetupSct,
        offsetToIndex(suppression.end),
        4,
        "",
      );

      modifiedSetupSct = replaceAt(
        modifiedSetupSct,
        offsetToIndex(suppression.start),
        0,
        "2902",
      );

      for (const suppressionToUpdate of suppressions) {
        if (suppressionToUpdate.offset !== suppression.offset) {
          if (
            parseInt(suppression.start, 16) <
              parseInt(suppressionToUpdate.start, 16) &&
            parseInt(suppressionToUpdate.start, 16) <
              parseInt(suppression.end, 16)
          ) {
            suppressionToUpdate.start = decToHexString(
              (offsetToIndex(suppressionToUpdate.start) + 4) / 2,
            );
          }

          if (
            parseInt(suppression.start, 16) <
              parseInt(suppressionToUpdate.end, 16) &&
            parseInt(suppressionToUpdate.end, 16) <
              parseInt(suppression.end, 16)
          ) {
            suppressionToUpdate.end = decToHexString(
              (offsetToIndex(suppressionToUpdate.end) + 4) / 2,
            );
          }
        }
      }

      setupSctChangeLog += `Unsuppressed ${suppression.offset}\n`;

      wasSetupSctModified = true;
    }
  }

  let modifiedAmitseSct = files.amitseSctContainer.textContent;
  let amitseSctChangeLog = "";

  for (const entry of data.menu) {
    const padded = entry.formId.split("x")[1].padStart(4, "0");
    const newValue = padded.slice(2) + padded.slice(0, 2);
    const index = offsetToIndex(entry.offset);
    const oldValue = modifiedAmitseSct.slice(index, index + 4);

    if (newValue !== oldValue) {
      modifiedAmitseSct = replaceAt(modifiedAmitseSct, index, 4, newValue);

      const oldFormId = decToHexString(
        parseInt(oldValue.slice(-2) + oldValue.slice(-4, -2), 16),
      );

      amitseSctChangeLog += `${
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data.forms.find(
          (form) => parseInt(form.formId) === parseInt(oldFormId),
        )!.name
      } | FormId ${oldFormId} -> ${
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data.forms.find(
          (form) => parseInt(form.formId) === parseInt(entry.formId),
        )!.name
      } | FormId ${entry.formId}\n`;

      wasAmitseSctModified = true;
    }
  }

  let modifiedSetupdataBin = files.setupdataBinContainer.textContent;
  let setupdataBinChangeLog = "";

  // Decide per location against the ORIGINAL content, so that unedited
  // duplicates (same question in several forms) cannot revert an edit.
  const originalSetupdataBin = files.setupdataBinContainer.textContent;
  const setupdataPatches = new Map<
    number,
    { oldValue: string; newValue: string; text: string }
  >();

  for (const form of data.forms) {
    for (const child of form.children) {
      if (
        child.offsets &&
        child.accessLevel &&
        child.failsafe &&
        child.optimal
      ) {
        const fields: [string, string, string][] = [
          ["Access Level", child.offsets.accessLevel, child.accessLevel],
          ["Failsafe", child.offsets.failsafe, child.failsafe],
          ["Optimal", child.offsets.optimal, child.optimal],
        ];

        for (const [label, offset, value] of fields) {
          const index = offsetToIndex(offset);
          const oldValue = originalSetupdataBin.slice(index, index + 2);
          const newValue = value.padStart(2, "0");

          if (oldValue === newValue) {
            continue;
          }

          const text = `${child.name} | QuestionId ${child.questionId}: ${label} ${oldValue} -> ${newValue}`;
          const existing = setupdataPatches.get(index);

          if (existing && existing.newValue !== newValue) {
            setupdataBinChangeLog += `CONFLICT at Setupdata ${offset}: ${existing.oldValue} -> ${existing.newValue} and ${newValue} requested by different entries; applying the last one (${child.name} | QuestionId ${child.questionId}: ${label})\n`;
            setupdataPatches.set(index, { oldValue, newValue, text });
          } else if (!existing) {
            setupdataPatches.set(index, { oldValue, newValue, text });
          }
        }
      }
    }
  }

  for (const [index, patch] of setupdataPatches) {
    modifiedSetupdataBin = replaceAt(
      modifiedSetupdataBin,
      index,
      2,
      patch.newValue,
    );
    setupdataBinChangeLog += `${patch.text}\n`;
    wasSetupdataBinModified = true;
  }

  let modifiedNvram: Uint8Array | null = null;
  let nvramChangeLog = "";

  if (files.nvramContainer.file && files.nvramContainer.bytes) {
    const original = files.nvramContainer.bytes;
    const nvram = original.slice();
    const defaults = parseNvramDefaults(nvram);
    modifiedNvram = nvram;

    // Decide per location against the ORIGINAL bytes (see setupdata above).
    const nvramPatches = new Map<
      string,
      {
        variables: ReturnType<typeof getNvramVariables>;
        target: NvramTarget;
        newValue: bigint;
        oldValue: bigint | null;
        patchedCopies: number;
        label: string;
        child: Data["forms"][number]["children"][number];
      }
    >();

    for (const form of data.forms) {
      for (const child of form.children) {
        const target = getNvramTarget(child, data.varStores);

        if (!target) {
          continue;
        }

        const entries: [string, NvramDefaultsStore[], string | null][] = [
          ["Failsafe (MfgDefaults)", defaults.mfg, child.mfgDefault],
          ["Optimal (StdDefaults)", defaults.std, child.stdDefault],
        ];

        for (const [label, stores, value] of entries) {
          if (!value) {
            continue;
          }

          const variables = getNvramVariables(stores, target);

          if (variables.length === 0) {
            continue;
          }

          const newValue = BigInt(`0x${value}`);
          const oldValue = readValue(
            original,
            variables[0],
            target.offset,
            target.size,
          );
          let patchedCopies = 0;

          for (const variable of variables) {
            if (
              readValue(original, variable, target.offset, target.size) !==
              newValue
            ) {
              patchedCopies++;
            }
          }

          if (patchedCopies === 0) {
            continue;
          }

          const key = `${label}|${target.varStoreName}|${String(target.offset)}|${String(target.size)}`;
          const existing = nvramPatches.get(key);

          if (existing && existing.newValue !== newValue) {
            nvramChangeLog += `CONFLICT at ${target.varStoreName} ${decToHexString(
              target.offset,
            )} (${label}): ${formatValue(existing.newValue, target.size)} and ${formatValue(
              newValue,
              target.size,
            )} requested by different entries; applying the last one (${child.name} | QuestionId ${child.questionId})\n`;
          }

          if (existing?.newValue !== newValue) {
            nvramPatches.set(key, {
              variables,
              target,
              newValue,
              oldValue,
              patchedCopies,
              label,
              child,
            });
          }
        }
      }
    }

    for (const patch of nvramPatches.values()) {
      const { target, child, label, newValue, oldValue } = patch;

      for (const variable of patch.variables) {
        writeValue(nvram, variable, target.offset, target.size, newValue);
      }

      nvramChangeLog += `${child.name} | QuestionId ${
        child.questionId
      } | ${target.varStoreName} ${decToHexString(target.offset)}: ${label} ${
        oldValue === null ? "?" : formatValue(oldValue, target.size)
      } -> ${formatValue(newValue, target.size)} (${String(
        patch.patchedCopies,
      )} of ${String(patch.variables.length)} copies patched)\n`;

      wasNvramModified = true;
    }
  }

  if (wasSetupSctModified) {
    changeLog += `========== ${files.setupSctContainer.file.name} ==========\n\n${setupSctChangeLog}\n\n\n`;

    saveAs(
      new Blob([new Uint8Array(getUint8Array(modifiedSetupSct))], {
        type: "application/octet-stream",
      }),
      files.setupSctContainer.file.name,
    );
  }

  if (wasAmitseSctModified) {
    changeLog += `========== ${files.amitseSctContainer.file.name} ==========\n\n${amitseSctChangeLog}\n\n\n`;

    saveAs(
      new Blob([new Uint8Array(getUint8Array(modifiedAmitseSct))], {
        type: "application/octet-stream",
      }),
      files.amitseSctContainer.file.name,
    );
  }

  if (wasSetupdataBinModified) {
    changeLog += `========== ${files.setupdataBinContainer.file.name} ==========\n\n${setupdataBinChangeLog}\n\n\n`;

    saveAs(
      new Blob([new Uint8Array(getUint8Array(modifiedSetupdataBin))], {
        type: "application/octet-stream",
      }),
      files.setupdataBinContainer.file.name,
    );
  }

  if (wasNvramModified && modifiedNvram && files.nvramContainer.file) {
    changeLog += `========== ${files.nvramContainer.file.name} ==========\n\n${nvramChangeLog}\n\n\n`;

    saveAs(
      new Blob([modifiedNvram], {
        type: "application/octet-stream",
      }),
      files.nvramContainer.file.name,
    );
  }

  if (
    wasSetupSctModified ||
    wasAmitseSctModified ||
    wasSetupdataBinModified ||
    wasNvramModified
  ) {
    saveAs(
      new Blob([changeLog], {
        type: "text/plain",
      }),
      "changelog.txt",
    );
  } else {
    alert("No modifications have been done.");
  }

  return Promise.resolve();
}

// Opcodes (as printed by IFRExtractor-RS) that can be part of a SuppressIf condition expression.
const expressionOpcodes = new Set([
  "EqIdVal",
  "EqIdValList",
  "EqIdId",
  "Not",
  "And",
  "Or",
  "QuestionRef1",
  "QuestionRef2",
  "QuestionRef3",
  "StringRef1",
  "StringRef2",
  "Uint8",
  "Uint16",
  "Uint32",
  "Uint64",
  "Equal",
  "NotEqual",
  "True",
  "False",
  "Ones",
  "Zero",
  "One",
  "Undefined",
  "Version",
  "BitwiseAnd",
  "BitwiseOr",
  "BitwiseNot",
  "GreaterThan",
  "GreaterEqual",
  "LessThan",
  "LessEqual",
  "Dup",
  "Length",
  "Add",
  "Subtract",
  "Multiply",
  "Divide",
  "Modulo",
  "ShiftLeft",
  "ShiftRight",
  "ToBoolean",
  "ToUint",
  "ToString",
  "ToLower",
  "ToUpper",
  "Catenate",
  "Match",
  "Match2",
  "Mid",
  "Find",
  "Token",
  "Span",
  "Conditional",
  "Get",
  "Set",
  "Map",
  "RuleRef",
  "Security",
  "This",
  "ThisVariableName",
  "DupName",
]);

function determineSuppressionStart(setupTxtArray: string[], index: number) {
  const opcodeName = (line: string) => /^0x\w+:\s*(\w+)/.exec(line)?.[1];

  // The condition is a sequence of expression opcodes, each possibly scoped
  // (terminated by a matching End). The body starts at the first line after it.
  let currentIndex = index + 1;
  while (
    currentIndex < setupTxtArray.length &&
    expressionOpcodes.has(opcodeName(setupTxtArray[currentIndex]) ?? "")
  ) {
    const bytes = /\{ (.*) \}/.exec(setupTxtArray[currentIndex]);

    if (bytes && hasScope(bytes[1])) {
      let openScopes = 1;
      currentIndex++;

      while (openScopes !== 0 && currentIndex < setupTxtArray.length) {
        const line = setupTxtArray[currentIndex];

        if (line.includes("{ 29 02 }")) {
          openScopes--;
        } else {
          const anyOpcode = /\{ (.*) \}/.exec(line);

          if (anyOpcode && hasScope(anyOpcode[1])) {
            openScopes++;
          }
        }

        currentIndex++;
      }
    } else {
      currentIndex++;
    }
  }

  return setupTxtArray[currentIndex].split(" ")[0].slice(0, -1);
}

export async function parseData(files: PopulatedFiles) {
  const [
    setupTxtHash,
    setupSctHash,
    amitseSctHash,
    setupdataBinHash,
    nvramBinHash,
  ] = await Promise.all([
    hashFile(files.setupTxtContainer.file),
    hashFile(files.setupSctContainer.file),
    hashFile(files.amitseSctContainer.file),
    hashFile(files.setupdataBinContainer.file),
    files.nvramContainer.bytes
      ? sha256Hex(files.nvramContainer.bytes)
      : Promise.resolve(""),
  ]);

  let setupTxt = files.setupTxtContainer.textContent;
  const amitseSct = files.amitseSctContainer.textContent;
  const setupdataBin = files.setupdataBinContainer.textContent;

  if (
    !wantedIFRExtractorVersions.some((version) =>
      setupTxt.includes(`Program version: ${version}`),
    )
  ) {
    alert(
      `Wrong IFRExtractor-RS version. Compatible versions: ${wantedIFRExtractorVersions.join(
        ", ",
      )}.`,
    );
    window.location.reload();
    return {} as Data;
  }

  if (!setupTxt.includes("Extraction mode: UEFI")) {
    alert("Only UEFI is supported.");
    window.location.reload();
    return {} as Data;
  }

  if (!/\{ .* \}/.test(setupTxt)) {
    alert(`Use the "verbose" option of IFRExtractor.`);
    window.location.reload();
    return {} as Data;
  }

  if (!setupTxt.includes(`SHA256: ${setupSctHash}`)) {
    alert("Setup SCT and IFR Extractor output TXT SHA256 mismatch");
    window.location.reload();
    return {} as Data;
  }

  setupTxt = setupTxt.replace(/[\r\n|\n|\r](?!0x[0-9A-F]{3})/g, "<br>");

  let formSetId = "";
  const varStores: VarStores = [];
  const forms: Forms = [];
  const suppressions: Suppression[] = [];
  const scopes: Scopes = [];
  let currentForm: Form = {} as Form;
  let currentString: StringPrompt = {} as StringPrompt;
  let currentOneOf: OneOfPrompt = {} as OneOfPrompt;
  let currentNumeric: NumericPrompt = {} as NumericPrompt;
  let currentCheckBox: CheckBoxPrompt = {} as CheckBoxPrompt;

  const currentSuppressions: Suppression[] = [];

  const references: Record<string, Set<string>> = {};

  const setupTxtArray = setupTxt.split("\n");

  for (const [index, line] of setupTxtArray.entries()) {
    const formSet = /FormSet Guid: (.*)-(.*)-(.*)-(.*)-(.*), Title:/.exec(line);
    const varStore =
      /VarStore Guid: (.*), VarStoreId: (.*), Size: (.*), Name: "(.*)" \{/.exec(
        line,
      );
    const varStoreEfi =
      /VarStoreEfi Guid: ([^,]*), VarStoreId: ([^,]*), Attributes: ([^,{]*?)(?:, Size: ([^,{]*?))?(?:, Name: "(.*)")? \{/.exec(
        line,
      );
    const form = /Form FormId: (.*), Title: "(.*)" \{ (.*) \}/.exec(line);
    const suppressIf = /\{ 0A 82 \}/.exec(line);
    const ref =
      /Ref Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreInfo: (.*), FormId: (.*) \{ (.*) \}/.exec(
        line,
      );
    const string =
      /String Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreInfo: (.*), MinSize: (.*), MaxSize: (.*), Flags: (.*) \{ (.*) \}/.exec(
        line,
      );
    const numeric =
      /Numeric Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarOffset: (.*), Flags: (.*), Size: (.*), Min: (.*), Max: (.*), Step: (.*) \{ (.*) \}/.exec(
        line,
      );
    const checkBox =
      /CheckBox Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarOffset: (.*), Flags: (.*) \{ (.*) \}/.exec(
        line,
      );
    const oneOf =
      /OneOf Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarOffset: (.*), Flags: (.*), Size: (.*), Min: (.*), Max: (.*), Step: (.*) \{ (.*) \}/.exec(
        line,
      );
    const oneOfOption = /OneOfOption Option: "(.*)" Value: (.*) \{/.exec(line);
    const defaultId = /Default DefaultId: (.*) Value: (.*) \{/.exec(line);
    const end = /\{ 29 02 \}/.exec(line);
    const indentations = (line.match(/\t/g) ?? []).length;
    const offset = line.split(" ")[0].slice(0, -1);
    const currentScope = scopes[scopes.length - 1];

    if (formSet) {
      formSetId = formSet[4] + formSet[5];
    }

    if (varStore) {
      varStores.push({
        varStoreId: varStore[2],
        guid: varStore[1],
        size: varStore[3],
        name: varStore[4],
      });
    }

    if (varStoreEfi?.[5]) {
      varStores.push({
        varStoreId: varStoreEfi[2],
        guid: varStoreEfi[1],
        size: (varStoreEfi[4] as string | undefined) ?? "",
        name: varStoreEfi[5],
      });
    }

    if (form) {
      currentForm = {
        name: form[2],
        type: "Form",
        formId: form[1],
        referencedIn: [],
        children: [],
      };

      if (hasScope(form[3])) {
        scopes.push({ type: "Form", indentations });
      }
    }

    if (suppressIf) {
      scopes.push({
        type: "SuppressIf",
        indentations,
        offset,
      });

      currentSuppressions.push({
        offset,
        active: true,
        start: determineSuppressionStart(setupTxtArray, index),
      } as Suppression);
    }

    if (ref) {
      const formId = ref[7];

      const currentRef: RefPrompt = {
        name: ref[1],
        description: ref[2],
        type: "Ref",
        questionId: ref[4],
        varStoreId: ref[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === ref[5],
        )?.name,
        formId,
        ...getAdditionalData(ref[8], setupdataBin, true),
        stdDefault: null,
        mfgDefault: null,
      };

      checkSuppressions(scopes, currentRef);

      currentForm.children.push(currentRef);

      if (formId in references) {
        references[formId].add(currentForm.formId);
      } else {
        references[formId] = new Set([currentForm.formId]);
      }
    }

    if (string) {
      const { accessLevel, failsafe, optimal, offsets } = getAdditionalData(
        string[10],
        setupdataBin,
        false,
      );

      currentString = {
        name: string[1],
        description: string[2],
        type: "String",
        questionId: string[4],
        varStoreId: string[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === string[5],
        )?.name,
        accessLevel,
        failsafe,
        optimal,
        offsets,
        stdDefault: null,
        mfgDefault: null,
      };

      checkSuppressions(scopes, currentString);

      if (hasScope(string[10])) {
        scopes.push({ type: "String", indentations });
      }
    }

    if (numeric) {
      const { accessLevel, failsafe, optimal, offsets } = getAdditionalData(
        numeric[12],
        setupdataBin,
        false,
      );

      currentNumeric = {
        name: numeric[1],
        description: numeric[2],
        type: "Numeric",
        questionId: numeric[4],
        varStoreId: numeric[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === numeric[5],
        )?.name,
        varOffset: numeric[6],
        size: numeric[8],
        min: numeric[9],
        max: numeric[10],
        step: numeric[11],
        accessLevel,
        failsafe,
        optimal,
        offsets,
        stdDefault: null,
        mfgDefault: null,
      };

      checkSuppressions(scopes, currentNumeric);

      if (hasScope(numeric[12])) {
        scopes.push({ type: "Numeric", indentations });
      }
    }

    if (checkBox) {
      const { accessLevel, failsafe, optimal, offsets } = getAdditionalData(
        checkBox[8],
        setupdataBin,
        false,
      );

      currentCheckBox = {
        name: checkBox[1],
        description: checkBox[2],
        type: "CheckBox",
        questionId: checkBox[4],
        varStoreId: checkBox[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === checkBox[5],
        )?.name,
        varOffset: checkBox[6],
        flags: checkBox[7],
        accessLevel,
        failsafe,
        optimal,
        offsets,
        stdDefault: null,
        mfgDefault: null,
      };

      checkSuppressions(scopes, currentCheckBox);

      if (hasScope(checkBox[8])) {
        scopes.push({ type: "CheckBox", indentations });
      }
    }

    if (oneOf) {
      const { accessLevel, failsafe, optimal, offsets } = getAdditionalData(
        oneOf[12],
        setupdataBin,
        false,
      );

      currentOneOf = {
        name: oneOf[1],
        description: oneOf[2],
        type: "OneOf",
        questionId: oneOf[4],
        varStoreId: oneOf[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === oneOf[5],
        )?.name,
        varOffset: oneOf[6],
        size: oneOf[8],
        options: [],
        accessLevel,
        failsafe,
        optimal,
        offsets,
        stdDefault: null,
        mfgDefault: null,
      };

      checkSuppressions(scopes, currentOneOf);

      if (hasScope(oneOf[12])) {
        scopes.push({ type: "OneOf", indentations });
      }
    }

    if (
      oneOfOption &&
      (currentScope.type === "OneOf" || currentScope.type === "SuppressIf")
    ) {
      currentOneOf.options.push({
        option: oneOfOption[1],
        value: oneOfOption[2],
      });
    }

    if (scopes.length !== 0) {
      if (defaultId) {
        const oneDefault = {
          defaultId: defaultId[1],
          value: defaultId[2],
        };

        if (currentScope.type === "Numeric") {
          currentNumeric.defaults ??= [];
          currentNumeric.defaults.push(oneDefault);
        } else if (currentScope.type === "CheckBox") {
          currentCheckBox.defaults ??= [];
          currentCheckBox.defaults.push(oneDefault);
        } else if (currentScope.type === "OneOf") {
          currentOneOf.defaults ??= [];
          currentOneOf.defaults.push(oneDefault);
        }
      }

      if (end && currentScope.indentations === indentations) {
        const scopeType = currentScope.type;

        if (scopeType === "Form") {
          forms.push(currentForm);
        } else if (scopeType === "Numeric") {
          currentForm.children.push(currentNumeric);
        } else if (scopeType === "CheckBox") {
          currentForm.children.push(currentCheckBox);
        } else if (scopeType === "OneOf") {
          currentForm.children.push(currentOneOf);
        } else if (scopeType === "String") {
          currentForm.children.push(currentString);
        } else {
          const latestSuppression = currentSuppressions.pop();

          if (!latestSuppression) {
            alert(
              `Something went wrong (suppression ${offset}). Please file a bug report on Github.`,
            );
            window.location.reload();
            return {} as Data;
          }

          suppressions.push({ ...latestSuppression, end: offset });
        }

        scopes.pop();
      }
    }
  }

  if (scopes.length !== 0 || currentSuppressions.length !== 0) {
    alert("Something went wrong. Please file a bug report on Github.");
    window.location.reload();
    return {} as Data;
  }

  const matches = [
    ...amitseSct.matchAll(new RegExp(formSetId + "(.{4})", "g")),
  ];
  const menu: Menu = matches
    .map((match) => {
      const hexEntry = decToHexString(
        parseInt(match[1].slice(2) + match[1].slice(0, 2), 16),
      );
      return {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
        name: forms.find((form) => parseInt(form.formId) === parseInt(hexEntry))
          ?.name!,
        formId: hexEntry,
        offset: decToHexString((match.index + formSetId.length) / 2),
      };
    })
    .filter((x) => x.name);

  for (const form of forms) {
    if (form.formId in references) {
      form.referencedIn = [...references[form.formId]];
    }
  }

  const nvramBytes = files.nvramContainer.bytes;

  if (nvramBytes) {
    const defaults = parseNvramDefaults(nvramBytes);

    for (const form of forms) {
      for (const child of form.children) {
        const target = getNvramTarget(child, varStores);

        child.stdDefault = readNvramDefault(nvramBytes, defaults.std, target);
        child.mfgDefault = readNvramDefault(nvramBytes, defaults.mfg, target);
      }
    }
  }

  const dataJson: Data = {
    menu,
    forms,
    varStores,
    suppressions,
    version,
    hashes: {
      setupTxt: setupTxtHash,
      setupSct: setupSctHash,
      amitseSct: amitseSctHash,
      setupdataBin: setupdataBinHash,
      nvramBin: nvramBinHash,
      offsetChecksum: await calculateJsonChecksum(menu, forms, suppressions),
    },
  };

  return Promise.resolve(dataJson);
}
