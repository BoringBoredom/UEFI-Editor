import React from "react";
import s from "./Footer.module.css";
import { Button, Group, TextInput, FileButton } from "@mantine/core";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import { saveAs } from "file-saver";
import type { Updater } from "use-immer";
import {
  validateByteInput,
  calculateJsonChecksum,
  downloadModifiedFiles,
  version,
} from "../scripts/scripts";
import type { Data, Suppression } from "../scripts/types";
import type { PopulatedFiles } from "../FileUploads/FileUploads";

interface FooterProps {
  files: PopulatedFiles;
  data: Data;
  setData: Updater<Data>;
  currentFormIndex: number;
}

export default function Footer({
  files,
  currentFormIndex,
  data,
  setData,
}: FooterProps) {
  const resetRef = React.useRef<() => void>(null);
  const [input, setInput] = React.useState("05");

  return (
    <div className={s.root}>
      <Group justify="space-between" gap={"xs"} className={s.maxWidth}>
        <Group gap={"xs"}>
          <FileButton
            resetRef={resetRef}
            accept=".json"
            onChange={(file) => {
              if (file) {
                void file.text().then((fileData) => {
                  const jsonData = JSON.parse(fileData) as Data;

                  if (
                    jsonData.version === version &&
                    jsonData.hashes.setupTxt === data.hashes.setupTxt &&
                    jsonData.hashes.setupSct === data.hashes.setupSct &&
                    jsonData.hashes.amitseSct === data.hashes.amitseSct &&
                    jsonData.hashes.setupdataBin === data.hashes.setupdataBin &&
                    calculateJsonChecksum(
                      jsonData.menu,
                      jsonData.forms,
                      jsonData.suppressions
                    ) === data.hashes.offsetChecksum
                  ) {
                    setData(jsonData);
                  } else {
                    alert("Wrong JSON version or file hashes.");
                  }

                  resetRef.current?.();
                });
              }
            }}
          >
            {(props) => (
              <Button
                {...props}
                size="xs"
                leftSection={<IconUpload />}
                variant="default"
              >
                data.json
              </Button>
            )}
          </FileButton>

          <Button
            size="xs"
            variant="default"
            leftSection={<IconDownload />}
            onClick={() => {
              saveAs(
                new Blob([JSON.stringify(data, null, 2)], {
                  type: "text/plain",
                }),
                "data.json"
              );
            }}
          >
            data.json
          </Button>

          <Button
            size="xs"
            variant="default"
            leftSection={<IconDownload />}
            onClick={() => {
              void downloadModifiedFiles(data, files);
            }}
          >
            UEFI files
          </Button>
        </Group>

        {currentFormIndex >= 0 && (
          <Group gap={"xs"}>
            <Button
              size="xs"
              variant="default"
              onClick={() => {
                setData((draft) => {
                  for (const child of draft.forms[currentFormIndex].children) {
                    if (child.suppressIf) {
                      for (const suppressionOffset of child.suppressIf) {
                        (
                          draft.suppressions.find(
                            (suppression) =>
                              suppression.offset === suppressionOffset
                          ) as Suppression
                        ).active = false;
                      }
                    }
                  }
                });
              }}
            >
              Unsuppress all Items in this Form
            </Button>

            <Button
              size="xs"
              variant="default"
              onClick={() => {
                setData((draft) => {
                  for (const child of draft.forms[currentFormIndex].children) {
                    child.accessLevel = input;
                  }
                });
              }}
            >
              Change all Access Levels in this Form to
            </Button>

            <TextInput
              className={s.textInput}
              size="xs"
              value={input}
              onChange={(ev) => {
                const value = ev.target.value.toUpperCase();

                if (validateByteInput(value)) {
                  setInput(value);
                }
              }}
            />
          </Group>
        )}
      </Group>
    </div>
  );
}
