import type { IDataObject } from 'n8n-workflow';

export type SheetRow = Array<string | null>;
export type SheetData = SheetRow[];

export type ExcelResponse = {
	values: SheetData;
};

export type UpdateSummary = {
	updatedData: SheetData;
	appendData: IDataObject[];
	updatedRows: number[];
};
