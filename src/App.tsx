import React from "react";
import s from "./App.module.css";
import { useImmer } from "use-immer";
import { AppShell, Button, Group, Stack } from "@mantine/core";
import type { Data } from "./components/scripts/types";
import FileUploads, {
  type Files,
  type PopulatedFiles,
} from "./components/FileUploads/FileUploads";
import FormUi from "./components/FormUi/FormUi";
import Navigation from "./components/Navigation/Navigation";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import { IconBrandGithub } from "@tabler/icons-react";

export default function App() {
  const [files, setFiles] = useImmer<Files>({
    setupSctContainer: { isWrongFile: false },
    setupTxtContainer: { isWrongFile: false },
    amitseSctContainer: { isWrongFile: false },
    setupdataBinContainer: { isWrongFile: false },
  });

  const [data, setData] = useImmer<Data>({} as Data);

  const [currentFormIndex, setCurrentFormIndex] = React.useState(-1);

  return (
    <>
      {Object.values(data).length !== 0 ? (
        <>
          <AppShell.Navbar>
            <Navigation
              data={data}
              currentFormIndex={currentFormIndex}
              setCurrentFormIndex={setCurrentFormIndex}
            />
          </AppShell.Navbar>
          <AppShell.Header>
            <Header
              data={data}
              currentFormIndex={currentFormIndex}
              setCurrentFormIndex={setCurrentFormIndex}
            />
          </AppShell.Header>
          <AppShell.Footer>
            <Footer
              currentFormIndex={currentFormIndex}
              files={files as PopulatedFiles}
              data={data}
              setData={setData}
            />
          </AppShell.Footer>
          <AppShell.Main>
            <FormUi
              data={data}
              setData={setData}
              currentFormIndex={currentFormIndex}
              setCurrentFormIndex={setCurrentFormIndex}
            />
          </AppShell.Main>
        </>
      ) : (
        <Stack className={s.padding} gap="xl">
          <FileUploads files={files} setFiles={setFiles} setData={setData} />
          <Group justify="center">
            <Button
              variant="default"
              size="lg"
              component="a"
              href="https://github.com/BoringBoredom/UEFI-Editor#usage-guide"
              target="_blank"
              leftSection={<IconBrandGithub />}
            >
              Usage guide
            </Button>
            <Button
              variant="default"
              size="lg"
              component="a"
              href="https://github.com/BoringBoredom/UEFI-Editor/issues"
              target="_blank"
              leftSection={<IconBrandGithub />}
            >
              Report a bug
            </Button>
          </Group>
        </Stack>
      )}
    </>
  );
}
