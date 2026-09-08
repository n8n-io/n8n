export const WORKBOOK_EXTENSIONS = ['.xlsx', '.xlsm'];
export function isWorkbookFile(item) {
    const name = String(item.name ?? '').toLowerCase();
    return (item.file !== undefined && WORKBOOK_EXTENSIONS.some((extension) => name.endsWith(extension)));
}
export function workbookSearchEndpoint(siteId, driveId, text) {
    const trimmed = text?.trim() ?? '';
    const q = trimmed === '' ? WORKBOOK_EXTENSIONS.join(' OR ') : trimmed;
    return `/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root/search(q='${encodeURIComponent(q.replace(/'/g, "''"))}')`;
}
//# sourceMappingURL=workbookSearch.js.map