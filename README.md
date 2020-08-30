After converting with LongSoft's Universal IFR Extractor, rename the output to a.txt, move it to the folder containing this script and run the script.

Compatible with:
> https://github.com/LongSoft/UEFITool/releases  
> https://github.com/LongSoft/Universal-IFR-Extractor/releases  
> https://github.com/datasone/grub-mod-setup_var/issues/5#issuecomment-612967491 (variable name = VarStore)  
> https://ftp.gnu.org/gnu/grub/  

Make sure to use datasone's updated shell: https://github.com/datasone/grub-mod-setup_var/files/4470388/modGRUBShellCustomVarName.zip  

Download your current BIOS version from the motherboard vendor’s site.

Import it with the non-A branch of UEFITool. If the file is not detected due to missing file extension, drag it into UEFItool or add .rom to the end. Press CTRL + F and perform a text search for the desired setting. Double-click the reference to the section at the bottom, right-click the section and press “Extract as is...”.

Convert the extracted file with IRFExtractor. Convert it further with my script.

Search for the setting you want to change and write down the VarOffset, Value and VarStore name.

Download GRUB for Windows. Format an USB stick as FAT32. E is the drive letter of the FAT32 formatted USB drive (change if necessary). Open CMD in the GRUB directory and type:  
*grub-install.exe --boot-directory=E:\ --efi-directory=E: --removable --target=x86_64-efi*

Download the modded GRUB. Rename it to *BOOTX64.EFI* and replace the original file on the USB drive.

Disable Secure Boot and boot into GRUB in UEFI mode (CSM disabled).

Using datasone’s shell, in the GRUB command interface, type:  
*setup_var VarOffset Value VarStoreName* (e.g. *setup_var 0x1241 0x1 Setup*)

Then type:  
*reboot*

To obtain the current value without changing it, replace it with “read” (e.g. *setup_var 0x1241 read Setup*).

If *setup_var* doesn’t work, try with *setup_var_3*.