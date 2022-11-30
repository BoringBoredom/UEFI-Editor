import React from "react";
import { Updater } from "use-immer";
import s from "./FormUi.module.css";
import { Table, TextInput, Select, Spoiler, Stack } from "@mantine/core";
import { Data, FormChildren } from "../scripts";
import { useDebouncedState } from "@mantine/hooks";

function validateInput(value: string) {
  return (
    value.length <= 2 &&
    (value.length === 0 ||
      value.split("").every((char) => /[a-fA-F0-9]/.test(char)))
  );
}

interface TableRowProps {
  child: FormChildren;
  index: number;
  handleRefClick: (formId: string) => void;
  data: Data;
  setData: Updater<Data>;
  currentFormIndex: number;
}

const TableRow = React.memo(
  function TableRow({
    child,
    index,
    handleRefClick,
    setData,
    currentFormIndex,
  }: TableRowProps) {
    return (
      <tr>
        <td
          className={child.type === "Ref" ? s.pointer : undefined}
          onClick={() => {
            if (child.type === "Ref") {
              handleRefClick(child.formId);
            }
          }}
        >
          {child.name}
        </td>
        <td>{child.type}</td>
        <td>{child.type !== "Ref" && child.varStoreId}</td>
        <td>{child.type !== "Ref" && child.varStoreOffset}</td>
        <td>
          {(child.type === "Numeric" || child.type === "OneOf") && child.size}
        </td>
        <td className={s.width}>
          <TextInput
            value={child.accessLevel}
            onChange={(ev) => {
              const value = ev.currentTarget.value.toUpperCase();

              if (validateInput(value)) {
                setData((draft) => {
                  draft.forms[currentFormIndex].children[index].accessLevel =
                    value;
                });
              }
            }}
          />
        </td>
        <td className={s.width}>
          <TextInput
            value={child.failsafe}
            onChange={(ev) => {
              const value = ev.currentTarget.value.toUpperCase();

              if (validateInput(value)) {
                setData((draft) => {
                  draft.forms[currentFormIndex].children[index].failsafe =
                    value;
                });
              }
            }}
          />
        </td>
        <td className={s.width}>
          <TextInput
            value={child.optimal}
            onChange={(ev) => {
              const value = ev.currentTarget.value.toUpperCase();

              if (validateInput(value)) {
                setData((draft) => {
                  draft.forms[currentFormIndex].children[index].optimal = value;
                });
              }
            }}
          />
        </td>
        <td>
          <Spoiler maxHeight={70} showLabel=".........." hideLabel=".....">
            {child.suppressIf?.join(", ")}
          </Spoiler>
        </td>
        <td>
          <Spoiler maxHeight={70} showLabel=".........." hideLabel=".....">
            {child.description}
          </Spoiler>
        </td>
      </tr>
    );
  },
  (oldProps: TableRowProps, newProps: TableRowProps) => {
    const oldChild =
      oldProps.data.forms[oldProps.currentFormIndex].children[oldProps.index];
    const newChild =
      newProps.data.forms[newProps.currentFormIndex].children[newProps.index];

    return (
      oldChild.accessLevel === newChild.accessLevel &&
      oldChild.failsafe === newChild.failsafe &&
      oldChild.optimal === newChild.optimal
    );
  }
);

interface FormUiProps {
  data: Data;
  setData: Updater<Data>;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function FormUi({
  data,
  setData,
  currentFormIndex,
  setCurrentFormIndex,
}: FormUiProps) {
  const [search, setSearch] = useDebouncedState("", 200);

  function handleRefClick(formId: string) {
    const formIndex = data.forms.findIndex(
      (form) => parseInt(form.formId) === parseInt(formId)
    );

    if (formIndex >= 0) {
      setCurrentFormIndex(formIndex);

      document.getElementById(`nav-${formIndex}`)?.scrollIntoView();
    }
  }

  if (currentFormIndex === -2) {
    const found: Array<{
      type: "Form" | "Setting";
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
              type: "Setting",
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

  if (currentFormIndex === -1) {
    return (
      <Table striped withColumnBorders>
        <thead>
          <tr>
            <th>Name</th>
            <th>FormId</th>
          </tr>
        </thead>
        <tbody>
          {data.menu.map((entry, index) => (
            <tr key={index.toString() + entry.offset + entry.formId}>
              <td
                className={s.pointer}
                onClick={() => handleRefClick(entry.formId)}
              >
                {entry.name}
              </td>
              <td className={s.formIdWidth}>
                <Select
                  className={s.formIdChildWidth}
                  value={entry.formId}
                  data={data.forms.map((form) => form.formId)}
                  onChange={(value) => {
                    if (value !== null) {
                      setData((draft) => {
                        draft.menu[index].formId = value;
                        draft.menu[index].name = data.forms.find(
                          (form) => parseInt(form.formId) === parseInt(value)
                        )?.name as string;
                      });
                    }
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }

  return (
    <Table striped withColumnBorders>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>VarStore Id</th>
          <th>VarStore Offset</th>
          <th>Size (Bit)</th>
          <th>Access Level</th>
          <th>Failsafe</th>
          <th>Optimal</th>
          <th>Suppress If</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {data.forms[currentFormIndex].children.map((child, index) => (
          <TableRow
            key={index.toString() + child.questionId}
            child={child}
            index={index}
            handleRefClick={handleRefClick}
            data={data}
            setData={setData}
            currentFormIndex={currentFormIndex}
          />
        ))}
      </tbody>
    </Table>
  );
}