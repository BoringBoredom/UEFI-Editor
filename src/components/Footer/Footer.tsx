import React from "react";
import s from "./Footer.module.css";
import {
  Button,
  Footer as MantineFooter,
  Group,
  TextInput,
} from "@mantine/core";
import { Updater } from "use-immer";
import { Data } from "../scripts";
import { validateInput } from "../FormUi";

interface FooterProps {
  currentFormIndex: number;
  setData: Updater<Data>;
}

export function Footer({ currentFormIndex, setData }: FooterProps) {
  const [input, setInput] = React.useState("05");

  return (
    <>
      {currentFormIndex >= 0 && (
        <MantineFooter height={{ base: 40 }}>
          <div className={s.verticalCenter}>
            <Group className={s.root} position="right" spacing="xs">
              <Button
                size="xs"
                variant="default"
                onClick={() =>
                  setData((draft) => {
                    for (const child of draft.forms[currentFormIndex]
                      .children) {
                      child.accessLevel = input;
                    }
                  })
                }
              >
                Change all Access Levels to
              </Button>
              <TextInput
                className={s.textInput}
                size="xs"
                value={input}
                onChange={(ev) => {
                  const value = ev.currentTarget.value.toUpperCase();

                  if (validateInput(value)) {
                    setInput(value);
                  }
                }}
              />
            </Group>
          </div>
        </MantineFooter>
      )}
    </>
  );
}
