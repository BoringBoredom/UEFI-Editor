/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { saveAs } from "file-saver";
import { Files } from "../FileUploads";
import sha256 from "crypto-js/sha256";
import {
  Data,
  Forms,
  Form,
  RefPrompt,
  NumericPrompt,
  CheckBoxPrompt,
  OneOfPrompt,
  VarStores,
  Scopes,
  Menu,
  Offsets,
  FormChildren,
  StringPrompt,
  Suppression,
} from "./types";

export const version = "0.0.8";
const wantedIFRExtractorVersion = "1.5.1";

export async function binToHexString(file: File) {
  return [...new Uint8Array(await file.arrayBuffer())]
    .map((x) => x.toString(16).toUpperCase().padStart(2, "0"))
    .join("");
}

export function validateByteInput(value: string) {
  return (
    value.length <= 2 &&
    (value.length === 0 ||
      value.split("").every((char) => /[a-fA-F0-9]/.test(char)))
  );
}

function hasScope(hexString: string) {
  const header = hexString.split(" ")[1];

  return parseInt(header, 16).toString(2).padStart(8, "0").startsWith("1");
}

export function calculateJsonChecksum(
  menu: Menu,
  forms: Forms,
  suppressions: Suppression[]
) {
  let offsetChecksum = "";

  for (const menuItem of menu) {
    offsetChecksum += menuItem.offset;
  }

  for (const form of forms) {
    for (const child of form.children) {
      offsetChecksum += JSON.stringify(child.offsets);
    }
  }

  for (const suppression of suppressions) {
    offsetChecksum += suppression.offset + suppression.start + suppression.end;
  }

  return sha256(offsetChecksum).toString();
}

