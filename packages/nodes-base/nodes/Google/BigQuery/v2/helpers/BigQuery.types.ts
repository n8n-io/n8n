type TableSchemaField = {
	name: string;
	type: string;
	mode: string;
	fields?: TableSchemaField[];
};

export type TableSchema = {
	fields: TableSchemaField[];
};
