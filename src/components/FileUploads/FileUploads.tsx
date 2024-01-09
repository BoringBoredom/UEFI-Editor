import React from "react";
import { Updater } from "use-immer";
import { FileInput, Stack, LoadingOverlay } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { Data, parseData, binToHexString } from "../scripts";

export interface Files {
  setupSctContainer: FileContainer;
  setupTxtContainer: FileContainer;
  amitseSctContainer: FileContainer;
  setupdataBinContainer: FileContainer;
}

export interface PopulatedFiles {
  setupSctContainer: PopulatedFileContainer;
  setupTxtContainer: PopulatedFileContainer;
  amitseSctContainer: PopulatedFileContainer;
  setupdataBinContainer: PopulatedFileContainer;
}

export interface FileContainer {
  file?: File;
  textContent?: string;
  isWrongFile: boolean;
}

export interface PopulatedFileContainer extends FileContainer {
  file: File;
  textContent: string;
}

export interface FileUploadsProps {
  files: Files;
  setFiles: Updater<Files>;
  setData: Updater<Data>;
}

export function FileUploads({ files, setFiles, setData }: FileUploadsProps) {
  React.useEffect(() => {
    if (
      files.setupSctContainer.file &&
      !files.setupSctContainer.isWrongFile &&
      files.setupTxtContainer.file &&
      !files.setupTxtContainer.isWrongFile &&
      files.amitseSctContainer.file &&
      !files.amitseSctContainer.isWrongFile &&
      files.setupdataBinContainer.file &&
      !files.setupdataBinContainer.isWrongFile
    ) {
      if (
        !files.setupSctContainer.textContent &&
        !files.setupTxtContainer.textContent &&
        !files.amitseSctContainer.textContent &&
        !files.setupdataBinContainer.textContent
      ) {
        void Promise.all([
          files.setupTxtContainer.file.text(),
          binToHexString(files.setupSctContainer.file),
          binToHexString(files.amitseSctContainer.file),
          binToHexString(files.setupdataBinContainer.file),
        ]).then((values) => {
          setFiles((draft) => {
            draft.setupTxtContainer.textContent = values[0];
            draft.setupSctContainer.textContent = values[1];
            draft.amitseSctContainer.textContent = values[2];
            draft.setupdataBinContainer.textContent = values[3];
          });
        });
      } else {
        void parseData(files as PopulatedFiles).then((data) => {
          setData(data);
        });
      }
    }
  }, [files, setFiles, setData]);

  return (
    <>
      <LoadingOverlay
        visible={
          !!(
            files.setupSctContainer.file &&
            !files.setupSctContainer.isWrongFile &&
            files.setupTxtContainer.file &&
            !files.setupTxtContainer.isWrongFile &&
            files.amitseSctContainer.file &&
            !files.amitseSctContainer.isWrongFile &&
            files.setupdataBinContainer.file &&
            !files.setupdataBinContainer.isWrongFile
          )
        }
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
          value={files.setupdataBinContainer.file}
          error={files.setupdataBinContainer.isWrongFile}
          onChange={(file) => {
            if (file) {
              const name = file.name.toLowerCase();

              setFiles((draft) => {
                draft.setupdataBinContainer = {
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
