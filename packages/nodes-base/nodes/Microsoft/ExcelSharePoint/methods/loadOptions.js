import { parseAddress } from '../../Excel/v2/helpers/utils';
import { fetchTableColumnNames } from '../helpers/tableRead';
import { resolveWorkbookRoot, validatePathSegment } from '../helpers/utils';
import { microsoftApiRequest } from '../transport';
async function readHeaderRow() {
    const workbookRoot = await resolveWorkbookRoot.call(this);
    const worksheetId = validatePathSegment(this.getNode(), 'Sheet', this.getNodeParameter('worksheet', '', { extractValue: true }));
    const sheetPath = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(worksheetId)}`;
    const range = this.getNodeParameter('range', '').trim();
    let endpoint = `${sheetPath}/usedRange`;
    if (range !== '') {
        const { cellFrom, cellTo } = parseAddress(range);
        endpoint = `${sheetPath}/range(address='${cellFrom.value}:${cellTo.column}${cellFrom.row}')`;
    }
    const worksheetData = await microsoftApiRequest.call(this, 'GET', endpoint, {}, {
        $select: 'values',
    });
    return (worksheetData.values?.[0] ?? []).map(String);
}
export async function getWorksheetColumnRow() {
    return (await readHeaderRow.call(this)).map((column) => ({ name: column, value: column }));
}
export async function getWorksheetColumnRowSkipColumnToMatchOn() {
    const columnToMatchOn = this.getNodeParameter('columnToMatchOn', '');
    return (await readHeaderRow.call(this))
        .filter((column) => column !== columnToMatchOn)
        .map((column) => ({ name: column, value: column }));
}
export async function getTableColumns() {
    const workbookRoot = await resolveWorkbookRoot.call(this);
    // Load-options contexts take (name, fallback, options) — the execute-style
    // 4-arg read would silently drop extractValue here.
    const tableId = validatePathSegment(this.getNode(), 'Table', this.getNodeParameter('table', '', { extractValue: true }));
    const tableEndpoint = `${workbookRoot}/workbook/tables/${encodeURIComponent(tableId)}`;
    return (await fetchTableColumnNames.call(this, tableEndpoint)).map((column) => ({
        name: column,
        value: column,
    }));
}
//# sourceMappingURL=loadOptions.js.map