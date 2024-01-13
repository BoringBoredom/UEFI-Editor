import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

import "@mantine/core/styles.css";
import { AppShell, MantineProvider, createTheme } from "@mantine/core";

const theme = createTheme({
  colors: {
    dark: [
      "#C1C2C5",
      "#A6A7AB",
      "#909296",
      "#5c5f66",
      "#373A40",
      "#2C2E33",
      "#25262b",
      "#1A1B1E",
      "#141517",
      "#101113",
    ],
  },
});

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AppShell
        navbar={{
          width: { base: 100, xs: 140, sm: 180, md: 220, lg: 260, xl: 300 },
          breakpoint: 0,
        }}
        header={{
          height: { base: 180, xs: 120, md: 60 },
        }}
        footer={{
          height: { base: 120, xs: 80, md: 40 },
        }}
        transitionDuration={0}
      >
        <App />
      </AppShell>
    </MantineProvider>
  </React.StrictMode>
);
