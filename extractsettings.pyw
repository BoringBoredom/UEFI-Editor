import re


total_single_choice_settings = 0
total_numeric_settings = 0
total_string_settings = 0
total_unknown_settings = 0
has_options = False
offsets = []
shared_offsets = []

def check_if_empty_string(string):
    global total_unknown_settings
    if string == " ":
        total_unknown_settings += 1
        return "?"
    else:
        return string[1:]

a = open("a.txt", "r")
b = open("b.txt", "w")
c = open("c.txt", "w")

b.write("WARNING: CHECK THE BOTTOM OF THE TEXT FILE FOR SHARED OFFSETS!!!!!!!!!!\n\n\n\n\n")

for line in a:
    category = re.search(r"Form:(.+), FormId:", line)
    single_choice_setting = re.search(r"One Of:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
    option = re.search(r"One Of Option:(.+), Value \(.+ bit\): (.+) {", line)
    numeric_setting = re.search(r"Numeric:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore: .+ Min: (.+), Max (.+), Step: (.+) {", line)
    string_setting = re.search(r"String:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
    end_of_options = re.search(r"End One Of", line)
    end_of_category = re.search(r"End Form", line)
    if category:
        current_category = check_if_empty_string(category.group(1))
        b.write(f"{current_category}\n\n")
        c.write(f"{current_category}\n\n")
    elif single_choice_setting:
        current_single_choice_setting = check_if_empty_string(single_choice_setting.group(1))
        offsets.append(single_choice_setting.group(2))
        b.write(f"     {current_single_choice_setting}: {single_choice_setting.group(2)}\n")
        c.write(f"     {current_single_choice_setting}\n")
        total_single_choice_settings += 1
        has_options = True
    elif option:
        current_option = check_if_empty_string(option.group(1))
        b.write(f"          {current_option}: {option.group(2)}\n")
        if has_options == False:
            b.write("\n")
    elif numeric_setting:
        current_numeric_setting = check_if_empty_string(numeric_setting.group(1))
        offsets.append(numeric_setting.group(2))
        b.write(f"     {current_numeric_setting}: {numeric_setting.group(2)}\n          Min: {numeric_setting.group(3)}, Max: {numeric_setting.group(4)}, Step: {numeric_setting.group(5)}\n")
        b.write(" " * 120 + current_category + "\n")
        c.write(f"     {current_numeric_setting}\n")
        total_numeric_settings += 1
    elif string_setting:
        current_string_setting = check_if_empty_string(string_setting.group(1))
        offsets.append(string_setting.group(2))
        b.write(f"     {current_string_setting}: {string_setting.group(2)}\n")
        b.write(" " * 120 + current_category + "\n")
        c.write(f"     {current_string_setting}\n")
        total_string_settings += 1
    elif end_of_options:
        b.write(" " * 120 + current_category + "\n")
        has_options = False
    elif end_of_category:
        b.write("\n")
        c.write("\n")

total_settings = total_single_choice_settings + total_numeric_settings + total_string_settings

b.write(f"Total settings: {total_settings}\nTotal single choice settings: {total_single_choice_settings}\nTotal numeric settings: {total_numeric_settings}\nTotal string settings: {total_string_settings}\nTotal unknown settings: {total_unknown_settings}\n")
c.write(f"Total settings: {total_settings}\nTotal single choice settings: {total_single_choice_settings}\nTotal numeric settings: {total_numeric_settings}\nTotal string settings: {total_string_settings}\nTotal unknown settings: {total_unknown_settings}\n")

for offset in offsets:
    if offsets.count(offset) > 1:
        shared_offsets.append(offset)

b.write (f"Total shared offsets: {len(set(shared_offsets))}\n\n")
c.write (f"Total shared offsets: {len(set(shared_offsets))}\n\n")

for offset in set(shared_offsets):
    b.write(f"SHARED OFFSET: {offset}\n")

a.close()
b.close()
c.close()
