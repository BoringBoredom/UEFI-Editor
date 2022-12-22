import React from "react";
import s from "./Readme.module.css";
import { List, Stack, Text, Tooltip, Image, Anchor } from "@mantine/core";
import setupSctPng from "../images/setupSct.png";
import amitseSctPng from "../images/amitseSct.png";
import setupdataBinPng from "../images/setupdataBin.png";
import referencePng from "../images/reference.png";
import fileGuidPng from "../images/fileGuid.png";

export function Readme() {
  return (
    <Stack className={s.margin}>
      <div>
        <h3>
          Only the linked version of IFR-Extractor-RS works. You need a Github
          account to download it until the artifact is published as regular
          release.
        </h3>
        <h3>Hover over underlined text for additional information.</h3>
      </div>
      <div>
        <h2>Extracting files</h2>
        <List>
          <List.Item>Drag the BIOS file into UEFITool.</List.Item>
          <List.Item>
            Press CTRL + F, select the{" "}
            <Text span fw={700} fs="italic">
              Text
            </Text>{" "}
            tab, search{" "}
            <Text span fw={700} fs="italic">
              HPET
            </Text>{" "}
            or{" "}
            <Text span fw={700} fs="italic">
              High Precision
            </Text>{" "}
            and double-click the{" "}
            <Tooltip label={<Image src={referencePng} />}>
              <Text span td="underline">
                reference
              </Text>
            </Tooltip>{" "}
            to{" "}
            <Tooltip label={<Image src={setupSctPng} />}>
              <Text span fw={700} fs="italic" td="underline">
                Setup PE32 image section
              </Text>
            </Tooltip>
            .
          </List.Item>
          <List.Item>
            Scroll down until you find{" "}
            <Tooltip label={<Image src={amitseSctPng} />}>
              <Text span fw={700} fs="italic" td="underline">
                AMITSE PE32 image section
              </Text>
            </Tooltip>{" "}
            and{" "}
            <Tooltip label={<Image src={setupdataBinPng} />}>
              <Text span fw={700} fs="italic" td="underline">
                setupdata
              </Text>
            </Tooltip>{" "}
            (sometimes both are under{" "}
            <Text span fw={700} fs="italic">
              AMITSE
            </Text>
            ).
          </List.Item>
          <List.Item>
            Move{" "}
            <Text span fw={700} fs="italic">
              ifrextractor.exe
            </Text>{" "}
            to the current folder, press SHIFT + right-click, press{" "}
            <Text span fw={700} fs="italic">
              Open command window here
            </Text>{" "}
            and execute{" "}
            <Text span fw={700} fs="italic">
              ifrextractor.exe &quot;Section_PE32_image_Setup.sct&quot; verbose
            </Text>
          </List.Item>
        </List>
      </div>
      <div>
        <h2>Exposing invisible settings</h2>
        <List>
          <List.Item>
            Usually, either unsuppressing items or setting their access level to
            05 does the job.
          </List.Item>
        </List>
      </div>
      <div>
        <h2>Replacing files</h2>
        <List>
          <List.Item>
            At the moment, only{" "}
            <Anchor
              href="https://github.com/LongSoft/UEFITool/releases/tag/0.28.0"
              target="_blank"
            >
              UEFITool 0.28.0
            </Anchor>{" "}
            can replace files.
          </List.Item>
          <List.Item>
            You can use{" "}
            <Tooltip label={<Image src={fileGuidPng} />}>
              <Text span fw={700} fs="italic" td="underline">
                File GUIDs
              </Text>
            </Tooltip>{" "}
            to find the sections in 0.28.0.
          </List.Item>
          <List.Item>
            Replace files the same way you extracted them (Extract as is -&gt;
            Replace as is, Extract body -&gt; Replace body)
          </List.Item>
          <List.Item>
            Press{" "}
            <Text span fw={700} fs="italic">
              Save image file...
            </Text>{" "}
            (top left) to save the modifications.
          </List.Item>
        </List>
      </div>
    </Stack>
  );
}