function replaceAt(
  string: string,
  index: number,
  length: number,
  replacement: string
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
  isRef: boolean
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
    "g"
  );

  const matches = [...hexSetupdataBin.matchAll(regex)].filter(
    (element) => element.index! % 2 === 0
  );

  if (matches.length === 1) {
    const match = matches[0];
    const index = match.index!;

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

function getUint8Array(string: string) {
  const array = [];
  for (let i = 0, len = string.length; i < len; i += 2) {
    array[i / 2] = parseInt(string.slice(i, i + 2), 16);
  }

  return array;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function downloadModifiedFiles(data: Data, files: Files) {
  let wasSetupSctModified = false;
  let wasAmitseSctModified = false;
  let wasSetupdataBinModified = false;

  let changeLog = "";

  let modifiedSetupSct = files.setupSctContainer.textContent!;
  let setupSctChangeLog = "";

  const suppressions = JSON.parse(
    JSON.stringify(data.suppressions)
  ) as Suppression[];

  for (const suppression of suppressions) {
    if (!suppression.active) {
      if (
        modifiedSetupSct.slice(
          offsetToIndex(suppression.end),
          offsetToIndex(suppression.end) + 4
        ) !== "2902"
      ) {
        alert("Something went wrong. Please file a bug report on Github.");
        return;
      }

      modifiedSetupSct = replaceAt(
        modifiedSetupSct,
        offsetToIndex(suppression.end),
        4,
        ""
      );

      modifiedSetupSct = replaceAt(
        modifiedSetupSct,
        offsetToIndex(suppression.start),
        0,
        "2902"
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
              (offsetToIndex(suppressionToUpdate.start) + 8) / 2
            );
          }

          if (
            parseInt(suppression.start, 16) <
              parseInt(suppressionToUpdate.end, 16) &&
            parseInt(suppressionToUpdate.end, 16) <
              parseInt(suppression.end, 16)
          ) {
            suppressionToUpdate.end = decToHexString(
              (offsetToIndex(suppressionToUpdate.end) + 8) / 2
            );
          }
        }
      }

      setupSctChangeLog += `Unsuppressed ${suppression.offset}\n`;

      wasSetupSctModified = true;
    }
  }

  let modifiedAmitseSct = files.amitseSctContainer.textContent!;
  let amitseSctChangeLog = "";

  for (const entry of data.menu) {
    const padded = entry.formId.split("x")[1].padStart(4, "0");
    const newValue = padded.slice(2) + padded.slice(0, 2);
    const index = offsetToIndex(entry.offset);
    const oldValue = modifiedAmitseSct.slice(index, index + 4);

    if (newValue !== oldValue) {
      modifiedAmitseSct = replaceAt(modifiedAmitseSct, index, 4, newValue);

      const oldFormId = decToHexString(
        parseInt(oldValue.slice(-2) + oldValue.slice(-4, -2), 16)
      );

      amitseSctChangeLog += `${
        data.forms.find((form) => parseInt(form.formId) === parseInt(oldFormId))
          ?.name
      } | FormId ${oldFormId} -> ${
        data.forms.find(
          (form) => parseInt(form.formId) === parseInt(entry.formId)
        )?.name
      } | FormId ${entry.formId}\n`;

      wasAmitseSctModified = true;
    }
  }

  let modifiedSetupdataBin = files.setupdataBinContainer.textContent!;
  let setupdataBinChangeLog = "";

  for (const form of data.forms) {
    for (const child of form.children) {
      if (
        child.offsets &&
        child.accessLevel &&
        child.failsafe &&
        child.optimal
      ) {
        const accessLevelIndex = offsetToIndex(child.offsets.accessLevel);
        const oldAccessLevel = modifiedSetupdataBin.slice(
          accessLevelIndex,
          accessLevelIndex + 2
        );
        const newAccessLevel = child.accessLevel.padStart(2, "0");
        if (oldAccessLevel !== newAccessLevel) {
          modifiedSetupdataBin = replaceAt(
            modifiedSetupdataBin,
            accessLevelIndex,
            2,
            newAccessLevel
          );
          setupdataBinChangeLog += `${child.name} | QuestionId ${child.questionId}: Access Level ${oldAccessLevel} -> ${newAccessLevel}\n`;

          wasSetupdataBinModified = true;
        }

        const failsafeIndex = offsetToIndex(child.offsets.failsafe);
        const oldFailsafe = modifiedSetupdataBin.slice(
          failsafeIndex,
          failsafeIndex + 2
        );
        const newFailsafe = child.failsafe.padStart(2, "0");
        if (oldFailsafe !== newFailsafe) {
          modifiedSetupdataBin = replaceAt(
            modifiedSetupdataBin,
            failsafeIndex,
            2,
            newFailsafe
          );
          setupdataBinChangeLog += `${child.name} | QuestionId ${child.questionId}: Failsafe ${oldFailsafe} -> ${newFailsafe}\n`;

          wasSetupdataBinModified = true;
        }

        const optimalIndex = offsetToIndex(child.offsets.optimal);
        const oldOptimal = modifiedSetupdataBin.slice(
          optimalIndex,
          optimalIndex + 2
        );
        const newOptimal = child.optimal.padStart(2, "0");
        if (oldOptimal !== newOptimal) {
          modifiedSetupdataBin = replaceAt(
            modifiedSetupdataBin,
            optimalIndex,
            2,
            newOptimal
          );
          setupdataBinChangeLog += `${child.name} | QuestionId ${child.questionId}: Optimal ${oldOptimal} -> ${newOptimal}\n`;

          wasSetupdataBinModified = true;
        }
      }
    }
  }

  if (wasSetupSctModified) {
    changeLog += `========== ${files.setupSctContainer.file?.name} ==========\n\n${setupSctChangeLog}\n\n\n`;

    saveAs(
      new Blob([new Uint8Array(getUint8Array(modifiedSetupSct))], {
        type: "application/octet-stream",
      }),
      files.setupSctContainer.file?.name
    );
  }

  if (wasAmitseSctModified) {
    changeLog += `========== ${files.amitseSctContainer.file?.name} ==========\n\n${amitseSctChangeLog}\n\n\n`;

    saveAs(
      new Blob([new Uint8Array(getUint8Array(modifiedAmitseSct))], {
        type: "application/octet-stream",
      }),
      files.amitseSctContainer.file?.name
    );
  }

  if (wasSetupdataBinModified) {
    changeLog += `========== ${files.setupdataBinContainer.file?.name} ==========\n\n${setupdataBinChangeLog}\n\n\n`;

    saveAs(
      new Blob([new Uint8Array(getUint8Array(modifiedSetupdataBin))], {
        type: "application/octet-stream",
      }),
      files.setupdataBinContainer.file?.name
    );
  }

  if (wasSetupSctModified || wasAmitseSctModified || wasSetupdataBinModified) {
    saveAs(
      new Blob([changeLog], {
        type: "text/plain",
      }),
      "changelog.txt"
    );
  } else {
    alert("No modifications have been done.");
  }
}

