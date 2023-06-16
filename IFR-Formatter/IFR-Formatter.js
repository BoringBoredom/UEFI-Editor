const fs = require("fs");
const path = require("path");
const process = require("process");

function returnForm(currentForm) {
  return `${" ".repeat(120)}${currentForm}\n`;
}

(async function () {
  const currentVersion = "0.1.1";

  let script;
  let latestVersionMatch;

  try {
    script = await (
      await fetch(
        "https://raw.githubusercontent.com/BoringBoredom/UEFI-Editor/master/IFR-Formatter/IFR-Formatter.js"
      )
    ).text();
  } catch {
    // skip
  }

  if (script) {
    latestVersionMatch = script.match(
      /const currentVersion = "(\d).(\d).(\d)";/
    );
  }

  if (latestVersionMatch) {
    const [currentMajor, currentMinor, currentPatch] = currentVersion
      .split(".")
      .map((number) => parseInt(number, 10));
    const [, latestMajor, latestMinor, latestPatch] = latestVersionMatch.map(
      (number) => parseInt(number, 10)
    );

    if (
      currentMajor < latestMajor ||
      (currentMajor === latestMajor && currentMinor < latestMinor) ||
      (currentMajor === latestMajor &&
        currentMinor === latestMinor &&
        currentPatch < latestPatch)
    ) {
      fs.writeFileSync(`./${path.basename(__filename)}`, script);

      return console.log("The script has been updated. Run it again.");
    }
  }

  let file = fs.readFileSync(process.argv[2], "utf8");
  let formattedFile = "";

  if(!file.match(/[\r\n|\n|\r](0x[0-9A-F]{3})/)) {
    return console.log("The script only works on verbose output of ifrextractor https://github.com/LongSoft/IFRExtractor-RS");
  }

  file = file.replaceAll(/[\r\n|\n|\r](?!0x[0-9A-F]{3})/g, "<br>");

  const varStores = {};
  let currentForm;

  for (const line of file.split("\n")) {
    const varStore = line.match(
      /VarStore Guid: (.*), VarStoreId: (.*), Size: (.*), Name: "(.*)" \{/
    );
    const form = line.match(/Form FormId: (.*), Title: "(.*)" \{ (.*) \}/);
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

    if (varStore) {
      varStores[varStore[2]] = varStore[4];
    }

    if (form) {
      currentForm = form[2];
    }

    if (string) {
      formattedFile += `${returnForm(currentForm)}${string[1]}\n`;
    }

    if (numeric) {
      formattedFile += `${returnForm(currentForm)}${numeric[1]} | VarStore: ${
        varStores[numeric[5]]
      } | VarOffset: ${numeric[6]} | Size: 0x${(parseInt(numeric[8], 10) / 8)
        .toString(16)
        .toUpperCase()}\n    Min: ${numeric[9]} | Max: ${numeric[10]} | Step: ${
        numeric[11]
      }\n`;
    }

    if (checkBox) {
      formattedFile += `${returnForm(currentForm)}${checkBox[1]} | VarStore: ${
        varStores[checkBox[5]]
      } | VarOffset: ${checkBox[6]}\n`;
    }

    if (oneOf) {
      formattedFile += `${returnForm(currentForm)}${oneOf[1]} | VarStore: ${
        varStores[oneOf[5]]
      } | VarOffset: ${oneOf[6]} | Size: 0x${(parseInt(oneOf[8], 10) / 8)
        .toString(16)
        .toUpperCase()}\n`;
    }

    if (oneOfOption) {
      formattedFile += `    ${oneOfOption[1]}: 0x${parseInt(
        oneOfOption[2].split(",")[0],
        10
      )
        .toString(16)
        .toUpperCase()}\n`;
    }
  }

  fs.writeFileSync(
    path.join(path.dirname(process.argv[2]), `formatted_${path.basename(process.argv[2])}`),
    formattedFile
  );
})();
