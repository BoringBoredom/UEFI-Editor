import React from "react";
import { Group } from "@mantine/core";
import s from "./Header.module.css";
import type { Data } from "../scripts/types";

interface HeaderProps {
  data: Data;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function Header({
  data,
  currentFormIndex,
  setCurrentFormIndex,
}: HeaderProps) {
  const currentForm = data.forms[currentFormIndex];

  return (
    <>
      {currentFormIndex >= 0 && (
        <div className={s.root}>
          <Group gap="xs">
            {currentForm.referencedIn.length > 0 && (
              <>
                {currentForm.referencedIn.map((formId) => (
                  <div
                    key={currentForm.formId + formId}
                    className={s.pointer}
                    onClick={() => {
                      const formIndex = data.forms.findIndex(
                        (form) => parseInt(form.formId) === parseInt(formId)
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
                        (form) => parseInt(form.formId) === parseInt(formId)
                      )?.name
                    }
                  </div>
                ))}
                <div>{">"}</div>
              </>
            )}
            <div>{currentForm.name}</div>
          </Group>
        </div>
      )}
    </>
  );
}
