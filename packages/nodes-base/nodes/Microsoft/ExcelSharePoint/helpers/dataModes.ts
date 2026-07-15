import type { IDataObject } from 'n8n-workflow';

import type { SheetRow } from '../../Excel/v2/helpers/interfaces';

export type DataMode = 'autoMap' | 'define' | 'raw';

export type FieldEntry = { column: string; fieldValue: string };

/**
 * Graph reports an empty sheet as a single-cell `usedRange` address (no ':',
 * e.g. `Sheet1!A1`) — there's no header row to read yet.
 */
export function isEmptyUsedRange(address: string): boolean {
	return !address.includes(':');
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
