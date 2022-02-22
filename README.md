# Aptio V UEFI Editor
https://boringboredom.github.io/UEFI-Editor/

---

# How to change hidden settings without flashing a modded BIOS
## Preparation
Download [XDleader555's](https://github.com/XDleader555/grub_setup_var/releases) or [datasone's](https://github.com/datasone/grub-mod-setup_var/releases) modded shell and rename it to ***BOOTX64.EFI***.

Format a USB drive as FAT32 and put ***BOOTX64.EFI*** in ***USB:\EFI\BOOT\\*** (create the folders ***EFI*** and ***BOOT*** manually). The final path of the shell will be ***USB:\EFI\BOOT\BOOTX64.EFI***.

Download your **current** BIOS version from the motherboard vendor's site. Offsets change across different versions, so make sure you have the **same** BIOS.

Drag and drop it into [UEFITool](https://github.com/LongSoft/UEFITool/releases). Press CTRL + F and perform a ***Text*** search for any setting. Double-click the reference to the section at the bottom, right-click the section (usually under ***Setup***) and press ***Extract as is...***.

Convert the extracted file with [IRFExtractor](https://github.com/LongSoft/Universal-IFR-Extractor/releases). Rename the output to ***a.txt***, move it to the folder containing [this script](https://github.com/BoringBoredom/IFR-Formatter/releases) and run it.

Disable Secure Boot and boot from the USB drive in UEFI mode (CSM disabled). You can enable CSM again after you're done.

## Example
### Inside *a.txt*
```
VarStore: VarStoreId: 0x7 [4570B7F1-ADE8-4943-8DC3-406472842384], Size: 0x6BF, Name: PchSetup {24 1F F1 B7 70 45 E8 AD 43 49 8D C3 40 64 72 84 23 84 07 00 BF 06 50 63 68 53 65 74 75 70 00}
```
```
One Of: High Precision Timer, VarStoreInfo (VarOffset/VarName): 0x20, VarStore: 0x7, QuestionId: 0x954, Size: 1, Min: 0x0, Max 0x1, Step: 0x0 {05 91 0C 0E 0D 0E 54 09 07 00 20 00 10 10 00 01 00}
        One Of Option: Disabled, Value (8 bit): 0x0 {09 07 04 00 00 00 00}
        One Of Option: Enabled, Value (8 bit): 0x1 (default) {09 07 03 00 30 00 01}
End One Of {29 02}
```
### Inside *b.txt*
```
High Precision Timer | VarStore: PchSetup, VarOffset: 0x20, Size: 0x1
     Disabled: 0x0
     Enabled: 0x1 (default)
```
### [XDleader555's syntax](https://github.com/XDleader555/grub_setup_var#usage) (READ THIS)
#### Writing
```
setup_var VarStore VarOffset Value
```
```
setup_var PchSetup 0x20 0x0
```
#### Reading
```
setup_var VarStore VarOffset
```
```
setup_var PchSetup 0x20
```
### [datasone's syntax](https://github.com/datasone/grub-mod-setup_var#setup_var_cv) (READ THIS)
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
Workarounds for various issues (e.g. multiple Setup VarStores): [datasone's legacy commands](https://github.com/datasone/grub-mod-setup_var#legacy-commands)

---
If something unexpected happens, force shutdown and reset CMOS.