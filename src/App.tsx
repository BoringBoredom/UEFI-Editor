import React from "react";
import s from "./App.module.css";
import { useImmer } from "use-immer";
import { AppShell, Button, Group, Stack } from "@mantine/core";
import { Data } from "./components/scripts";
import { Files, FileUploads } from "./components/FileUploads";
import { FormUi } from "./components/FormUi";
import { Navigation } from "./components/Navigation";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { IconBrandGithub } from "@tabler/icons";

export default function App() {
  const [files, setFiles] = useImmer<Files>({
    setupSctContainer: { isWrongFile: false },
    setupTxtContainer: { isWrongFile: false },
    amitseSctContainer: { isWrongFile: false },
    setupdataBin: { isWrongFile: false },
  });

  const [data, setData] = useImmer<Data>(null as unknown as Data);

  const [currentFormIndex, setCurrentFormIndex] = React.useState(-1);

  return (
    <>
      {data ? (
        <AppShell
          navbar={
            <Navigation
              data={data}
              currentFormIndex={currentFormIndex}
              setCurrentFormIndex={setCurrentFormIndex}
            />
          }
          header={
            <Header
              files={files}
              data={data}
              setData={setData}
              currentFormIndex={currentFormIndex}
              setCurrentFormIndex={setCurrentFormIndex}
            />
          }
          footer={
            <Footer currentFormIndex={currentFormIndex} setData={setData} />
          }
        >
          <FormUi
            data={data}
            setData={setData}
            currentFormIndex={currentFormIndex}
            setCurrentFormIndex={setCurrentFormIndex}
          />
        </AppShell>
      ) : (
        <Stack className={s.padding} spacing="xl">
          <FileUploads files={files} setFiles={setFiles} setData={setData} />
          <Group position="center">
            <Button
              variant="default"
              size="lg"
              component="a"
              href="https://github.com/BoringBoredom/UEFI-Editor#usage-guide"
              target="_blank"
              leftIcon={<IconBrandGithub />}
            >
              Usage guide
            </Button>
            <Button
              variant="default"
              size="lg"
              component="a"
              href="https://github.com/BoringBoredom/UEFI-Editor/issues"
              target="_blank"
              leftIcon={<IconBrandGithub />}
            >
              Report a bug
            </Button>
          </Group>
        </Stack>
      )}
    </>
  );
}
