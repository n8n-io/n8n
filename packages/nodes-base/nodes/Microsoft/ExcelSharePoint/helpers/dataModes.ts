import type { IDataObject } from 'n8n-workflow';

import type { SheetRow } from '../../Excel/v2/helpers/interfaces';

export type DataMode = 'autoMap' | 'define' | 'raw';

export type FieldEntry = { column: string; fieldValue: string };

/**
 * Graph reports an empty sheet as a single-cell `usedRange` address (no ':',
 * e.g. `Sheet1!A1`). Note this is also true for a one-column sheet that
 * already has real data in that single cell (e.g. just a header, no rows
 * yet) — use `isEmptySheet` when the header-seeding decision depends on it.
 */
export function isEmptyUsedRange(address: string): boolean {
	return !address.includes(':');
}

/**
 * True only when the sheet genuinely has no data yet. A single-cell address
 * alone can't tell a blank sheet apart from a one-column sheet whose only
 * cell already holds a real header — the cell's own content has to be
 * checked too, or that header would get treated as empty and overwritten.
 */
export function isEmptySheet(address: string, firstRow: SheetRow | undefined): boolean {
	if (!isEmptyUsedRange(address)) return false;
	const cell = firstRow?.[0];
	return cell === null || cell === undefined || String(cell).trim() === '';
}

/** Column order derived from an item's own keys — seeds the header row when the sheet has no data yet. */
export function columnsFromItem(item: IDataObject): string[] {
	return Object.keys(item);
}

/** Column order as the builder defined it — seeds the header row when the sheet has no data yet. */
export function columnsFromFields(fields: FieldEntry[]): string[] {
	return fields.map((field) => field.column);
}

/** Projects an item's properties into `columns` order for the auto-map data mode. */
export function autoMapRow(item: IDataObject, columns: string[]): SheetRow {
	return columns.map((column) => (item[column] as SheetRow[number]) ?? null);
}

/** Projects a builder-defined field list into `columns` order for the define data mode. */
export function defineRow(fields: FieldEntry[], columns: string[]): SheetRow {
	const byColumn: Record<string, string> = {};
	for (const field of fields) byColumn[field.column] = field.fieldValue;
	return columns.map((column) => (byColumn[column] as SheetRow[number]) ?? null);
}
