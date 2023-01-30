import type { IDataObject } from 'n8n-workflow';

export type SchemaField = {
	name: string;
	type: string;
	mode: string;
	fields?: SchemaField[];
};

export type TableSchema = {
	fields: SchemaField[];
};

//=============================

export type TableRawData = {
	f: Array<{ v: IDataObject | TableRawData }>;
};
