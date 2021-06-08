export async function createRowinSheet(this: any) {
    const client = require('smartsheet');
    const sheetId = this.getNodeParameter('sheetId') as string;
    const API_KEY = this.getNodeParameter('apiKey') as string;
    const smartsheet = client.createClient({
        accessToken: API_KEY,
        logLevel: 'info'
    });
    const options: any = {
        id: sheetId,
        queryParameters: {
            includeAll: true,
            level: 2 // this parameter to get 'MULTI_PICKLIST' coloumn type in the payload.
        }
    }
    try {
        const sheetInfo = await getSheet(smartsheet, options);
        const row = createRowData(sheetInfo, this.getInputData());
        if (row.length > 0) {
            let addOptions = { sheetId: sheetId, body: row }
            let result: any = await addRow(smartsheet, addOptions);
            return result.result;
        }
    } catch (e) {
        throw new Error(e);
    }
    return [];

}

function getSheet(smartsheet: any, options: any) {
    return new Promise((resolve, reject) => {
        smartsheet.sheets.getSheet(options)
            .then(function (sheetInfo: any) {
                resolve(sheetInfo);
            })
            .catch(function (error: any) {
                reject('Could not get sheet. Please check API KEY and Sheet ID');
            });
    })
}

/**
 * Create new row data for smartsheet
 * @param sheetInfo smartsheet details
 */
function createRowData(sheetInfo: any, formIOData: any) {
    const row: any = [];
    if(!sheetInfo) return row;
    if (sheetInfo.columns && sheetInfo.columns.length > 0 && formIOData[0] && formIOData[0].json) {
        const columns = sheetInfo.columns;
        const formData: any = formIOData[0].json.formData; // data from form.io
        const formFieldDetails: any = formIOData[0].json.formInputFields; // has form.io field types
        let procesedFormData: any = processFormIoData(formData, formFieldDetails);
        let cells = addCells(columns, procesedFormData);
        if (cells.length > 0) row.push({ toTop: true, cells: cells })
    }
    return row;
}

/**
 * Method will process data from form.io according to smarsheet format
 * Form.io field label will be considered for mapping
 * @param formData has the details of data entered in the form
 * @param formFieldDetails has the form input details
 */
function processFormIoData(formData: any, formFieldDetails: any) {
    let procesedFormData: any = {};
    for (let formField of formFieldDetails) {
        if (formData[formField.key]) {


            // if type is selectboxes then checkbox value label is mapped into smartsheet coloumn
            // smartsheet should have a column with checkbox label name
            // smartsheet does not support multiple checkboxes
            if (formField.type == 'selectboxes') {
                let selectedCheckboxes = formData[formField.key];
                for (let checkbox of formField.values) {
                    if(selectedCheckboxes[checkbox.value])
                    procesedFormData[checkbox.label] = {
                        value: selectedCheckboxes[checkbox.value]
                    }
                }
            }
            else {
                procesedFormData[formField.label] = {
                    value: formData[formField.key]
                }
            }
        }
    }
    return procesedFormData;
}

/**
 * Method will create data for smartsheet
 * Checks coloumn exist on the sheet based on label field in the form.io data
 * @param columns in smartsheet
 * @param processedFormData processed form.io data
 */
function addCells(columns: any, processedFormData: any) {
    const cells = [];
    for (let column of columns) {
        if (processedFormData[column.title]) {
            let formDetalils = processedFormData[column.title];
            if (column.type == 'MULTI_PICKLIST') {
                cells.push(
                    {
                        columnId: column.id,
                        objectValue: {
                            "objectType": "MULTI_PICKLIST",
                            "values": formDetalils.value
                        }
                    }
                )
            } else {
                cells.push(
                    {
                        columnId: column.id,
                        value: formDetalils.value,
                        strict: false
                    }
                )
            }

        }
    }
    return cells;
}


function addRow(smartsheet: any, options: any) {
    return new Promise((resolve, reject) => {
        smartsheet.sheets.addRows(options)
            .then(function (result: any) {
                resolve(result);
            })
            .catch(function (error: any) {
                reject('Could not create row in smartsheet');
            });
    })
}