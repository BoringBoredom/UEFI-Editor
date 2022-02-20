document.addEventListener('dragenter', ev => {
    ev.stopPropagation()
    ev.preventDefault()
})
document.addEventListener('dragover', ev => {
    ev.stopPropagation()
    ev.preventDefault()
})
document.addEventListener('drop', async ev => {
    ev.stopPropagation()
    ev.preventDefault()

    let PE32Image, SetupData
    for (const file of ev.dataTransfer.files) {
        const fileName = file.name
        if (fileName.endsWith('.txt')) {
            PE32Image = await file.text()
        }
        else if (fileName.endsWith('.bin')) {
            SetupData = [...new Uint8Array(await file.arrayBuffer())].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
        }
    }

    if (PE32Image && SetupData) {
        const result = processFile(PE32Image, SetupData)

        saveAs(new Blob([JSON.stringify(result, null, 4)], { type: 'text/plain;charset=utf-8' }), 'data.json')
    }
})

function checkSuppress(item, suppressedBy) {
    if (suppressedBy.length !== 0) {
        item['Suppressed By'] = [...suppressedBy]
    }
}

function checkAccessLevels(item, bytes, SetupData) {
    bytes = bytes.split(' ')
    const regex = new RegExp(bytes[6] + bytes[7] + '............................(..)......' + bytes[4] + bytes[5] + '....................................................' + bytes[2] + bytes[3] + '....(..)(..)')
    const accessLevels = SetupData.match(regex)

    item['Access Level'] = accessLevels[1]
    item['Failsafe'] = accessLevels[2]
    item['Optimal'] = accessLevels[3]
}

