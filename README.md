Modern BIOS Setup is often split across multiple DXE modules, so a single workflow may touch several related binaries in sequence. The defect was caused by FileUpload reusing a stale `setupdata` cache: a newly uploaded `setupdata-A.bin` could be ignored, and when `setupdata-B.bin` was later generated after modifying another Setup module, only the latest module changes remained while earlier Setup edits were silently lost. The fix removes cache reuse and forces every upload to be re-read and re-parsed, ensuring multi-module changes remain consistent across successive uploads.

Modern BIOS setups are typically not implemented as a single monolithic module, but are instead distributed across multiple DXE drivers. Each module—such as Setup, SocketSetup, Platform, ServerMgmtSetup, NvmeDynamicSetup, PciOutOfResourceSetupPage, and ReFlash—owns its own PE32 image and IFR description, and contributes a portion of the overall configuration UI and variable logic. Although these modules appear independent, they are tightly coupled through shared NVRAM variables, form/question references, and a unified setupdata generation pipeline.



> 现代 BIOS 的 Setup 逻辑常分散于多个 DXE 模块，导致同一轮交互中会先后处理多个相关二进制。当前缺陷在于 FileUpload 复用了旧的 `setupdata` 缓存，新上传的 `setupdata-A.bin` 未被重新解析，后续再传入其他 Setup 组件时，生成的 `setupdata-B.bin` 只反映最新组件变更，先前对 Setup 的修改被静默覆盖。修复方式是取消缓存复用，强制每次以上传文件重新构建解析输入，确保多模块修改在跨轮上传后仍保持一致生效。
>
> 现代 BIOS 的 Setup 逻辑通常并非集中实现，而是按功能拆分到多个 DXE 模块中分别维护，例如 Setup、SocketSetup、Platform、FpgaSocketSetup、ServerMgmtSetup、NvmeDynamicSetup、PciOutOfResourceSetupPage、ReFlash、FboGroupForm等。每个模块往往对应独立的 PE32/IFR 资源和变量布局，分别承载不同硬件域、策略域和平台特性，因此表面上是多个独立的配置页面，底层却共享同一套 NVRAM 变量、Form/Question 关联关系以及 setupdata 生成链路。

------


# [Aptio V UEFI Editor](https://boringboredom.github.io/UEFI-Editor/)

![](./images/showcase/1.png)
![](./images/showcase/2.png)

# Usage guide

## Prerequisites

- [UEFITool NE](https://github.com/LongSoft/UEFITool/releases) (press `Show all assets`)
- [UEFITool 0.28.0](https://github.com/LongSoft/UEFITool/releases/tag/0.28.0) ([why?](https://github.com/LongSoft/UEFITool#known-issues))
- [IFRExtractor-RS](https://github.com/LongSoft/IFRExtractor-RS/releases)
- [UEFI Editor](https://boringboredom.github.io/UEFI-Editor/)

## Extracting the necessary files

- Drag and drop the BIOS file into `UEFITool NE`.
- Search (`CTRL + F`) for a known setting.

  ![](./images/extraction/1.png)

- Double-click the reference to `Setup/PE32 image section` at the bottom.

  ![](./images/extraction/2.png)

- Extract `PE32 image section` `as is`.

  ![](./images/extraction/3.png)

- Move `ifrextractor.exe` to the current folder, open the CLI inside and convert the `.sct` file you just extracted.

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

  - E.g. on MSI boards, you can replace `OC Profiles` with `Advanced` (child of `Setup`) to gain access to a lot of Forms that are otherwise inaccessible due to missing references while still retaining access to `OC Profiles`. Press `ESC` after selecting `OC Profiles` to access `Setup`.

- ### Item visibility control

  - Make sure the parent forms are visible when targeting a setting. Use the top-right navigation to travel upwards.
  - If one method doesn't work, try the other one. Using both at the same time can cause issues. It varies from UEFI to UEFI. Try modifying `Access Level` first.
  - #### Suppress If

    - A `Suppress If` opcode hides nested items if the condition is true. The presence of a `Suppress If` opcode doesn't always mean the condition is true. However, if it is, you can remove the suppression by unchecking the offset.

      ![](./images/usage/3.png)

  - #### Access level

    - Another method of controlling item visibility is changing the access level. `05` usually works. A different value does not necessarily mean it's hidden. [Here is a forum post by Lost_N_BIOS with possible access level values](https://winraid.level1techs.com/t/request-maximus-xi-hero-unlock-amibcp/33743/4) (`CTRL + F` `05/Yes`).

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

Follow [these instructions](#extracting-the-necessary-files) until and including the conversion with `ifrextractor.exe`. If there are two `Setup` sections, use the one that has matching offsets (change settings in BIOS and read values with datasone's shell to confirm).

Optionally, download [IFR-Formatter.js](https://raw.githubusercontent.com/BoringBoredom/UEFI-Editor/master/IFR-Formatter/IFR-Formatter.js) (right-click and `Save link as...`) and [node.exe](https://nodejs.org/dist/latest/win-x64/node.exe). Place them in the same folder as the IFR Extractor output and execute `node IFR-Formatter.js yourIfrExtractorOutput.txt` in the CLI.

Disable `Secure Boot` and `CSM` and boot from the USB drive in UEFI mode.

## Example

### IFR Extractor output

```
OneOf Prompt: "Intel C-State", Help: "[...]", QuestionFlags: [...], QuestionId: [...], VarStoreId: 0x2, VarOffset: 0x14, Flags: [...], Size: 8, Min: [...], Max: [...], Step: [...] { [...] }
	OneOfOption Option: "Auto" Value: 2, Default, MfgDefault { [...] }
	OneOfOption Option: "Enabled" Value: 1 { [...] }
	OneOfOption Option: "Disabled" Value: 0 { [...] }
End  { 29 02 }
```

`Size` is a decimal in bits. Convert it to a hexadecimal in bytes.  
`Value` is a decimal. Convert it to a hexadecimal.

Search for the `VarStoreId` to find the `VarStoreName`.

```
VarStore Guid: [...], VarStoreId: 0x2, Size: [...], Name: "CpuSetup" { [...] }
```

### IFR-Formatter.js output

```
Intel C-State | VarStore: CpuSetup | VarOffset: 0x14 | Size: 0x1
    Auto: 0x2
    Enabled: 0x1
    Disabled: 0x0
```

### [Syntax](https://github.com/datasone/grub-mod-setup_var#setup_var_cv) (READ THIS)

#### Writing

```
setup_var_cv VarStoreName VarOffset Size Value
```

```
setup_var_cv CpuSetup 0x14 0x1 0x0
```

#### Reading

```
setup_var_cv VarStoreName VarOffset Size
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
