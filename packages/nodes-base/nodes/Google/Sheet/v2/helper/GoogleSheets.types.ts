export const ROW_NUMBER = 'row_number';

export interface ISheetOptions {
	scope: string[];
}

export interface IGoogleAuthCredentials {
	email: string;
	privateKey: string;
}

export interface ISheetUpdateData {
	range: string;
	values: string[][];
}

export interface ILookupValues {
	lookupColumn: string;
	lookupValue: string;
}

export interface IToDeleteRange {
	amount: number;
	startIndex: number;
	sheetId: number;
}

export interface IToDelete {
	[key: string]: IToDeleteRange[] | undefined;
	columns?: IToDeleteRange[];
	rows?: IToDeleteRange[];
}

export type ValueInputOption = 'RAW' | 'USER_ENTERED';

export type ValueRenderOption = 'FORMATTED_VALUE' | 'FORMULA' | 'UNFORMATTED_VALUE';

export type RangeDetectionOptions = {
	rangeDefinition: 'detectAutomatically' | 'specifyRange';
	readRowsUntil?: 'firstEmptyRow' | 'lastRowInSheet';
	headerRow?: string;
	firstDataRow?: string;
	range?: string;
};

type SheetDataRow = Array<string | number>;
export type SheetRangeData = SheetDataRow[];
