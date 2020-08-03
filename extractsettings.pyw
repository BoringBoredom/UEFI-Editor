import re

a = open("a.txt", "r")
b = open("b.txt", "w")
c = open("c.txt", "w")

total_settings = 0
for line in a:
    category = re.search(r"Form: (.+), FormId:", line)
    setting = re.search(r"One Of: (.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
    option = re.search(r"One Of Option:(.+), Value \(.+ bit\): (.+) {", line)
    numeric_setting = re.search(r"Numeric: (.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore: .+ Min: (.+), Max (.+), Step: (.+) {", line)
    string_setting = re.search(r"String: (.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
    end_of_options = re.search(r"End One Of", line)
    end_of_category = re.search(r"End Form", line)
    if category:
        b.write(f"{category.group(1)}\n\n")
        c.write(f"{category.group(1)}\n\n")
        current_category = category.group(1)
    if setting:
        b.write(f"     {setting.group(1)}: {setting.group(2)}\n")
        c.write(f"     {setting.group(1)}\n")
        total_settings += 1
    if option:
        b.write(f"         {option.group(1)}: {option.group(2)}\n")
    if numeric_setting:
        b.write(f"     {numeric_setting.group(1)}: {numeric_setting.group(2)}\n          Min: {numeric_setting.group(3)}, Max: {numeric_setting.group(4)}, Step: {numeric_setting.group(5)}\n")
        b.write(" " * 120 + current_category + "\n")
        c.write(f"     {numeric_setting.group(1)}\n")
        total_settings += 1
    if string_setting:
        b.write(f"     {string_setting.group(1)}: {string_setting.group(2)}\n")
        b.write(" " * 120 + current_category + "\n")
        c.write(f"     {string_setting.group(1)}\n")
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