function determineSuppressionStart(setupTxtArray: string[], index: number) {
  if (!hasScope(setupTxtArray[index + 1].match(/\{ (.*) \}/)![1])) {
    return setupTxtArray[index + 2].split(" ")[0].slice(0, -1);
  }

  let openScopes = 1;
  let currentIndex = index + 2;
  while (openScopes !== 0) {
    const line = setupTxtArray[currentIndex];

    const anyOpcode = line.match(/\{ (.*) \}/);
    const end = line.match(/\{ 29 02 \}/);

    if (anyOpcode && hasScope(anyOpcode[1])) {
      openScopes++;
    }

    if (end) {
      openScopes--;
    }

    currentIndex++;
  }

  return setupTxtArray[currentIndex].split(" ")[0].slice(0, -1);
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function parseData(files: Files) {
  let setupTxt = files.setupTxtContainer.textContent!;
  const amitseSct = files.amitseSctContainer.textContent!;
  const setupdataBin = files.setupdataBinContainer.textContent!;

  if (!setupTxt.includes(`Program version: ${wantedIFRExtractorVersion}`)) {
    alert(
      `Wrong IFR-Extractor-RS version. Use version ${wantedIFRExtractorVersion}.`
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

  setupTxt = setupTxt.replaceAll(/[\r\n|\n|\r](?!0x[0-9A-F]{3})/g, "<br>");

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
    const formSet = line.match(
      /FormSet Guid: (.*)-(.*)-(.*)-(.*)-(.*), Title:/
    );
    const varStore = line.match(
      /VarStore Guid: (.*), VarStoreId: (.*), Size: (.*), Name: "(.*)" \{/
    );
    const form = line.match(/Form FormId: (.*), Title: "(.*)" \{ (.*) \}/);
    const suppressIf = line.match(/\{ 0A 82 \}/);
    const ref = line.match(
      /Ref Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreInfo: (.*), FormId: (.*) \{ (.*) \}/
    );
    const string = line.match(
      /String Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreInfo: (.*), MinSize: (.*), MaxSize: (.*), Flags: (.*) \{ (.*) \}/
    );
    const numeric = line.match(
      /Numeric Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarOffset: (.*), Flags: (.*), Size: (.*), Min: (.*), Max: (.*), Step: (.*) \{ (.*) \}/
    );
    const checkBox = line.match(
      /CheckBox Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarOffset: (.*), Flags: (.*) \{ (.*) \}/
    );
    const oneOf = line.match(
      /OneOf Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarOffset: (.*), Flags: (.*), Size: (.*), Min: (.*), Max: (.*), Step: (.*) \{ (.*) \}/
    );
    const oneOfOption = line.match(/OneOfOption Option: "(.*)" Value: (.*) \{/);
    const defaultId = line.match(/Default DefaultId: (.*) Value: (.*) \{/);
    const end = line.match(/\{ 29 02 \}/);
    const indentations = (line.match(/\t/g) ?? []).length;
    const offset = line.split(" ")[0].slice(0, -1);
    const currentScope = scopes[scopes.length - 1];

    if (formSet) {
      formSetId = formSet[4] + formSet[5];
    }

    if (varStore) {
      varStores.push({
        varStoreId: varStore[2],
        size: varStore[3],
        name: varStore[4],
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
          (varStore) => varStore.varStoreId === ref[5]
        )?.name!,
        formId,
        ...getAdditionalData(ref[8], setupdataBin, true),
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
        false
      );

      currentString = {
        name: string[1],
        description: string[2],
        type: "String",
        questionId: string[4],
        varStoreId: string[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === string[5]
        )?.name!,
        accessLevel,
        failsafe,
        optimal,
        offsets,
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
        false
      );

      currentNumeric = {
        name: numeric[1],
        description: numeric[2],
        type: "Numeric",
        questionId: numeric[4],
        varStoreId: numeric[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === numeric[5]
        )?.name!,
        varOffset: numeric[6],
        size: numeric[8],
        min: numeric[9],
        max: numeric[10],
        step: numeric[11],
        accessLevel,
        failsafe,
        optimal,
        offsets,
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
        false
      );

      currentCheckBox = {
        name: checkBox[1],
        description: checkBox[2],
        type: "CheckBox",
        questionId: checkBox[4],
        varStoreId: checkBox[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === checkBox[5]
        )?.name!,
        varOffset: checkBox[6],
        flags: checkBox[7],
        accessLevel,
        failsafe,
        optimal,
        offsets,
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
        false
      );

      currentOneOf = {
        name: oneOf[1],
        description: oneOf[2],
        type: "OneOf",
        questionId: oneOf[4],
        varStoreId: oneOf[5],
        varStoreName: varStores.find(
          (varStore) => varStore.varStoreId === oneOf[5]
        )?.name!,
        varOffset: oneOf[6],
        size: oneOf[8],
        options: [],
        accessLevel,
        failsafe,
        optimal,
        offsets,
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

    if (defaultId && scopes.length !== 0) {
      const oneDefault = {
        defaultId: defaultId[1],
        value: defaultId[2],
      };

      if (currentScope.type === "Numeric") {
        if (!currentNumeric.defaults) {
          currentNumeric.defaults = [];
        }
        currentNumeric.defaults.push(oneDefault);
      } else if (currentScope.type === "CheckBox") {
        if (!currentCheckBox.defaults) {
          currentCheckBox.defaults = [];
        }
        currentCheckBox.defaults.push(oneDefault);
      } else if (currentScope.type === "OneOf") {
        if (!currentOneOf.defaults) {
          currentOneOf.defaults = [];
        }
        currentOneOf.defaults.push(oneDefault);
      }
    }

    if (end) {
      const scopeType = currentScope?.type;

      if (currentScope?.indentations === indentations) {
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
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (scopeType === "SuppressIf") {
          if (currentSuppressions.length === 0) {
            alert("Something went wrong. Please file a bug report on Github.");
            window.location.reload();
            return {} as Data;
          }

          const latestSuppression = currentSuppressions.pop()!;
          suppressions.push({ ...latestSuppression, end: offset });
        }

        if (scopes.length === 0) {
          alert("Something went wrong. Please file a bug report on Github.");
          window.location.reload();
          return {} as Data;
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
        parseInt(match[1].slice(2) + match[1].slice(0, 2), 16)
      );
      return {
        name: forms.find((form) => parseInt(form.formId) === parseInt(hexEntry))
          ?.name!,
        formId: hexEntry,
        offset: decToHexString((match.index! + formSetId.length) / 2),
      };
    })
    .filter((x) => x.name);

  for (const form of forms) {
    if (form.formId in references) {
      form.referencedIn = [...references[form.formId]];
    }
  }

  const dataJson: Data = {
    menu,
    forms,
    varStores,
    suppressions,
    version,
    hashes: {
      setupTxt: sha256(setupTxt).toString(),
      setupSct: sha256(files.setupSctContainer.textContent!).toString(),
      amitseSct: sha256(amitseSct).toString(),
      setupdataBin: sha256(setupdataBin).toString(),
      offsetChecksum: calculateJsonChecksum(menu, forms, suppressions),
    },
  };

  return dataJson;
}
