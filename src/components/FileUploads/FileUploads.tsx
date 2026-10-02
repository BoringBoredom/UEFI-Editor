import React from "react";
import type { Updater } from "use-immer";
import { Button, FileInput, Stack, LoadingOverlay } from "@mantine/core";
import { IconFolderOpen } from "@tabler/icons-react";
import { parseData } from "../scripts/scripts";
import { parseNvramDefaults } from "../scripts/nvram";
import type { Data } from "../scripts/types";
const hexWorker = () =>
  new Worker(new URL("../scripts/hexWorker.ts", import.meta.url));

export interface Files {
  setupSctContainer: FileContainer;
  setupTxtContainer: FileContainer;
  amitseSctContainer: FileContainer;
  setupdataBinContainer: FileContainer;
  nvramContainer: NvramFileContainer;
}

export interface PopulatedFiles {
  setupSctContainer: Required<FileContainer>;
  setupTxtContainer: Required<FileContainer>;
  amitseSctContainer: Required<FileContainer>;
  setupdataBinContainer: Required<FileContainer>;
  nvramContainer: NvramFileContainer;
}

export interface FileContainer {
  file?: File;
  textContent?: string;
  isWrongFile: boolean;
}

/** Optional NVRAM volume or BIOS image containing StdDefaults/MfgDefaults */
export interface NvramFileContainer {
  file?: File;
  bytes?: Uint8Array;
}

export interface FileUploadsProps {
  files: Files;
  setFiles: Updater<Files>;
  setData: Updater<Data>;
}

function readHex(file: File) {
  return new Promise<string>((resolve) => {
    const worker = hexWorker();
    worker.onmessage = (e: MessageEvent<string>) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.postMessage(file);
  });
}

export default function FileUploads({
  files,
  setFiles,
  setData,
}: FileUploadsProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const requiredFilesValid = !!(
    files.setupSctContainer.file &&
    !files.setupSctContainer.isWrongFile &&
    files.setupTxtContainer.file &&
    !files.setupTxtContainer.isWrongFile &&
    files.amitseSctContainer.file &&
    !files.amitseSctContainer.isWrongFile &&
    files.setupdataBinContainer.file &&
    !files.setupdataBinContainer.isWrongFile
  );

  async function load() {
    if (
      !files.setupSctContainer.file ||
      !files.setupTxtContainer.file ||
      !files.amitseSctContainer.file ||
      !files.setupdataBinContainer.file
    ) {
      return;
    }

    setIsLoading(true);

    const [setupTxt, setupSct, amitseSct, setupdataBin, nvramBuffer] =
      await Promise.all([
        files.setupTxtContainer.file.text(),
        readHex(files.setupSctContainer.file),
        readHex(files.amitseSctContainer.file),
        readHex(files.setupdataBinContainer.file),
        files.nvramContainer.file?.arrayBuffer(),
      ]);

    let nvramContainer: NvramFileContainer = {};

    if (files.nvramContainer.file && nvramBuffer) {
      const bytes = new Uint8Array(nvramBuffer);
      const defaults = parseNvramDefaults(bytes);

      if (defaults.std.length === 0 && defaults.mfg.length === 0) {
        alert(
          `No "StdDefaults"/"MfgDefaults" NVRAM store found in ${files.nvramContainer.file.name}. Continuing without it.`,
        );
      } else {
        nvramContainer = { file: files.nvramContainer.file, bytes };
      }
    }

    const populatedFiles: PopulatedFiles = {
      setupSctContainer: {
        file: files.setupSctContainer.file,
        textContent: setupSct,
        isWrongFile: false,
      },
      setupTxtContainer: {
        file: files.setupTxtContainer.file,
        textContent: setupTxt,
        isWrongFile: false,
      },
      amitseSctContainer: {
        file: files.amitseSctContainer.file,
        textContent: amitseSct,
        isWrongFile: false,
      },
      setupdataBinContainer: {
        file: files.setupdataBinContainer.file,
        textContent: setupdataBin,
        isWrongFile: false,
      },
      nvramContainer,
    };

    setFiles(populatedFiles);

    const data = await parseData(populatedFiles);

    if (Object.keys(data).length === 0) {
      setIsLoading(false);
    }

    setData(data);
  }

  return (
    <>
      <LoadingOverlay visible={isLoading} loaderProps={{ size: "xl" }} />
      <Stack>
        <FileInput
          leftSection={<IconFolderOpen />}
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
          leftSection={<IconFolderOpen />}
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
          leftSection={<IconFolderOpen />}
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
          leftSection={<IconFolderOpen />}
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

        <FileInput
          leftSection={<IconFolderOpen />}
          size="lg"
          placeholder="NVRAM volume / BIOS image (optional)"
          clearable
          value={files.nvramContainer.file ?? null}
          onChange={(file) => {
            setFiles((draft) => {
              draft.nvramContainer = file ? { file } : {};
            });
          }}
        />

        <Button
          size="lg"
          disabled={!requiredFilesValid || isLoading}
          onClick={() => {
            void load();
          }}
        >
          Load
        </Button>
      </Stack>
    </>
  );
}
