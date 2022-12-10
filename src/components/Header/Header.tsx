import React from "react";
import { Updater } from "use-immer";
import s from "./Header.module.css";
import { saveAs } from "file-saver";
import {
  Button,
  FileButton,
  Group,
  Header as MantineHeader,
} from "@mantine/core";
import { IconDownload, IconUpload } from "@tabler/icons";
import {
  calculateJsonChecksum,
  Data,
  downloadModifiedFiles,
  version,
} from "../scripts";
import { Files } from "../FileUploads";

interface HeaderProps {
  files: Files;
  data: Data;
  setData: Updater<Data>;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function Header({
  files,
  data,
  setData,
  currentFormIndex,
  setCurrentFormIndex,
}: HeaderProps) {
  const resetRef = React.useRef<() => void>(null);

  const currentForm = data.forms[currentFormIndex];

  return (
    <MantineHeader
      height={{ base: 360, xs: 300, sm: 240, md: 180, lg: 120, xl: 60 }}
    >
      <div className={s.verticalCenter}>
        <Group className={s.root} position="apart">
          <Group>
            <FileButton
              resetRef={resetRef}
              accept=".json"
              onChange={(file) => {
                if (file) {
                  file.text().then((fileData) => {
                    const jsonData: Data = JSON.parse(fileData);

                    if (
                      jsonData.version === version &&
                      jsonData.hashes.setupTxt === data.hashes.setupTxt &&
                      jsonData.hashes.setupSct === data.hashes.setupSct &&
                      jsonData.hashes.amitseSct === data.hashes.amitseSct &&
                      jsonData.hashes.setupdataBin ===
                        data.hashes.setupdataBin &&
                      calculateJsonChecksum(jsonData.menu, jsonData.forms) ===
                        data.hashes.offsetChecksum
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
                <Button {...props} leftIcon={<IconUpload />} variant="default">
                  data.json
                </Button>
              )}
            </FileButton>

            <Button
              variant="default"
              leftIcon={<IconDownload />}
              onClick={() =>
                saveAs(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "text/plain",
                  }),
                  "data.json"
                )
              }
            >
              data.json
            </Button>

            <Button
              variant="default"
              leftIcon={<IconDownload />}
              onClick={() => downloadModifiedFiles(data, files)}
            >
              UEFI files
            </Button>
          </Group>

          {currentFormIndex >= 0 && (
            <Group className={s.forms}>
              {currentForm.referencedIn.length > 0 && (
                <>
                  <Group>
                    {currentForm.referencedIn.map((formId) => (
                      <div
                        key={currentForm.formId + formId}
                        className={s.pointer}
                        onClick={() => {
                          const formIndex = data.forms.findIndex(
                            (form) =>
                              parseInt(form.formId) ===
                              parseInt(formId as string)
                          );

                          if (formIndex >= 0) {
                            setCurrentFormIndex(formIndex);

                            document
                              .getElementById(`nav-${formIndex}`)
                              ?.scrollIntoView();
                          }
                        }}
                      >
                        {
                          data.forms.find(
                            (form) =>
                              parseInt(form.formId) ===
                              parseInt(formId as string)
                          )?.name
                        }
                      </div>
                    ))}
                  </Group>
                  <div>{">"}</div>
                </>
              )}
              <div>{currentForm.name}</div>
            </Group>
          )}
        </Group>
      </div>
    </MantineHeader>
  );
}
