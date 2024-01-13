import React from "react";
import s from "./FormUi.module.css";
import { Updater } from "use-immer";
import {
  Table,
  TextInput,
  NativeSelect,
  Spoiler,
  Chip,
  Stack,
  Group,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { Data, FormChildren, validateByteInput } from "../scripts";
import { SearchUi } from "./SearchUi";

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
      color="rgb(224, 49, 49)"
      variant="outline"
      checked={suppression.active}
      onClick={() => {
        setData((draft) => {
          draft.suppressions[suppressionIndex].active = !suppression.active;
        });
      }}
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
    const type = child.type;
    const info = [];

    if (type === "CheckBox" || type === "OneOf" || type === "Numeric") {
      if (type === "OneOf") {
        for (const option of child.options) {
          info.push([option.option, option.value]);
        }

        info.push(["newline"]);
      }

      if (type === "Numeric") {
        info.push(
          ["Min", child.min],
          ["Max", child.max],
          ["Step", child.step],
          ["newline"]
        );
      }

      if (child.defaults) {
        for (const def of child.defaults) {
          info.push([`DefaultId ${def.defaultId}`, def.value]);
        }

        if (type !== "CheckBox") {
          info.push(["newline"]);
        }
      }

      if (type === "CheckBox") {
        const def = child.flags.match(/\bDefault: (Enabled|Disabled)/);
        if (def) {
          info.push(["Default", def[1] === "Enabled" ? "1" : "0"]);
        }

        const mfgDef = child.flags.match(/MfgDefault: (Enabled|Disabled)/);
        if (mfgDef) {
          info.push(["MfgDefault", mfgDef[1] === "Enabled" ? "1" : "0"]);
        }

        if (def ?? mfgDef ?? child.defaults) {
          info.push(["newline"]);
        }
      }

      info.push(
        ["QuestionId", child.questionId],
        ["VarStoreId", child.varStoreId],
        ["VarStoreName", child.varStoreName],
        ["VarOffset", child.varOffset]
      );

      if (type !== "CheckBox") {
        info.push(["Size (bits)", child.size]);
      }
    }

    return (
      <tr className={s.memoRow}>
        <td
          className={type === "Ref" ? s.pointer : undefined}
          onClick={() => {
            if (type === "Ref") {
              handleRefClick(child.formId);
            }
          }}
        >
          {child.name}
        </td>
        <td>{type}</td>
        <td className={s.width}>
          {child.accessLevel !== null && (
            <TextInput
              value={child.accessLevel}
              onChange={(ev) => {
                const value = ev.target.value.toUpperCase();

                if (validateByteInput(value)) {
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
                const value = ev.target.value.toUpperCase();

                if (validateByteInput(value)) {
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
                const value = ev.target.value.toUpperCase();

                if (validateByteInput(value)) {
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
          <Group gap="xs">
            {child.suppressIf?.map((suppressionOffset, index) => (
              <SuppressionChip
                key={index}
                suppressionOffset={suppressionOffset}
                data={data}
                setData={setData}
              />
            ))}
          </Group>
        </td>
        <td>
          <Spoiler
            transitionDuration={0}
            maxHeight={70}
            showLabel=".........."
            hideLabel="....."
          >
            <Stack>
              {child.description && (
                <div>
                  {child.description
                    .split("<br>")
                    .filter((line) => line !== "")
                    .map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                </div>
              )}
              {info.length > 0 && (
                <div>
                  {info.map((item, index) => (
                    <div key={index} className={s.infoRow}>
                      {item[0] === "newline" ? (
                        <br />
                      ) : (
                        <>
                          <div>{item[0]}</div>
                          <div>{item[1]}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Stack>
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
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Form Id</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.menu.map((entry, index) => (
            <Table.Tr key={index.toString() + entry.offset + entry.formId}>
              <Table.Td
                className={s.pointer}
                onClick={() => {
                  handleRefClick(entry.formId);
                }}
              >
                {entry.name}
              </Table.Td>
              <Table.Td className={s.formIdWidth}>
                <NativeSelect
                  className={s.formIdChildWidth}
                  value={entry.formId}
                  data={data.forms.map((form) => form.formId)}
                  onChange={(ev) => {
                    const value = ev.target.value;

                    setData((draft) => {
                      draft.menu[index].formId = value;
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
                      draft.menu[index].name = data.forms.find(
                        (form) => parseInt(form.formId) === parseInt(value)
                      )?.name!;
                    });
                  }}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  }

  return (
    <Table stickyHeader stickyHeaderOffset={60} striped withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Access Level</Table.Th>
          <Table.Th>Failsafe</Table.Th>
          <Table.Th>Optimal</Table.Th>
          <Table.Th>Suppress If</Table.Th>
          <Table.Th>Info</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody className={s.striped}>
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
      </Table.Tbody>
    </Table>
  );
}
