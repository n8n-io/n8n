import type { IDataObject } from 'n8n-workflow';

export type SetNodeOptions = {
	dotNotation?: boolean;
	ignoreConversionErrors?: boolean;
	include?: IncludeMods;
	includeBinary?: boolean;
	stripBinary?: boolean;
};

export type SetField = {
	name: string;
	type: 'stringValue' | 'numberValue' | 'booleanValue' | 'arrayValue' | 'objectValue';
	stringValue?: string;
	numberValue?: number;
	booleanValue?: boolean;
	arrayValue?: string[] | string | IDataObject | IDataObject[];
	objectValue?: string | IDataObject;
};

export type AssignmentSetField = {
	name: string;
	value: unknown;
	type: string;
};

export const INCLUDE = {
	ALL: 'all',
	NONE: 'none',
	SELECTED: 'selected',
	EXCEPT: 'except',
} as const;

export type IncludeMods = (typeof INCLUDE)[keyof typeof INCLUDE];
