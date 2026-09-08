import { NodeOperationError } from 'n8n-workflow';
import { GoogleSheet } from '../helpers/GoogleSheet';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';
export async function getSheets() {
    const documentId = this.getNodeParameter('documentId', 0);
    if (!documentId)
        return [];
    const { mode, value } = documentId;
    const spreadsheetId = getSpreadsheetId(this.getNode(), mode, value);
    const sheet = new GoogleSheet(spreadsheetId, this);
    const responseData = await sheet.spreadsheetGetSheets();
    if (responseData === undefined) {
        throw new NodeOperationError(this.getNode(), 'No data got returned');
    }
    const returnData = [];
    for (const entry of responseData.sheets) {
        if (entry.properties.sheetType !== 'GRID') {
            continue;
        }
        returnData.push({
            name: entry.properties.title,
            value: entry.properties.sheetId,
        });
    }
    return returnData;
}
export async function getSheetHeaderRow() {
    const documentId = this.getNodeParameter('documentId', null);
    if (!documentId)
        return [];
    const { mode, value } = documentId;
    const spreadsheetId = getSpreadsheetId(this.getNode(), mode, value);
    const sheet = new GoogleSheet(spreadsheetId, this);
    const sheetWithinDocument = this.getNodeParameter('sheetName', undefined, {
        extractValue: true,
    });
    const { mode: sheetMode } = (this.getNodeParameter('sheetName') ?? { mode: null });
    if (!sheetMode) {
        return [];
    }
    const { title: sheetName } = await sheet.spreadsheetGetSheet(this.getNode(), sheetMode, sheetWithinDocument);
    const sheetData = await sheet.getData(`${sheetName}!1:1`, 'FORMATTED_VALUE');
    if (sheetData === undefined) {
        throw new NodeOperationError(this.getNode(), 'No data got returned');
    }
    const columns = sheet.testFilter(sheetData, 0, 0);
    const returnData = [];
    for (const column of columns) {
        returnData.push({
            name: column,
            value: column,
        });
    }
    return returnData;
}
export async function getSheetHeaderRowAndAddColumn() {
    const returnData = await getSheetHeaderRow.call(this);
    returnData.push({
        name: 'New column ...',
        value: 'newColumn',
    });
    const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0);
    return returnData.filter((column) => column.value !== columnToMatchOn);
}
export async function getSheetHeaderRowWithGeneratedColumnNames() {
    const returnData = await getSheetHeaderRow.call(this);
    return returnData.map((column, i) => {
        if (column.value !== '')
            return column;
        const indexBasedValue = `col_${i + 1}`;
        return {
            name: indexBasedValue,
            value: indexBasedValue,
        };
    });
}
export async function getSheetHeaderRowAndSkipEmpty() {
    const returnData = await getSheetHeaderRow.call(this);
    return returnData.filter((column) => column.value);
}
//# sourceMappingURL=loadOptions.js.map