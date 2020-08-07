import re

a = open("a.txt", "r")
b = open("b.txt", "w")
c = open("c.txt", "w")

total_settings = 0
for line in a:
    category = re.search(r"Form:(.+), FormId:", line)
    setting = re.search(r"One Of:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
    option = re.search(r"One Of Option:(.+), Value \(.+ bit\): (.+) {", line)
    numeric_setting = re.search(r"Numeric:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore: .+ Min: (.+), Max (.+), Step: (.+) {", line)
    string_setting = re.search(r"String:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
    end_of_options = re.search(r"End One Of", line)
    end_of_category = re.search(r"End Form", line)
    if category:
        if category.group(1) == " ":
            current_category = " ?"
        else:
            current_category = category.group(1)
        b.write(f"{current_category[1:]}\n\n")
        c.write(f"{current_category[1:]}\n\n")
    if setting:
        if setting.group(1) == " ":
            current_setting = " ?"
        else:
            current_setting = setting.group(1)
        b.write(f"    {current_setting}: {setting.group(2)}\n")
        c.write(f"    {current_setting}\n")
        total_settings += 1
    if option:
        if option.group(1) == " ":
            current_option = " ?"
        else:
            current_option = option.group(1)
        b.write(f"         {current_option}: {option.group(2)}\n")
    if numeric_setting:
        if numeric_setting.group(1) == " ":
            current_numeric_setting = " ?"
        else:
            current_numeric_setting = numeric_setting.group(1)
        b.write(f"    {current_numeric_setting}: {numeric_setting.group(2)}\n          Min: {numeric_setting.group(3)}, Max: {numeric_setting.group(4)}, Step: {numeric_setting.group(5)}\n")
        b.write(" " * 120 + current_category + "\n")
        c.write(f"    {current_numeric_setting}\n")
        total_settings += 1
    if string_setting:
        if string_setting.group(1) == " ":
            current_string_setting = " ?"
        else:
            current_string_setting = string_setting.group(1)
        b.write(f"    {current_string_setting}: {string_setting.group(2)}\n")
        b.write(" " * 120 + current_category + "\n")
        c.write(f"    {current_string_setting}\n")
        total_settings += 1
    if end_of_options:
        b.write(" " * 120 + current_category + "\n")
    if end_of_category:
        b.write("\n")
        c.write("\n")

b.write(f"Total settings: {total_settings}")
c.write(f"Total settings: {total_settings}")
a.close()
b.close()
c.close()
