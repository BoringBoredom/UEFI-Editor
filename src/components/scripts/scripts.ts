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
} from "./types";

export const version = "0.0.1";

export function calculateJsonChecksum(menu: Menu, forms: Forms) {
  let offsetChecksum = "";
  for (const menuItem of menu) {
    offsetChecksum += menuItem.offset;
  }
  for (const form of forms) {
    for (const child of form.children) {
      offsetChecksum += child.offsets.join("");
    }
  }

  return sha256(offsetChecksum).toString();
}

function replaceAt(
  string: string,
  index: number,
  length: number,
  replacement: string
) {
  return (
    string.substring(0, index) + replacement + string.substring(index + length)
  );
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
    .map((scope) => scope.offset as string);
  if (suppressions.length !== 0) {
    formChild.suppressIf = [...suppressions];
  }
}

function getAccessLevels(
  bytes: string,
  hexSetupdataBin: string
): [string, string, string, Offsets] {
  const byteArray = bytes.split(" ");
  const regex = new RegExp(
    byteArray[6] +
      byteArray[7] +
      ".{28}(..).{6}" +
      byteArray[4] +
      byteArray[5] +
      ".{52}" +
      byteArray[2] +
      byteArray[3] +
      ".{4}(..)(..)"
  );

  const accessLevels = hexSetupdataBin.match(regex) as RegExpMatchArray;
  const offsets: Offsets = [
    decToHexString(((accessLevels.index as number) + 32) / 2),
    decToHexString(((accessLevels.index as number) + 104) / 2),
    decToHexString(((accessLevels.index as number) + 106) / 2),
  ];

  return [accessLevels[1], accessLevels[2], accessLevels[3], offsets];
}

function getUint8Array(string: string) {
  const array = [];
  for (let i = 0, len = string.length; i < len; i += 2) {
    array[i / 2] = parseInt(string.substring(i, i + 2), 16);
  }

  return array;
}

export async function downloadModifiedFiles(data: Data, files: Files) {
  let changeLog = `========== ${files.amitseSctContainer.file?.name} ==========\n\n`;
  let modifiedAmitseSct = files.amitseSctContainer.textContent as string;

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

      changeLog += `${
        data.forms.find((form) => parseInt(form.formId) === parseInt(oldFormId))
          ?.name
      } | ${oldFormId} -> ${
        data.forms.find(
          (form) => parseInt(form.formId) === parseInt(entry.formId)
        )?.name
      } | ${entry.formId}\n`;
    }
  }

  changeLog += `\n\n========== ${files.setupdataBin.file?.name} ==========\n\n`;
  let modifiedSetupdataBin = files.setupdataBin.textContent as string;

  for (const form of data.forms) {
    for (const child of form.children) {
      const accessLevelIndex = offsetToIndex(child.offsets[0]);
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
        changeLog += `${child.name} | ${child.questionId}: Access Level ${oldAccessLevel} -> ${newAccessLevel}\n`;
      }

      const failsafeIndex = offsetToIndex(child.offsets[1]);
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
        changeLog += `${child.name} | ${child.questionId}: Failsafe ${oldFailsafe} -> ${newFailsafe}\n`;
      }

      const optimalIndex = offsetToIndex(child.offsets[2]);
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
        changeLog += `${child.name} | ${child.questionId}: Optimal ${oldOptimal} -> ${newOptimal}\n`;
      }
    }
  }

  saveAs(
    new Blob([new Uint8Array(getUint8Array(modifiedAmitseSct))], {
      type: "application/octet-stream",
    }),
    "Section_PE32_image_AMITSE_AMITSE.sct"
  );

  saveAs(
    new Blob([new Uint8Array(getUint8Array(modifiedSetupdataBin))], {
      type: "application/octet-stream",
    }),
    "Section_Freeform_subtype_GUID_setupdata_setupdata_AMITSESetupData_body.bin"
  );

  saveAs(
    new Blob([changeLog], {
      type: "text/plain",
    }),
    "changelog.txt"
  );
}

