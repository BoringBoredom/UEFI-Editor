import React from "react";
import s from "./FormUi.module.css";
import { Updater } from "use-immer";
import { Table, TextInput, Select, Spoiler, Chip } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { Data, FormChildren } from "../scripts";
import { SearchUi } from "./SearchUi";

export function validateInput(value: string) {
  return (
    value.length <= 2 &&
    (value.length === 0 ||
      value.split("").every((char) => /[a-fA-F0-9]/.test(char)))
  );
}

interface SuppressionChipProps {
  suppressionOffset: string;
  data: Data;
  setData: Updater<Data>;
}

function SuppressionChip({
  suppressionOffset,
  data,
  setData,
}: SuppressionChipProps) {
  const suppressionIndex = data.suppressions.findIndex(
    (suppression) => suppression.offset === suppressionOffset
  );

  const suppression = data.suppressions[suppressionIndex];

  return (
    <Chip
      size="xs"
      color="red"
      checked={suppression.active}
      onClick={() =>
        setData((draft) => {
          draft.suppressions[suppressionIndex].active = !suppression.active;
        })
      }
    >
      {suppressionOffset}
    </Chip>
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
    data,
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
        <td className={s.width}>
          {child.accessLevel !== null && (
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
          )}
        </td>
        <td className={s.width}>
          {child.failsafe !== null && (
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
          )}
        </td>
        <td className={s.width}>
          {child.optimal !== null && (
            <TextInput
              value={child.optimal}
              onChange={(ev) => {
                const value = ev.currentTarget.value.toUpperCase();

                if (validateInput(value)) {
                  setData((draft) => {
                    draft.forms[currentFormIndex].children[index].optimal =
                      value;
                  });
                }
              }}
            />
          )}
        </td>
        <td>
          <Chip.Group>
            {child.suppressIf?.map((suppressionOffset, index) => (
              <SuppressionChip
                key={index}
                suppressionOffset={suppressionOffset}
                data={data}
                setData={setData}
              />
            ))}
          </Chip.Group>
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
      oldChild.optimal === newChild.optimal &&
      JSON.stringify(
        oldChild.suppressIf?.map(
          (offset) =>
            oldProps.data.suppressions.find(
              (suppression) => suppression.offset === offset
            )?.active
        )
      ) ===
        JSON.stringify(
          newChild.suppressIf?.map(
            (offset) =>
              newProps.data.suppressions.find(
                (suppression) => suppression.offset === offset
              )?.active
          )
        )
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
    return (
      <SearchUi
        data={data}
        handleRefClick={handleRefClick}
        search={search}
        setSearch={setSearch}
      />
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
