import React from "react";
import s from "./Navigation.module.css";
import { NavLink, AppShell, ScrollArea } from "@mantine/core";
import type { Data } from "../scripts/types";

interface NavigationProps {
  data: Data;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

const Navigation = React.memo(
  function Navigation({
    data,
    currentFormIndex,
    setCurrentFormIndex,
  }: NavigationProps) {
    return (
      <>
        <AppShell.Section
          className={
            currentFormIndex === -1
              ? [s.navElement, s.menu, s.selected].join(" ")
              : [s.navElement, s.menu].join(" ")
          }
          onClick={() => {
            setCurrentFormIndex(-1);
          }}
        >
          Menu
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea} type="always">
          {data.forms.map((form, index) => (
            <NavLink
              key={index.toString() + form.formId}
              id={`nav-${index}`}
              active={index === currentFormIndex}
              label={`${form.formId} ${form.name}`}
              onClick={() => {
                setCurrentFormIndex(index);
              }}
            />
          ))}
        </AppShell.Section>
        <AppShell.Section
          className={
            currentFormIndex === -2
              ? [s.navElement, s.search, s.selected].join(" ")
              : [s.navElement, s.search].join(" ")
          }
          onClick={() => {
            setCurrentFormIndex(-2);
          }}
        >
          Search
        </AppShell.Section>
      </>
    );
  },
  (oldProps: NavigationProps, newProps: NavigationProps) =>
    oldProps.currentFormIndex === newProps.currentFormIndex
);

export default Navigation;
