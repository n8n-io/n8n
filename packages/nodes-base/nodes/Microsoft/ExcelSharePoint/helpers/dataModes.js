/**
 * Graph reports an empty sheet as a single-cell `usedRange` address (no ':',
 * e.g. `Sheet1!A1`). Note this is also true for a one-column sheet that
 * already has real data in that single cell (e.g. just a header, no rows
 * yet) — use `isEmptySheet` when the header-seeding decision depends on it.
 */
export function isEmptyUsedRange(address) {
    return !address.includes(':');
}
/**
 * True only when the sheet genuinely has no data yet. A single-cell address
 * alone can't tell a blank sheet apart from a one-column sheet whose only
 * cell already holds a real header — the cell's own content has to be
 * checked too, or that header would get treated as empty and overwritten.
 */
export function isEmptySheet(address, firstRow) {
    if (!isEmptyUsedRange(address))
        return false;
    const cell = firstRow?.[0];
    return cell === null || cell === undefined || String(cell).trim() === '';
}
/** Column order derived from an item's own keys — seeds the header row when the sheet has no data yet. */
export function columnsFromItem(item) {
    return Object.keys(item);
}
/** Column order as the builder defined it — seeds the header row when the sheet has no data yet. */
export function columnsFromFields(fields) {
    return fields.map((field) => field.column);
}
/** Projects an item's properties into `columns` order for the auto-map data mode. */
export function autoMapRow(item, columns) {
    return columns.map((column) => item[column] ?? null);
}
/** Projects a builder-defined field list into `columns` order for the define data mode. */
export function defineRow(fields, columns) {
    const byColumn = {};
    for (const field of fields)
        byColumn[field.column] = field.fieldValue;
    return columns.map((column) => byColumn[column] ?? null);
}
//# sourceMappingURL=dataModes.js.map