function processFile(PE32Image, SetupData) {
    const varStores = []
    const forms = []
    const suppressedBy = []
    const currentIf = []
    let currentForm
    let currentOneOf

    PE32Image = PE32Image.split('\n')

    for (const line of PE32Image) {
        const varStore = line.match(/VarStoreId: (.*) \[.*], Size: (.*), Name: (.*) {/)

        const suppressIf = line.match(/Suppress If {0A 82}/)
        const grayOutIf = line.match(/Gray Out If {19 82}/)
        const endIf = line.match(/End If {29 02}/)

        const reference = line.match(/Ref: (.*), VarStoreInfo \(VarOffset\/VarName\): (.*), VarStore: (.*), QuestionId: (.*), FormId: (.*) {(.*)}/)

        const form = line.match(/Form: (.*), FormId: (.*) {/)
        const endForm = line.match(/End Form {29 02}/)

        const oneOf = line.match(/One Of: (.*), VarStoreInfo \(VarOffset\/VarName\): (.*), VarStore: (.*), QuestionId: (.*), Size: (.*), Min: (.*), Max (.*), Step: (.*) {(.*)}/)
        const oneOfOption = line.match(/One Of Option: (.*), Value \(.*bit\): (.*) {/)
        const endOneOf = line.match(/End One Of {29 02}/)

        const numeric = line.match(/Numeric: (.*), VarStoreInfo \(VarOffset\/VarName\): (.*), VarStore: (.*), QuestionId: (.*), Size: (.*), Min: (.*), Max (.*), Step: (.*) {(.*)}/)
        const string = line.match(/String: (.*), VarStoreInfo \(VarOffset\/VarName\): (.*), VarStore: (.*), QuestionId: (.*), MinSize: (.*), MaxSize: (.*) {(.*)}/)
        const checkbox = line.match(/Checkbox: (.*), VarStoreInfo \(VarOffset\/VarName\): (.*), VarStore: (.*), QuestionId: (.*) {(.*)}/)


        if (varStore) {
            varStores.push({
                'VarStoreId': varStore[1],
                'Size': varStore[2],
                'Name': varStore[3]
            })
        }

        if (suppressIf) {
            suppressedBy.push(line.split(' ')[0])
            currentIf.push('suppress')
        }
        if (grayOutIf) {
            currentIf.push('grayout')
        }
        if (endIf) {
            if (currentIf[currentIf.length - 1] === 'suppress') {
                suppressedBy.pop()
            }
            currentIf.pop()
        }

        if (form) {
            currentForm = {
                'Name': form[1],
                'Type': 'Form',
                'FormId': form[2]
            }

            currentForm['Children'] = []
        }
        if (endForm) {
            forms.push(currentForm)
        }

        if (reference) {
            const currentReference = {
                'Name': reference[1],
                'Type': 'Reference',
                'VarOffSet': reference[2],
                'VarStoreId': `${reference[3]} (${varStores.find(varStore => varStore['VarStoreId'] === reference[3])?.['Name']})`,
                'QuestionId': reference[4],
                'FormId': reference[5]
            }

            checkAccessLevels(currentReference, reference[6], SetupData)
            checkSuppress(currentReference, suppressedBy)
            currentForm['Children'].push(currentReference)
        }

        if (oneOf) {
            currentOneOf = {
                'Name': oneOf[1],
                'Type': 'One Of Setting',
                'FormId': `${currentForm['FormId']} (${currentForm['Name']})`,
                'VarOffset': oneOf[2],
                'VarStoreId': `${oneOf[3]} (${varStores.find(varStore => varStore['VarStoreId'] === oneOf[3])?.['Name']})`,
                'QuestionId': oneOf[4],
                'Size': oneOf[5],
                'Min': oneOf[6],
                'Max': oneOf[7],
                'Step': oneOf[8]
            }

            checkAccessLevels(currentOneOf, oneOf[9], SetupData)
            checkSuppress(currentOneOf, suppressedBy)
            currentOneOf['Options'] = []
        }
        if (oneOfOption) {
            currentOneOf['Options'].push(`${oneOfOption[1]}: ${oneOfOption[2]}`)
        }
        if (endOneOf) {
            currentForm['Children'].push(currentOneOf)
        }

        if (numeric) {
            const currentNumeric = {
                'Name': numeric[1],
                'Type': 'Numeric Setting',
                'FormId': `${currentForm['FormId']} (${currentForm['Name']})`,
                'VarOffset': numeric[2],
                'VarStoreId': `${numeric[3]} (${varStores.find(varStore => varStore['VarStoreId'] === numeric[3])?.['Name']})`,
                'QuestionId': numeric[4],
                'Size': numeric[5],
                'Min': numeric[6],
                'Max': numeric[7],
                'Step': numeric[8]
            }

            checkAccessLevels(currentNumeric, numeric[9], SetupData)
            checkSuppress(currentNumeric, suppressedBy)
            currentForm['Children'].push(currentNumeric)
        }

        if (string) {
            const currentString = {
                'Name': string[1],
                'Type': 'String Setting',
                'FormId': `${currentForm['FormId']} (${currentForm['Name']})`,
                'VarOffset': string[2],
                'VarStoreId': `${string[3]} (${varStores.find(varStore => varStore['VarStoreId'] === string[3])?.['Name']})`,
                'QuestionId': string[4],
                'MinSize': string[5],
                'MaxSize': string[6]
            }

            checkAccessLevels(currentString, string[7], SetupData)
            checkSuppress(currentString, suppressedBy)
            currentForm['Children'].push(currentString)
        }

        if (checkbox) {
            const currentCheckbox = {
                'Name': checkbox[1],
                'Type': 'Checkbox Setting',
                'FormId': `${currentForm['FormId']} (${currentForm['Name']})`,
                'VarOffset': checkbox[2],
                'VarStoreId': `${checkbox[3]} (${varStores.find(varStore => varStore['VarStoreId'] === checkbox[3])?.['Name']})`,
                'QuestionId': checkbox[4]
            }

            checkAccessLevels(currentCheckbox, checkbox[5], SetupData)
            checkSuppress(currentCheckbox, suppressedBy)
            currentForm['Children'].push(currentCheckbox)
        }
    }

    return {
        'Forms': forms,
        'VarStores': varStores
    }
}