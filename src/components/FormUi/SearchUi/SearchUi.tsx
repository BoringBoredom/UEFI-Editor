import React from "react";
import s from "../FormUi.module.css";
import { useFocusTrap } from "@mantine/hooks";
import { Data } from "../../scripts";
import { Stack, Table, TextInput } from "@mantine/core";

interface SearchUiProps {
  data: Data;
  handleRefClick: (formId: string) => void;
  search: string;
  setSearch: (newValue: string) => void;
}

export function SearchUi({
  data,
  handleRefClick,
  search,
  setSearch,
}: SearchUiProps) {
  const focusTrapRef = useFocusTrap();

  const found: Array<{
    type: string;
    formId: string;
    formName: string;
    name: string;
  }> = [];

  if (search.length >= 2) {
    for (const form of data.forms) {
      if (form.name.toLowerCase().includes(search)) {
        found.push({
          type: "Form",
          formId: form.formId,
          formName: form.name,
          name: form.name,
        });
      }

      for (const setting of form.children) {
        if (setting.name.toLowerCase().includes(search)) {
          found.push({
            type: setting.type,
            formId: form.formId,
            formName: form.name,
            name: setting.name,
          });
        }
      }
    }
  }

  return (
    <Stack>
      <TextInput
        ref={focusTrapRef}
        placeholder="Search"
        defaultValue={search}
        onChange={(ev) => setSearch(ev.currentTarget.value.toLowerCase())}
      />

      <Table striped withColumnBorders>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Form Name</th>
            <th>Form Id</th>
          </tr>
        </thead>
        <tbody>
          {found.map((entry, index) => (
            <tr key={index.toString() + entry.formId}>
              <td>{entry.name}</td>
              <td>{entry.type}</td>
              <td
                className={s.pointer}
                onClick={() => handleRefClick(entry.formId)}
              >
                {entry.formName}
              </td>
              <td>{entry.formId}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Stack>
  );
}