export async function parseData(files: Files) {
  let setupTxt = files.setupTxtContainer.textContent as string;
  const amitseSct = files.amitseSctContainer.textContent as string;
  const setupdataBin = files.setupdataBin.textContent as string;

  setupTxt = setupTxt.replaceAll(/[\r\n|\n|\r](?!0x)/g, " ");

  let formSetId = "";
  const varStores: VarStores = [];
  const forms: Forms = [];
  const scopes: Scopes = [];
  let currentForm: Form = {} as Form;
  let currentOneOf: OneOfPrompt = {} as OneOfPrompt;
  let currentNumeric: NumericPrompt = {} as NumericPrompt;
  let currentCheckBox: CheckBoxPrompt = {} as CheckBoxPrompt;

  const references: Record<string, Set<string>> = {};

  for (const line of setupTxt.split("\n")) {
    const formSet = line.match(
      /FormSet Guid: (.*)-(.*)-(.*)-(.*)-(.*), Title:/
    );
    const varStore = line.match(
      /VarStore Guid: (.*), VarStoreId: (.*), Size: (.*), Name: "(.*)" \{/
    );
    const form = line.match(/Form FormId: (.*), Title: "(.*)" \{/);
    const suppressIf = line.match(/\{ 0A 82 \}/);
    const ref = line.match(
      /Ref Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreInfo: (.*), FormId: (.*) \{ (.*) \}/
    );
    const numeric = line.match(
      /Numeric Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreOffset: (.*), Flags: (.*), Size: (.*), Min: (.*), Max: (.*), Step: (.*) \{ (.*) \}/
    );
    const checkBox = line.match(
      /CheckBox Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreOffset: (.*), Flags: (.*) \{ (.*) \}/
    );
    const oneOf = line.match(
      /OneOf Prompt: "(.*)", Help: "(.*)", QuestionFlags: (.*), QuestionId: (.*), VarStoreId: (.*), VarStoreOffset: (.*), Flags: (.*), Size: (.*), Min: (.*), Max: (.*), Step: (.*) \{ (.*) \}/
    );
    const oneOfOption = line.match(/OneOfOption Option: "(.*)" Value: (.*) \{/);
    const defaultId = line.match(/Default DefaultId: (.*) Value: (.*) \{/);
    const end = line.match(/\{ 29 02 \}/);
    const indentations = (line.match(/\t/g) || []).length;

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

      scopes.push({ type: "Form", indentations });
    }

    if (suppressIf) {
      scopes.push({
        type: "SuppressIf",
        indentations,
        offset: line.split(" ")[0].slice(0, -1),
      });
    }

    if (ref) {
      const [accessLevel, failsafe, optimal, offsets] = getAccessLevels(
        ref[8],
        setupdataBin
      );

      const formId = ref[7];

      const currentRef: RefPrompt = {
        name: ref[1],
        description: ref[2],
        type: "Ref",
        questionId: ref[4],
        varStoreId: ref[5],
        formId,
        accessLevel,
        failsafe,
        optimal,
        offsets,
      };

      checkSuppressions(scopes, currentRef);

      currentForm.children.push(currentRef);

      if (references[formId]) {
        references[formId].add(currentForm.formId);
      } else {
        references[formId] = new Set([currentForm.formId]);
      }
    }

    if (numeric) {
      const [accessLevel, failsafe, optimal, offsets] = getAccessLevels(
        numeric[12],
        setupdataBin
      );

      currentNumeric = {
        name: numeric[1],
        description: numeric[2],
        type: "Numeric",
        varStoreOffset: numeric[6],
        varStoreId: numeric[5],
        questionId: numeric[4],
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

      scopes.push({ type: "Numeric", indentations });
    }

    if (checkBox) {
      const [accessLevel, failsafe, optimal, offsets] = getAccessLevels(
        checkBox[8],
        setupdataBin
      );

      currentCheckBox = {
        name: checkBox[1],
        description: checkBox[2],
        type: "CheckBox",
        varStoreOffset: checkBox[6],
        varStoreId: checkBox[5],
        questionId: checkBox[4],
        accessLevel,
        failsafe,
        optimal,
        offsets,
      };

      checkSuppressions(scopes, currentCheckBox);

      scopes.push({ type: "CheckBox", indentations });
    }

    if (oneOf) {
      const [accessLevel, failsafe, optimal, offsets] = getAccessLevels(
        oneOf[12],
        setupdataBin
      );

      currentOneOf = {
        name: oneOf[1],
        description: oneOf[2],
        type: "OneOf",
        varStoreOffset: oneOf[6],
        varStoreId: oneOf[5],
        questionId: oneOf[4],
        size: oneOf[8],
        options: [],
        accessLevel,
        failsafe,
        optimal,
        offsets,
      };

      checkSuppressions(scopes, currentOneOf);

      scopes.push({ type: "OneOf", indentations });
    }

    if (oneOfOption) {
      currentOneOf.options.push(`${oneOfOption[1]}: ${oneOfOption[2]}`);
    }

    if (defaultId && scopes.length !== 0) {
      const currentScope = scopes[scopes.length - 1];
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
      const currentScope = scopes[scopes.length - 1];
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
        }

        // debug
        if (scopes.length === 0) {
          console.log("About to pop 0 length Scopes.");
        }

        scopes.pop();
      }
    }
  }

  // debug
  if (scopes.length !== 0) {
    console.log("Scopes length is not 0: " + scopes);
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
          ?.name as string,
        formId: hexEntry,
        offset: decToHexString(
          ((match.index as number) + formSetId.length) / 2
        ),
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
    version,
    hashes: {
      setupTxt: sha256(setupTxt).toString(),
      setupSct: sha256(files.setupSctContainer.textContent).toString(),
      amitseSct: sha256(amitseSct).toString(),
      setupdataBin: sha256(setupdataBin).toString(),
      offsetChecksum: calculateJsonChecksum(menu, forms),
    },
  };

  return dataJson;
}
