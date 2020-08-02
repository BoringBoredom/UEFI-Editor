import re

a = open("a.txt", "r")
b = open("b.txt", "w")
c = open("c.txt", "w")

total_settings = 0
for line in a:
    category = re.search(r"Form: (.+), FormId:", line)
    setting = re.search(r"One Of: (.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
    option = re.search(r"One Of Option:(.+), Value \(\d{1,2} bit\): (.+) {", line)
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
