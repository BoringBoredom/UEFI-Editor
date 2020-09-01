import re, requests

current_version = 0.11

try:
    r = requests.get("https://api.github.com/repos/BoringBoredom/extractsettings/releases/latest")
    new_version = float(r.json()["tag_name"])
    if new_version > current_version:
        with open("NEW VERSION AVAILABLE.txt", "w") as d:
            d.write(f"{new_version} available at https://github.com/BoringBoredom/extractsettings/releases/latest. Your current version is {current_version}")
except:
    pass

total_oneof_settings = 0
total_numeric_settings = 0
total_string_settings = 0
total_checkbox_settings = 0
total_unknown_settings = 0
total_shared_offsets = 0
has_options = False
offsets = {}
varstores = {}

def check_for_unknown_setting(string):
    global total_unknown_settings
    if string == " " or string == " N/A":
        total_unknown_settings += 1
        return "?"
    return string[1:]

def gather_offsets(setting, offset):
    if offsets.get(offset, False) == False:
        offsets[offset] = []
    offsets[offset].append(setting)

def appendix(setting):
    b.write(" " * 120 + current_category + "\n")
    c.write(f"     {setting}\n")

a = open("a.txt", "r", errors="ignore")
b = open("b.txt", "w", errors="ignore")
c = open("c.txt", "w", errors="ignore")

b.write("WARNING: USE A SHELL ALLOWING YOU TO SPECIFY VARSTORE OTHERWISE YOU RISK BRICKING YOUR SYSTEM DUE TO SHARED OFFSETS!\nWARNING: USE A SHELL ALLOWING YOU TO SPECIFY VARSTORE OTHERWISE YOU RISK BRICKING YOUR SYSTEM DUE TO SHARED OFFSETS!\nWARNING: USE A SHELL ALLOWING YOU TO SPECIFY VARSTORE OTHERWISE YOU RISK BRICKING YOUR SYSTEM DUE TO SHARED OFFSETS!\n\n")

for line in a:
    varstore = re.search(r"VarStoreId: (.+) \[.+ Name: (.+) {", line)
    category = re.search(r"Form:(.+), FormId:", line)
    oneof_setting = re.search(r"One Of:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore: (.+), QuestionId:", line)
    option = re.search(r"One Of Option:(.+), Value \(.+ bit\): (.+) {", line)
    numeric_setting = re.search(r"Numeric:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore: (.+), QuestionId: .+ Min: (.+), Max (.+), Step: (.+) {", line)
    string_setting = re.search(r"String:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore: (.+), QuestionId:", line)
    checkbox_setting = re.search(r"Checkbox:(.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore: (.+), QuestionId:", line)
    end_of_options = re.search(r"End One Of", line)
    end_of_category = re.search(r"End Form", line)
    if varstore:
        varstores[varstore.group(1)] = varstore.group(2)
    elif category:
        current_category = check_for_unknown_setting(category.group(1))
        b.write(f"{current_category}\n\n")
        c.write(f"{current_category}\n\n")
    elif oneof_setting:
        current_oneof_setting = check_for_unknown_setting(oneof_setting.group(1))
        gather_offsets(current_oneof_setting, oneof_setting.group(2))
        b.write(f"     {current_oneof_setting} | VarOffset: {oneof_setting.group(2)}, VarStore: {varstores[oneof_setting.group(3)]} ({oneof_setting.group(3)})\n")
        c.write(f"     {current_oneof_setting}\n")
        total_oneof_settings += 1
        has_options = True
    elif option:
        current_option = check_for_unknown_setting(option.group(1))
        b.write(f"          {current_option}: {option.group(2)}\n")
        if has_options == False:
            b.write("\n")
    elif numeric_setting:
        current_numeric_setting = check_for_unknown_setting(numeric_setting.group(1))
        gather_offsets(current_numeric_setting, numeric_setting.group(2))
        b.write(f"     {current_numeric_setting} | VarOffset: {numeric_setting.group(2)}, VarStore: {varstores[numeric_setting.group(3)]} ({numeric_setting.group(3)})\n          Min: {numeric_setting.group(4)}, Max: {numeric_setting.group(5)}, Step: {numeric_setting.group(6)}\n")
        appendix(current_numeric_setting)
        total_numeric_settings += 1
    elif string_setting:
        current_string_setting = check_for_unknown_setting(string_setting.group(1))
        gather_offsets(current_string_setting, string_setting.group(2))
        b.write(f"     {current_string_setting} | VarOffset: {string_setting.group(2)}, Varstore: {varstores[string_setting.group(3)]} ({string_setting.group(3)})\n")
        appendix(current_string_setting)
        total_string_settings += 1
    elif checkbox_setting:
        current_checkbox_setting = check_for_unknown_setting(checkbox_setting.group(1))
        gather_offsets(current_checkbox_setting, checkbox_setting.group(2))
        b.write(f"     {current_checkbox_setting} | VarOffset: {checkbox_setting.group(2)}, Varstore: {varstores[checkbox_setting.group(3)]} ({checkbox_setting.group(3)})\n")
        appendix(current_checkbox_setting)
        total_checkbox_settings += 1
    elif end_of_options:
        b.write(" " * 120 + current_category + "\n")
        has_options = False
    elif end_of_category:
        b.write("\n")
        c.write("\n")

b.write(f"\nShared offsets:\n\n")

for offset, settings in offsets.items():
    settings = set(settings)
    if len(settings) > 1:
        total_shared_offsets += 1
        b.write(f"{offset}: ")
        entry_count = 1
        are_unknown = False
        temp_settings = []
        for setting in settings:
            if setting != "?":
                temp_settings.append(setting)
            else:
                are_unknown = True
        for entry in temp_settings:
            b.write(entry)
            if entry_count < len(temp_settings):
                b.write(" | ")
                entry_count += 1
        if are_unknown == True:
            b.write(f" | 1 or more unknown settings")
        b.write("\n")

total_settings = total_oneof_settings + total_numeric_settings + total_string_settings + total_checkbox_settings

b.write(f"\n\nTotal settings: {total_settings}\nTotal one of settings: {total_oneof_settings}\nTotal numeric settings: {total_numeric_settings}\nTotal string settings: {total_string_settings}\nTotal checkbox settings: {total_checkbox_settings}\nTotal unknown settings: {total_unknown_settings}\nTotal shared offsets: {total_shared_offsets}\n")
c.write(f"\n\nTotal settings: {total_settings}\nTotal one of settings: {total_oneof_settings}\nTotal numeric settings: {total_numeric_settings}\nTotal string settings: {total_string_settings}\nTotal checkbox settings: {total_checkbox_settings}\nTotal unknown settings: {total_unknown_settings}\nTotal shared offsets: {total_shared_offsets}\n")

a.close()
b.close()
c.close()