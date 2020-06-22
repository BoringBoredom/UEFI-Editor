import re, winsound

a = open("a.txt", "r")
b = open("b.txt", "w")
c = open("c.txt", "w")

i = 0
for line in a:
    if i %2 == 0:
        matches = re.search(r"One Of: (.+), VarStoreInfo \(VarOffset/VarName\): (.+), VarStore:", line)
        if matches:
            b.write(f"{matches.group(1)}: {matches.group(2)}\n")
            c.write(f"{matches.group(1)}\n")
            i += 1
    elif re.search(r"End One Of", line):
        b.write("\n")
        i += 1
    else:
        matches = re.search(r"One Of Option:(.+), Value \(\d{1,2} bit\): (.+) {", line)
        if matches:
            b.write(f"     {matches.group(1)}: {matches.group(2)}\n")

b.write(f"Total settings: {int(i / 2)}")
c.write(f"Total settings: {int(i / 2)}")
a.close()
b.close()
c.close()
winsound.PlaySound('sound' , winsound.SND_FILENAME)