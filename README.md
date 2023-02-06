# Aptio V UEFI Editor (AMIBCP alternative)

## https://boringboredom.github.io/UEFI-Editor/

![](./images/showcase/1.png)
![](./images/showcase/2.png)

# Usage guide

## Prerequisites

- [UEFITool NE](https://github.com/LongSoft/UEFITool/releases) (press `Show all 14 assets`)
- [UEFITool 0.28.0](https://github.com/LongSoft/UEFITool/releases/tag/0.28.0) ([why?](https://github.com/LongSoft/UEFITool#known-issues))
- [IFR Extractor](https://github.com/LongSoft/IFRExtractor-RS/releases)
- [UEFI Editor](https://boringboredom.github.io/UEFI-Editor/)

## Extracting the necessary files

- Drag and drop the BIOS file into `UEFITool NE`.
- Search (`CTRL + F`) for a known setting.

  ![](./images/extraction/1.png)

- Double-click the reference to `Setup/PE32 image section` at the bottom.

  ![](./images/extraction/2.png)

- Extract `PE32 image section` `as is`.

  ![](./images/extraction/3.png)

- Move `ifrextractor.exe` to the current folder, open the command line inside and convert the `.sct` file you just extracted.

  ```
  ifrextractor.exe "Section_PE32_image_Setup_Setup.sct" verbose
  ```

  ![](./images/extraction/4.png)

- Scroll down inside the currently expanded section and find `AMITSE` and `setupdata` (sometimes both required files are under `AMITSE`). Extract `PE32 image section` `as is` and `setupdata` as `body`.

  ![](./images/extraction/5.png)
  ![](./images/extraction/6.png)

- Upload the 4 files to the `UEFI Editor` page.

  ![](./images/extraction/7.png)

## Using the UEFI Editor GUI

- ### Navigation
  - Dotted underlined text has references to Forms and can be clicked.
- ### Menu

  - You can change the target Form of top-level references here. This is useful for UEFIs that have a custom `Advanced` Form.

    ![](./images/usage/1.png)
    ![](./images/usage/2.jpg)

  - E.g. on MSI boards you can replace `OC Profiles` with `Advanced` (child of `Setup`) to gain access to a lot of Forms that are otherwise inaccessible due to missing references while still retaining access to `OC Profiles`. Press `ESC` after selecting `OC Profiles` to access `Setup`.

- ### Item visibility control

  - If one method doesn't work, try the other one. Using both at the same time can cause issues. It varies from UEFI to UEFI.
  - #### Suppress If

    - A `Suppress If` opcode hides nested items if the condition is true. The presence of a `Suppress If` opcode doesn't always mean the condition is true. However, if it is, you can remove the suppression by unchecking the offset.

      ![](./images/usage/3.png)

  - #### Access level

    - Another method of controlling item visibility is changing the access level. `05` usually works. [Here is a forum post by Lost_N_BIOS with possible access level values](https://winraid.level1techs.com/t/request-maximus-xi-hero-unlock-amibcp/33743/4) (`CTRL + F` `05/Yes`).

      ![](./images/usage/4.png)

## Inserting modified files

- Press the `UEFI Files` download button to download the modified files and the change log.
- To find the correct sections in `UEFITool 0.28.0` you can search for `File GUID`s you copy from `UEFITool NE`.
- Replace files the same way you extracted them: `Extract as is` -> `Replace as is` and `Extract body` -> `Replace body`

  Example for `Setup/PE32 image section`:

  `UEFITool NE`:

  ![](./images/insertion/1.png)

  `UEFITool 0.28.0`:

  ![](./images/insertion/2.png)
  ![](./images/insertion/3.png)

- Save the modifications.

  ![](./images/insertion/4.png)

---

The section below is unrelated to the above tool.

---

# How to change hidden settings without flashing a modded BIOS

## Preparation

Download [datasone's modded shell](https://github.com/datasone/grub-mod-setup_var/releases) and rename it to `BOOTX64.EFI`.

Format a USB drive as `FAT32` and move `BOOTX64.EFI` to `USB:\EFI\BOOT\` (create the folders `EFI` and `BOOT` manually). The final path of the shell will be `USB:\EFI\BOOT\BOOTX64.EFI`.

Download your **_current_** BIOS version from the motherboard vendor's site. The structure changes across different versions, so make sure you have the **_same_** BIOS.

Follow [these instructions](#extracting-the-necessary-files) until and including the conversion with `ifrextractor.exe`.

Disable `Secure Boot` and `CSM` and boot from the USB drive in UEFI mode.

## Example

```
VarStore Guid: B08F97FF-E6E8-4193-A997-5E9E9B0ADB32, VarStoreId: 0x2, Size: 0x3C1, Name: "CpuSetup" { 24 1F FF 97 8F B0 E8 E6 93 41 A9 97 5E 9E 9B 0A DB 32 02 00 C1 03 43 70 75 53 65 74 75 70 00 }
```

```
OneOf Prompt: "Intel C-State", Help: "[...]", QuestionFlags: 0x10, QuestionId: 0x1EB, VarStoreId: 0x2, VarOffset: 0x14, Flags: 0x10, Size: 8, Min: 0x0, Max: 0x2, Step: 0x0 { 05 91 00 11 01 11 EB 01 02 00 14 00 10 10 00 02 00 }
	OneOfOption Option: "Auto" Value: 2, Default, MfgDefault { 09 07 06 00 30 00 02 }
	OneOfOption Option: "Enabled" Value: 1 { 09 07 03 00 00 00 01 }
	OneOfOption Option: "Disabled" Value: 0 { 09 07 04 00 00 00 00 }
End  { 29 02 }
```

`Size` (not the `VarStore` size) is shown in bits.  
`Value` is a decimal.

### [Syntax](https://github.com/datasone/grub-mod-setup_var#setup_var_cv) (READ THIS)

#### Writing

```
setup_var_cv VarStoreName VarOffset Size(bytes) Value(hexadecimal)
```

```
setup_var_cv CpuSetup 0x14 0x1 0x0
```

#### Reading

```
setup_var_cv VarStoreName VarOffset Size(bytes)
```

```
setup_var_cv CpuSetup 0x14 0x1
```

### Miscellaneous

To exit and reboot, type:

```
reboot
```

---

Workarounds for various issues (e.g. multiple `Setup` `VarStores`): [legacy commands](https://github.com/datasone/grub-mod-setup_var#legacy-commands)

---

If something unexpected happens, force shutdown and reset CMOS.
