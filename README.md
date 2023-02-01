# Aptio V UEFI Editor (AMIBCP alternative)

## https://boringboredom.github.io/UEFI-Editor/

![](./images/showcase/1.png)
![](./images/showcase/2.png)

# Usage guide

## Prerequisites

- [UEFITool NE](https://github.com/LongSoft/UEFITool/releases) (press **Show all 14 assets**)
- [UEFITool 0.28.0](https://github.com/LongSoft/UEFITool/releases/tag/0.28.0) ([why?](https://github.com/LongSoft/UEFITool#known-issues))
- [IFR Extractor](https://github.com/LongSoft/IFRExtractor-RS/releases)
- [UEFI Editor](https://boringboredom.github.io/UEFI-Editor/)

## Extracting the necessary files

- Drag and drop the BIOS file into **_UEFITool NE_**.
- Search (CTRL + F) for a known setting.

  ![](./images/extraction/1.png)

- Double-click the reference to **_Setup/PE32 image section_** at the bottom.

  ![](./images/extraction/2.png)

- Extract **_PE32 image section_** "**_as is_**".

  ![](./images/extraction/3.png)

- Move **_ifrextractor.exe_** to the current folder, open the command line inside and convert the .sct file you just extracted: **_ifrextractor.exe "Section_PE32_image_Setup_Setup.sct" verbose_**

  ![](./images/extraction/4.png)

- Scroll down inside the currently expanded section and find **_AMITSE_** and **_setupdata_** (sometimes both required files are under **_AMITSE_**). Extract **_PE32 image section_** "**_as is_**" and **_setupdata_** as "**_body_**".

  ![](./images/extraction/5.png)
  ![](./images/extraction/6.png)

- Upload the 4 files to the **_UEFI Editor_** page.

  ![](./images/extraction/7.png)

## Using the UEFI Editor GUI

- ### Navigation
  - Dotted underlined text has references to Forms and can be clicked.
- ### Menu

  - You can change the target Form of top-level references here. This is useful for UEFIs that have a custom **_Advanced_** Form.

    ![](./images/usage/1.png)
    ![](./images/usage/2.jpg)

  - E.g. on MSI boards you can replace **_OC Profiles_** with **_Advanced_** (child of **_Setup_**) to gain access to a lot of Forms that are otherwise inaccessible due to missing references while still retaining access to **_OC Profiles_**. Press **_ESC_** after selecting **_OC Profiles_** to access **_Setup_**.

- ### Item visibility control

  - If one method doesn't work, try the other one. Using both at the same time can cause issues. It varies from UEFI to UEFI.
  - #### Suppress If

    - A **_Suppress If_** opcode hides nested items if the condition is true. The presence of a **_Suppress If_** opcode doesn't always mean the condition is true. However, if it is, you can remove the suppression by unchecking the offset.

      ![](./images/usage/3.png)

  - #### Access level

    - Another method of controlling item visibility is changing the access level. **_05_** usually works. [Here is a forum post by Lost_N_BIOS with possible access level values](https://winraid.level1techs.com/t/request-maximus-xi-hero-unlock-amibcp/33743/4) (CTRL + F **_05/Yes_**).

      ![](./images/usage/4.png)

## Inserting modified files

- Press the **_UEFI Files_** download button to download the modified files and the change log.
- To find the correct sections in **_UEFITool 0.28.0_** you can search for **_File GUID_** s you copy from **_UEFITool NE_**.
- Replace files the same way you extracted them: **_Extract as is_** -> **_Replace as is_** and **_Extract body_** -> **_Replace body_**

  Example for **_Setup/PE32 image section_**:

  **_UEFITool NE_**:  
  ![](./images/insertion/1.png)

  **_UEFITool 0.28.0_**:  
  ![](./images/insertion/2.png)
  ![](./images/insertion/3.png)

- Save the modifications.

  ![](./images/insertion/4.png)

---

The section below is unrelated to the above tool.

---

# How to change hidden settings without flashing a modded BIOS

## Preparation

Download [datasone's modded shell](https://github.com/datasone/grub-mod-setup_var/releases) and rename it to **_BOOTX64.EFI_**.

Format a USB drive as FAT32 and put **_BOOTX64.EFI_** in **_USB:\EFI\BOOT\\_** (create the folders **_EFI_** and **_BOOT_** manually). The final path of the shell will be **_USB:\EFI\BOOT\BOOTX64.EFI_**.

Download your **current** BIOS version from the motherboard vendor's site. Offsets change across different versions, so make sure you have the **same** BIOS.

Drag and drop it into [UEFITool](https://github.com/LongSoft/UEFITool/releases). Press CTRL + F and perform a **_Text_** search for any setting. Double-click the reference to the section at the bottom, right-click the section (usually under **_Setup_**) and press **_Extract as is..._**.

Convert the extracted file with [IRFExtractor](https://github.com/LongSoft/Universal-IFR-Extractor/releases). Optionally, rename the output to **_a.txt_**, move it to the folder containing [this script](https://github.com/BoringBoredom/IFR-Formatter/releases) and run it.

Disable Secure Boot and boot from the USB drive in UEFI mode (CSM disabled). You can enable CSM again after you're done.

## Example

### Inside _a.txt_

```
VarStore: VarStoreId: 0x7 [4570B7F1-ADE8-4943-8DC3-406472842384], Size: 0x6BF, Name: PchSetup {24 1F F1 B7 70 45 E8 AD 43 49 8D C3 40 64 72 84 23 84 07 00 BF 06 50 63 68 53 65 74 75 70 00}
```

```
One Of: High Precision Timer, VarStoreInfo (VarOffset/VarName): 0x20, VarStore: 0x7, QuestionId: 0x954, Size: 1, Min: 0x0, Max 0x1, Step: 0x0 {05 91 0C 0E 0D 0E 54 09 07 00 20 00 10 10 00 01 00}
        One Of Option: Disabled, Value (8 bit): 0x0 {09 07 04 00 00 00 00}
        One Of Option: Enabled, Value (8 bit): 0x1 (default) {09 07 03 00 30 00 01}
End One Of {29 02}
```

### Inside _b.txt_

```
High Precision Timer | VarStore: PchSetup, VarOffset: 0x20, Size: 0x1
     Disabled: 0x0
     Enabled: 0x1 (default)
```

### [Syntax](https://github.com/datasone/grub-mod-setup_var#setup_var_cv) (READ THIS)

#### Writing

```
setup_var_cv VarStore VarOffset Size Value
```

```
setup_var_cv PchSetup 0x20 0x1 0x0
```

#### Reading

```
setup_var_cv VarStore VarOffset Size
```

```
setup_var_cv PchSetup 0x20 0x1
```

### Miscellaneous

To exit and reboot, type:

```
reboot
```

---

Workarounds for various issues (e.g. multiple Setup VarStores): [legacy commands](https://github.com/datasone/grub-mod-setup_var#legacy-commands)

---

If something unexpected happens, force shutdown and reset CMOS.
