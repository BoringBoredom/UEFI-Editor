import React from "react";
import s from "./Navigation.module.css";
import { NavLink, Navbar, ScrollArea } from "@mantine/core";
import { Data } from "../scripts";

interface NavigationProps {
  data: Data;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const Navigation = React.memo(
  function Navigation({
    data,
    currentFormIndex,
    setCurrentFormIndex,
  }: NavigationProps) {
    return (
      <Navbar
        width={{ base: 100, xs: 140, sm: 180, md: 220, lg: 260, xl: 300 }}
      >
        <Navbar.Section
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
        </Navbar.Section>
        <Navbar.Section grow component={ScrollArea} type="always">
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
        </Navbar.Section>
        <Navbar.Section
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
        </Navbar.Section>
      </Navbar>
    );
  },
  (oldProps: NavigationProps, newProps: NavigationProps) =>
    oldProps.currentFormIndex === newProps.currentFormIndex
);
