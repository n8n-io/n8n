import type { IDataObject } from 'n8n-workflow';

export type SetNodeOptions = {
	dotNotation?: boolean;
	ignoreConversionErrors?: boolean;
	include?: IncludeMods;
	includeBinary?: boolean;
};

export type SetField = {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	string?: string;
	number?: number;
	boolean?: boolean;
	array?: string[] | string | IDataObject | IDataObject[];
	object?: string | IDataObject;
};

export const INCLUDE = {
	ALL: 'all',
	NONE: 'none',
	SELECTED: 'selected',
	EXCEPT: 'except',
} as const;

export type IncludeMods = (typeof INCLUDE)[keyof typeof INCLUDE];
