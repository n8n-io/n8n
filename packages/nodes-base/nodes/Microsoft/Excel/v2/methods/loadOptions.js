import { microsoftApiRequest } from '../transport';
import { parseAddress } from '../helpers/utils';
// loadOptions context throughout this file: the transport's trailing `0` is its
// fallback read (getNodeParameter's 2nd arg here is a fallback, not an item index).
export async function getWorksheetColumnRow() {
    const workbookId = this.getNodeParameter('workbook', undefined, {
        extractValue: true,
    });
    const worksheetId = this.getNodeParameter('worksheet', undefined, {
        extractValue: true,
    });
    let range = this.getNodeParameter('range', '');
    let columns = [];
    if (range === '') {
        const worksheetData = await microsoftApiRequest.call(this, 'GET', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`, undefined, { select: 'values' }, undefined, undefined, 0);
        columns = worksheetData.values[0];
    }
    else {
        const { cellFrom, cellTo } = parseAddress(range);
        range = `${cellFrom.value}:${cellTo.column}${cellFrom.row}`;
        const worksheetData = await microsoftApiRequest.call(this, 'PATCH', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`, { select: 'values' }, undefined, undefined, undefined, 0);
        columns = worksheetData.values[0];
    }
    const returnData = [];
    for (const column of columns) {
        returnData.push({
            name: column,
            value: column,
        });
    }
    return returnData;
}
export async function getWorksheetColumnRowSkipColumnToMatchOn() {
    const returnData = await getWorksheetColumnRow.call(this);
    const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0);
    return returnData.filter((column) => column.value !== columnToMatchOn);
}
export async function getTableColumns() {
    const workbookId = this.getNodeParameter('workbook', undefined, {
        extractValue: true,
    });
    const worksheetId = this.getNodeParameter('worksheet', undefined, {
        extractValue: true,
    });
    const tableId = this.getNodeParameter('table', undefined, {
        extractValue: true,
    });
    const response = await microsoftApiRequest.call(this, 'GET', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`, {}, undefined, undefined, undefined, 0);
    return response.value.map((column) => ({
        name: column.name,
        value: column.name,
    }));
}
//# sourceMappingURL=loadOptions.js.map