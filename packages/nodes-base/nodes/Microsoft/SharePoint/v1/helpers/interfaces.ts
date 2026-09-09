import type { IDataObject } from 'n8n-workflow';

export interface IListColumnType {
	id: string;
	hidden: boolean;
	name: string;
	displayName: string;
	readOnly: boolean;
	required: boolean;
	type: string;
	enforceUniqueValues: boolean;
	choice?: {
		choices: string[];
	};
}

// The label fields are optional: the API omits them for some entries, and a
// single missing label used to fail the whole dropdown instead of one row.
export interface IDriveItem {
	id: string;
	name?: string;
	file?: IDataObject;
	folder?: IDataObject;
}

export interface IListItem {
	id: string;
	fields?: {
		Title?: string;
	};
}

export interface IList {
	id: string;
	displayName?: string;
}

export interface ISite {
	id: string;
	title?: string;
}

export interface IErrorResponse {
	error: {
		code: string;
		message: string;
	};
}
