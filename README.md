# How to change hidden settings without flashing a modded BIOS
Compatible with:
> https://github.com/LongSoft/UEFITool/releases  
> https://github.com/LongSoft/Universal-IFR-Extractor/releases  
> https://github.com/datasone/grub-mod-setup_var/issues/5#issuecomment-612967491 (variable name = VarStore)  
> https://ftp.gnu.org/gnu/grub/  

**Make sure to use datasone's updated shell:**
> https://github.com/datasone/grub-mod-setup_var/files/4470388/modGRUBShellCustomVarName.zip  

Download [GRUB for Windows](https://ftp.gnu.org/gnu/grub/). Format a USB drive as FAT32. *E* is the drive letter of the FAT32 formatted USB drive (change if necessary). Open CMD in the GRUB directory and paste:  
*grub-install.exe --boot-directory=E:\ --efi-directory=E: --removable --target=x86_64-efi*

Download the [modded shell](https://github.com/datasone/grub-mod-setup_var/files/4470388/modGRUBShellCustomVarName.zip). Rename it to *BOOTX64.EFI* and replace the original file on the USB drive.

Download your current BIOS version from the motherboard vendor’s site.

Drag and drop it into [UEFItool](https://github.com/LongSoft/UEFITool/releases). Press CTRL + F and perform a text search for any setting. Double-click the reference to the section at the bottom, right-click the section and press “Extract as is...”.

Convert the extracted file with [IRFExtractor](https://github.com/LongSoft/Universal-IFR-Extractor/releases). Rename the output to *a.txt*, move it to the folder containing this script and run the script.

Search for the settings you want to change and write down the VarOffsets, Values and VarStore names.

Disable Secure Boot and boot into GRUB in UEFI mode (CSM disabled). You can enable CSM again after you're done.

Using datasone’s shell, in the GRUB command interface, type:  
*setup_var VarOffset Value VarStoreName* (e.g. *setup_var 0x1241 0x1 Setup*)

Then type:  
*reboot*

To obtain the current value without changing it, replace it with “read” (e.g. *setup_var 0x1241 read Setup*).

If *setup_var* doesn’t work, try *setup_var_3*.

Alternative modded shell (**uses different syntax**):
> https://github.com/XDleader555/grub_setup_var/issues/4#issuecomment-615953345
