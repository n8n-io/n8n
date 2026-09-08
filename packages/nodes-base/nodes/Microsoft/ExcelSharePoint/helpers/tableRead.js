import { resolveWorkbookRoot, validatePathSegment } from './utils';
import { microsoftApiRequestAllItems } from '../transport';
export async function resolveTableEndpoint(itemIndex, workbookRootCache, siteIdCache) {
    const workbookRoot = await resolveWorkbookRoot.call(this, itemIndex, workbookRootCache, siteIdCache);
    const tableId = validatePathSegment(this.getNode(), 'Table', this.getNodeParameter('table', itemIndex, '', { extractValue: true }));
    return `${workbookRoot}/workbook/tables/${encodeURIComponent(tableId)}`;
}
export async function fetchTableColumnNames(tableEndpoint) {
    const columns = await (microsoftApiRequestAllItems).call(this, `${tableEndpoint}/columns`, { $select: 'name' });
    return columns.map((column) => String(column.name));
}
export function rowsToObjects(columnNames, rows) {
    return rows.map((row) => {
        const object = Object.create(null);
        columnNames.forEach((name, index) => {
            object[name] = row.values?.[0]?.[index];
        });
        return { ...object };
    });
}
//# sourceMappingURL=tableRead.js.map