import { NodeOperationError } from 'n8n-workflow';
import { ResourceLocatorUiNames, ROW_NUMBER } from './GoogleSheets.types';
export const untilSheetSelected = { sheetName: [''] };
// Used to extract the ID from the URL
export function getSpreadsheetId(node, documentIdType, value) {
    if (!value) {
        throw new NodeOperationError(node, `Can not get sheet '${ResourceLocatorUiNames[documentIdType]}' with a value of '${value}'`, { level: 'warning' });
    }
    if (documentIdType === 'url') {
        const regex = /([-\w]{25,})/;
        const parts = value.match(regex);
        if (parts == null || parts.length < 2) {
            return '';
        }
        else {
            return parts[0];
        }
    }
    // If it is byID or byList we can just return
    return value;
}
export function getSheetId(value) {
    if (value === 'gid=0')
        return 0;
    return parseInt(value);
}
// Convert number to Sheets / Excel column name
export function getColumnName(colNumber) {
    const baseChar = 'A'.charCodeAt(0);
    let letters = '';
    do {
        colNumber -= 1;
        letters = String.fromCharCode(baseChar + (colNumber % 26)) + letters;
        colNumber = (colNumber / 26) >> 0;
    } while (colNumber > 0);
    return letters;
}
// Convert Column Name to Number (A = 1, B = 2, AA = 27)
export function getColumnNumber(colPosition) {
    let colNum = 0;
    for (let i = 0; i < colPosition.length; i++) {
        colNum *= 26;
        colNum += colPosition[i].charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    }
    return colNum;
}
// Hex to RGB
export function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (_, r, g, b) => {
        return r + r + g + g + b + b;
    });
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            red: parseInt(result[1], 16),
            green: parseInt(result[2], 16),
            blue: parseInt(result[3], 16),
        };
    }
    else {
        return null;
    }
}
export function addRowNumber(data, headerRow) {
    if (data.length === 0)
        return data;
    const sheetData = data.map((row, i) => [i + 1, ...row]);
    sheetData[headerRow][0] = ROW_NUMBER;
    return sheetData;
}
export function trimToFirstEmptyRow(data, includesRowNumber = true) {
    const baseLength = includesRowNumber ? 1 : 0;
    const emptyRowIndex = data.findIndex((row) => row.slice(baseLength).every((cell) => cell === ''));
    if (emptyRowIndex === -1) {
        return data;
    }
    return data.slice(0, emptyRowIndex);
}
export function removeEmptyRows(data, includesRowNumber = true) {
    const baseLength = includesRowNumber ? 1 : 0;
    const notEmptyRows = data.filter((row) => row
        .slice(baseLength)
        .some((cell) => cell || typeof cell === 'number' || typeof cell === 'boolean'));
    if (includesRowNumber) {
        notEmptyRows[0][0] = ROW_NUMBER;
    }
    return notEmptyRows;
}
export function trimLeadingEmptyRows(data, includesRowNumber = true, rowNumbersColumnName = ROW_NUMBER) {
    const baseLength = includesRowNumber ? 1 : 0;
    const firstNotEmptyRowIndex = data.findIndex((row) => row.slice(baseLength).some((cell) => cell || typeof cell === 'number'));
    const returnData = data.slice(firstNotEmptyRowIndex);
    if (includesRowNumber) {
        returnData[0][0] = rowNumbersColumnName;
    }
    return returnData;
}
export function removeEmptyColumns(data) {
    if (!data || data.length === 0)
        return [];
    const returnData = [];
    const longestRow = data.reduce((a, b) => (a.length > b.length ? a : b), []).length;
    for (let col = 0; col < longestRow; col++) {
        const column = data.map((row) => row[col]);
        if (column[0] !== '') {
            returnData.push(column);
            continue;
        }
        const hasData = column.slice(1).some((cell) => cell || typeof cell === 'number');
        if (hasData) {
            returnData.push(column);
        }
    }
    return (returnData[0] || []).map((_, i) => returnData.map((row) => (row[i] === undefined ? '' : row[i])));
}
export function prepareSheetData(data, options, addRowNumbersToData = true) {
    let returnData = [...(data || [])];
    let headerRow = 0;
    let firstDataRow = 1;
    if (options.rangeDefinition === 'specifyRange') {
        headerRow = parseInt(options.headerRow, 10) - 1;
        firstDataRow = parseInt(options.firstDataRow, 10) - 1;
    }
    if (addRowNumbersToData) {
        returnData = addRowNumber(returnData, headerRow);
    }
    if (options.rangeDefinition === 'detectAutomatically') {
        returnData = removeEmptyColumns(returnData);
        returnData = trimLeadingEmptyRows(returnData, addRowNumbersToData);
        if (options.readRowsUntil === 'firstEmptyRow') {
            returnData = trimToFirstEmptyRow(returnData, addRowNumbersToData);
        }
        else {
            returnData = removeEmptyRows(returnData, addRowNumbersToData);
        }
    }
    return { data: returnData, headerRow, firstDataRow };
}
export function getRangeString(sheetName, options) {
    if (options.rangeDefinition === 'specifyRangeA1') {
        return options.range ? `${sheetName}!${options.range}` : sheetName;
    }
    return sheetName;
}
export async function getExistingSheetNames(sheet) {
    const { sheets } = await sheet.spreadsheetGetSheets();
    return (sheets || []).map((entry) => entry.properties?.title);
}
export function mapFields(inputSize) {
    const returnData = [];
    for (let i = 0; i < inputSize; i++) {
        const nodeVersion = this.getNode().typeVersion;
        if (nodeVersion < 4) {
            const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []);
            let dataToSend = {};
            for (const field of fields) {
                dataToSend = { ...dataToSend, [field.fieldId]: field.fieldValue };
            }
            returnData.push(dataToSend);
        }
        else {
            const mappingValues = this.getNodeParameter('columns.value', i);
            if (Object.keys(mappingValues).length === 0) {
                throw new NodeOperationError(this.getNode(), "At least one value has to be added under 'Values to Send'");
            }
            returnData.push(mappingValues);
        }
    }
    return returnData;
}
export async function autoMapInputData(sheetNameWithRange, sheet, items, options, prefetchedColumnNames) {
    const returnData = [];
    const [sheetName, _sheetRange] = sheetNameWithRange.split('!');
    const locationDefine = options.locationDefine?.values;
    const handlingExtraData = options.handlingExtraData || 'insertInNewColumn';
    let headerRow = 1;
    if (locationDefine) {
        headerRow = parseInt(locationDefine.headerRow, 10);
    }
    let columnNames = [];
    if (prefetchedColumnNames !== undefined) {
        columnNames = prefetchedColumnNames;
    }
    else {
        const response = await sheet.getData(`${sheetName}!${headerRow}:${headerRow}`, 'FORMATTED_VALUE');
        columnNames = response ? response[0] : [];
    }
    if (handlingExtraData === 'insertInNewColumn') {
        if (!columnNames.length) {
            await sheet.updateRows(sheetName, [Object.keys(items[0].json).filter((key) => key !== ROW_NUMBER)], options.cellFormat || 'RAW', headerRow);
            columnNames = Object.keys(items[0].json);
        }
        const newColumns = new Set();
        items.forEach((item) => {
            Object.keys(item.json).forEach((key) => {
                if (key !== ROW_NUMBER && !columnNames.includes(key)) {
                    newColumns.add(key);
                }
            });
            if (item.json[ROW_NUMBER]) {
                const { [ROW_NUMBER]: _, ...json } = item.json;
                returnData.push(json);
                return;
            }
            returnData.push(item.json);
        });
        if (newColumns.size) {
            columnNames = columnNames.concat([...newColumns]);
            await sheet.updateRows(sheetName, [columnNames], options.cellFormat || 'RAW', headerRow);
        }
    }
    if (handlingExtraData === 'ignoreIt') {
        items.forEach((item) => {
            returnData.push(item.json);
        });
    }
    if (handlingExtraData === 'error') {
        items.forEach((item, itemIndex) => {
            Object.keys(item.json).forEach((key) => {
                if (!columnNames.includes(key)) {
                    throw new NodeOperationError(this.getNode(), 'Unexpected fields in node input', {
                        itemIndex,
                        description: `The input field '${key}' doesn't match any column in the Sheet. You can ignore this by changing the 'Handling extra data' field, which you can find under 'Options'.`,
                    });
                }
            });
            returnData.push(item.json);
        });
    }
    // Store the final resolved column names so convertObjectArrayToSheetDataArray
    // can reuse them without an extra API call. Filter out ROW_NUMBER since it
    // is a virtual field and is never written as a sheet column header.
    const columnNamesForHint = columnNames.filter((name) => name !== ROW_NUMBER);
    if (columnNamesForHint.length > 0) {
        sheet.setColumnNamesHint(columnNamesForHint);
    }
    return returnData;
}
export function sortLoadOptions(data) {
    const returnData = [...data];
    returnData.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName < bName) {
            return -1;
        }
        if (aName > bName) {
            return 1;
        }
        return 0;
    });
    return returnData;
}
export function cellFormatDefault(nodeVersion) {
    if (nodeVersion < 4.1) {
        return 'RAW';
    }
    return 'USER_ENTERED';
}
export function checkForSchemaChanges(node, columnNames, schema) {
    // RMC filters out empty columns so do the same here
    const liveColumns = new Set(columnNames.filter((col) => col !== ''));
    // if sheet does not contain ROW_NUMBER ignore it as data come from read rows operation
    const schemaColumns = liveColumns.has(ROW_NUMBER)
        ? schema.map((s) => s.id)
        : schema.filter((s) => s.id !== ROW_NUMBER).map((s) => s.id);
    const missingColumns = schemaColumns.filter((col) => !liveColumns.has(col));
    if (missingColumns.length) {
        throw new NodeOperationError(node, "Column names were updated after the node's setup", {
            description: `Refresh the columns list in the 'Column to Match On' parameter. Missing columns: ${missingColumns.join(', ')}`,
        });
    }
}
//# sourceMappingURL=GoogleSheets.utils.js.map