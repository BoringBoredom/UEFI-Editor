import React from "react";
import { Updater } from "use-immer";
import { FileInput, Stack, LoadingOverlay } from "@mantine/core";
import { IconUpload } from "@tabler/icons";
import { Data, parseData } from "../scripts";

async function binToHexString(file: File) {
  return [...new Uint8Array(await file.arrayBuffer())]
    .map((x) => x.toString(16).toUpperCase().padStart(2, "0"))
    .join("");
}

export interface Files {
  setupSctContainer: FileContainer;
  setupTxtContainer: FileContainer;
  amitseSctContainer: FileContainer;
  setupdataBin: FileContainer;
}

export interface FileContainer {
  file?: File;
  textContent?: string;
  isWrongFile: boolean;
}

export interface FileUploadsProps {
  files: Files;
  setFiles: Updater<Files>;
  setData: Updater<Data>;
}

export function FileUploads({ files, setFiles, setData }: FileUploadsProps) {
  React.useEffect(() => {
    if (
      Object.values(files).every(
        (fileContainer) => fileContainer.file && !fileContainer.isWrongFile
      )
    ) {
      if (
        Object.values(files).every(
          (fileContainer) => !fileContainer.textContent
        )
      ) {
        Promise.all([
          (files.setupTxtContainer.file as File).text(),
          binToHexString(files.setupSctContainer.file as File),
          binToHexString(files.amitseSctContainer.file as File),
          binToHexString(files.setupdataBin.file as File),
        ]).then((values) =>
          setFiles((draft) => {
            draft.setupTxtContainer.textContent = values[0];
            draft.setupSctContainer.textContent = values[1];
            draft.amitseSctContainer.textContent = values[2];
            draft.setupdataBin.textContent = values[3];
          })
        );
      } else {
        parseData(files).then((data) => setData(data));
      }
    }
  }, [files, setFiles, setData]);

  return (
    <>
      <LoadingOverlay
        visible={Object.values(files).every(
          (fileContainer) => fileContainer.file && !fileContainer.isWrongFile
        )}
        loaderProps={{ size: "xl" }}
      />
      <Stack>
        <FileInput
          icon={<IconUpload />}
          size="lg"
          placeholder="Setup SCT"
          accept=".sct"
          value={files.setupSctContainer.file}
          error={files.setupSctContainer.isWrongFile}
          onChange={(file) => {
            if (file) {
              const name = file.name.toLowerCase();

              setFiles((draft) => {
                draft.setupSctContainer = {
                  file,
                  isWrongFile: !(
                    name.includes("setup") && name.endsWith(".sct")
                  ),
                };
              });
            }
          }}
        />

        <FileInput
          icon={<IconUpload />}
          size="lg"
          placeholder="IFR Extractor output TXT"
          accept=".txt"
          value={files.setupTxtContainer.file}
          error={files.setupTxtContainer.isWrongFile}
          onChange={(file) => {
            if (file) {
              const name = file.name.toLowerCase();

              setFiles((draft) => {
                draft.setupTxtContainer = {
                  file,
                  isWrongFile: !(name.includes("ifr") && name.endsWith(".txt")),
                };
              });
            }
          }}
        />

        <FileInput
          icon={<IconUpload />}
          size="lg"
          placeholder="AMITSE SCT"
          accept=".sct"
          value={files.amitseSctContainer.file}
          error={files.amitseSctContainer.isWrongFile}
          onChange={(file) => {
            if (file) {
              const name = file.name.toLowerCase();

              setFiles((draft) => {
                draft.amitseSctContainer = {
                  file,
                  isWrongFile: !(
                    name.includes("amitse") && name.endsWith(".sct")
                  ),
                };
              });
            }
          }}
        />

        <FileInput
          icon={<IconUpload />}
          size="lg"
          placeholder="Setupdata BIN"
          accept=".bin"
          value={files.setupdataBin.file}
          error={files.setupdataBin.isWrongFile}
          onChange={(file) => {
            if (file) {
              const name = file.name.toLowerCase();

              setFiles((draft) => {
                draft.setupdataBin = {
                  file,
                  isWrongFile: !(
                    name.includes("setupdata") && name.endsWith(".bin")
                  ),
                };
              });
            }
          }}
        />
      </Stack>
    </>
  );
}
