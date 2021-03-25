import re, requests

current_version = 0.12

try:
    r = requests.get("https://api.github.com/repos/BoringBoredom/IFR-Formatter/releases/latest")
    new_version = float(r.json()["tag_name"])
    if new_version > current_version:
        with open("NEW VERSION AVAILABLE.txt", "w") as d:
            d.write(f"{new_version} available at https://github.com/BoringBoredom/IFR-Formatter/releases/latest. Your current version is {current_version}")
except:
    pass

total_one_of = 0
total_numeric = 0
total_string = 0
total_checkbox = 0
has_options = False
varstores = {}

def check_unknown(string):
    if string == "" or string == "N/A":
        return "?"
    else:
        return string

def append_category():
    b.write(" " * 120 + current_form + "\n")

a = open("a.txt", "r", errors="ignore")
b = open("b.txt", "w", errors="ignore")

for line in a:
    varstore = re.search(r"VarStoreId: (.*) \[.*Name: (.*) {", line)
    form = re.search(r"Form: (.*), FormId", line)
    end_form = re.search(r"End Form", line)
    one_of = re.search(r"One Of: (.*), VarStoreInfo \(VarOffset/VarName\): (.*), VarStore: (.*), QuestionId.*Size: (.*), Min", line)
    one_of_option = re.search(r"One Of Option: (.*), Value \(.*bit\): (.*) {", line)
    end_one_of = re.search(r"End One Of", line)
    numeric = re.search(r"Numeric: (.*), VarStoreInfo \(VarOffset/VarName\): (.*), VarStore: (.*), QuestionId.*Size: (.*), Min: (.*), Max (.*), Step: (.*) {", line)
    string = re.search(r"String: (.*), VarStoreInfo \(VarOffset/VarName\): (.*), VarStore: (.*), QuestionId", line)
    checkbox = re.search(r"Checkbox: (.*), VarStoreInfo \(VarOffset/VarName\): (.*), VarStore: (.*), QuestionId", line)

    if varstore:
        varstores[varstore.group(1)] = varstore.group(2)
    elif form:
        current_form = check_unknown(form.group(1))
        b.write(f"{current_form}\n\n")
    elif end_form:
        b.write("\n")
    elif one_of:
        current_one_of = check_unknown(one_of.group(1))
        b.write(f"     {current_one_of} | VarStore: {varstores[one_of.group(3)]}, VarOffset: {one_of.group(2)}, Size: {hex(int(one_of.group(4)))}\n")
        total_one_of += 1
        has_options = True
    elif one_of_option:
        current_one_of_option = check_unknown(one_of_option.group(1))
        b.write(f"          {current_one_of_option}: {one_of_option.group(2)}\n")
        if has_options == False:
            b.write("\n")
    elif end_one_of:
        append_category()
        has_options = False
    elif numeric:
        current_numeric = check_unknown(numeric.group(1))
        b.write(f"     {current_numeric} | VarStore: {varstores[numeric.group(3)]}, VarOffset: {numeric.group(2)}, Size: {hex(int(numeric.group(4)))}\n          Min: {numeric.group(5)}, Max: {numeric.group(6)}, Step: {numeric.group(7)}\n")
        append_category()
        total_numeric += 1
    elif string:
        current_string = check_unknown(string.group(1))
        b.write(f"     {current_string} | Varstore: {varstores[string.group(3)]}, VarOffset: {string.group(2)}\n")
        append_category()
        total_string += 1
    elif checkbox:
        current_checkbox = check_unknown(checkbox.group(1))
        b.write(f"     {current_checkbox} | Varstore: {varstores[checkbox.group(3)]}, VarOffset: {checkbox.group(2)}\n")
        append_category()
        total_checkbox += 1

total_settings = total_one_of + total_numeric + total_string + total_checkbox

b.write(f"\n\nTotal settings: {total_settings}\nTotal One Of settings: {total_one_of}\nTotal Numeric settings: {total_numeric}\nTotal String settings: {total_string}\nTotal Checkbox settings: {total_checkbox}")

a.close()
b.close()