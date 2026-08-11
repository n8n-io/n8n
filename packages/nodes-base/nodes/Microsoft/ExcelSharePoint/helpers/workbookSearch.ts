import type { IDataObject } from 'n8n-workflow';

export type DriveItem = IDataObject & {
	id?: string;
	name?: string;
	webUrl?: string;
	file?: IDataObject;
};

export const WORKBOOK_EXTENSIONS = ['.xlsx', '.xlsm'];

export function isWorkbookFile(item: DriveItem): boolean {
	const name = String(item.name ?? '').toLowerCase();
	return (
		item.file !== undefined && WORKBOOK_EXTENSIONS.some((extension) => name.endsWith(extension))
	);
}

export function workbookSearchEndpoint(siteId: string, driveId: string, text?: string): string {
	const trimmed = text?.trim() ?? '';
	const q = trimmed === '' ? WORKBOOK_EXTENSIONS.join(' OR ') : trimmed;
	return `/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root/search(q='${encodeURIComponent(q.replace(/'/g, "''"))}')`;
}
