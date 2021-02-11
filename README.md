# How to change hidden settings without flashing a modded BIOS
## Prerequisites
https://github.com/LongSoft/UEFITool/releases  
https://github.com/LongSoft/Universal-IFR-Extractor/releases  
https://github.com/datasone/grub-mod-setup_var/issues/5#issuecomment-612967491 (variable name = VarStore name)  
https://github.com/XDleader555/grub_setup_var/releases + https://github.com/XDleader555/grub_setup_var/issues/4#issuecomment-615953345  

## Preparation
Download [datasone's](https://github.com/datasone/grub-mod-setup_var/files/4470388/modGRUBShellCustomVarName.zip) or [XDleader555's](https://github.com/XDleader555/grub_setup_var/releases) modded shell and rename it to ***BOOTX64.EFI***.

Format a USB drive as FAT32 and put ***BOOTX64.EFI*** in ***USB:\EFI\BOOT\\*** (create the folders ***EFI*** and ***BOOT*** manually). The final path of the shell will be ***USB:\EFI\BOOT\BOOTX64.EFI***.

Download your **current** BIOS version from the motherboard vendor's site. Offsets change across different versions, so make sure you have the **same** BIOS.

Drag and drop it into [UEFITool](https://github.com/LongSoft/UEFITool/releases). Press CTRL + F and perform a ***Text*** search for any setting. Double-click the reference to the section at the bottom, right-click the section (usually under ***Setup***) and press ***Extract as is...***.

Convert the extracted file with [IRFExtractor](https://github.com/LongSoft/Universal-IFR-Extractor/releases). Rename the output to ***a.txt***, move it to the folder containing [this script](https://github.com/BoringBoredom/IFR-Formatter/releases) and run it.

Open ***b.txt***, search for the settings you want to change and write down the ***VarOffsets***, ***Values*** and ***VarStore*** names.

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
High Precision Timer | VarOffset: 0x20, VarStore: PchSetup (0x7)
     Disabled: 0x0
     Enabled: 0x1 (default)
```
### Using datasone’s shell
In the GRUB command interface, type:  
***setup_var VarOffset Value VarStoreName*** (e.g. ***setup_var 0x20 0x0 PchSetup***)

To obtain the current value without changing it, replace ***Value*** with ***read*** (e.g. ***setup_var 0x20 read PchSetup***).

If you encounter [this issue](https://github.com/datasone/grub-mod-setup_var/blob/master/README.md#the-problem), use ***setup_var_3***.

To exit and reboot, type:  
***reboot***

### Using XDleader555's shell
In the GRUB command interface, type:  
***setup_var VarStoreName VarOffset Value*** (e.g. ***setup_var PchSetup 0x20 0x0***)

To obtain the current value without changing it, omit ***Value*** (e.g. ***setup_var PchSetup 0x20***).

To exit and reboot, type:  
***reboot***
