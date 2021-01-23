# How to change hidden settings without flashing a modded BIOS
## Prerequisites
https://github.com/LongSoft/UEFITool/releases  
https://github.com/LongSoft/Universal-IFR-Extractor/releases  
https://github.com/datasone/grub-mod-setup_var/issues/5#issuecomment-612967491 (variable name = VarStore)  
https://github.com/XDleader555/grub_setup_var/releases + https://github.com/XDleader555/grub_setup_var/issues/4#issuecomment-615953345  

## Preparation
Download [datasone's](https://github.com/datasone/grub-mod-setup_var/files/4470388/modGRUBShellCustomVarName.zip) or [XDleader555's](https://github.com/XDleader555/grub_setup_var/releases) modded shell and rename it to ***BOOTX64.EFI***.

Format a USB drive as FAT32 and put ***BOOTX64.EFI*** in ***USB:\EFI\BOOT\\*** (create the folders ***EFI*** and ***BOOT*** manually). The final path of the shell will be ***USB:\EFI\BOOT\BOOTX64.EFI***.

Download your current BIOS version from the motherboard vendor’s site.

Drag and drop it into [UEFITool](https://github.com/LongSoft/UEFITool/releases). Press CTRL + F and perform a ***Text*** search for any setting. Double-click the reference to the section at the bottom, right-click the section (usually under ***Setup***) and press ***Extract as is...***.

Convert the extracted file with [IRFExtractor](https://github.com/LongSoft/Universal-IFR-Extractor/releases). Rename the output to ***a.txt***, move it to the folder containing [this script](https://github.com/BoringBoredom/IFR-Formatter/releases) and run it.

Open ***b.txt***, search for the settings you want to change and write down the ***VarOffsets***, ***Values*** and ***VarStore*** names.

Disable Secure Boot and boot from the USB drive in UEFI mode (CSM disabled). You can enable CSM again after you're done.

## Using datasone’s shell
In the GRUB command interface, type:  
***setup_var VarOffset Value VarStoreName*** (e.g. ***setup_var 0x1241 0x1 Setup***)

To obtain the current value without changing it, replace ***Value*** with ***read*** (e.g. ***setup_var 0x1241 read Setup***).

If you encounter [this issue](https://github.com/datasone/grub-mod-setup_var/blob/master/README.md#the-problem), use ***setup_var_3***.

To exit and reboot, type:  
***reboot***

## Using XDleader555's shell
In the GRUB command interface, type:  
***setup_var VarStoreName VarOffset Value*** (e.g. ***setup_var Setup 0x1241 0x1***)

To obtain the current value without changing it, omit ***Value*** (e.g. ***setup_var Setup 0x1241***).

To exit and reboot, type:  
***reboot***
