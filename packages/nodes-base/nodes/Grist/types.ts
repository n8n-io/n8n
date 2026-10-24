export type GristCredentials = {
	apiKey?: string;
	url?: string;
	// Legacy API-key credential fields, superseded by `url` (no credential migration exists,
	// so these are still read as a fallback for connections created before the unified field).
	customSubdomain?: string;
	selfHostedUrl?: string;
};

export type GristColumn = {
	id: string;
	fields: {
		label?: string;
		type?: string;
		isFormula?: boolean;
		formula?: string;
		// A JSON string. Choice and ChoiceList columns keep their `choices` here.
		widgetOptions?: string;
	};
};

export type GristTable = {
	columns: Set<string>;
	listColumns: Set<string>;
	formulaColumns: Set<string>;
};

export type GristColumns = {
	columns: GristColumn[];
};

export type GristSortProperties = Array<{
	field: string;
	direction: 'asc' | 'desc';
}>;

export type GristFilterProperties = Array<{
	field: string;
	values: string;
}>;

export type GristGetAllOptions = {
	sort?: { sortProperties: GristSortProperties };
	filter?: { filterProperties: GristFilterProperties };
};

export type GristDefinedFields = Array<{
	fieldId: string;
	fieldValue: string;
}>;

export type GristCreateRowPayload = {
	records: Array<{
		fields: { [key: string]: any };
	}>;
};

export type GristUpdateRowPayload = {
	records: Array<{
		id: number;
		fields: { [key: string]: any };
	}>;
};

export type GristUpsertRowPayload = {
	records: Array<{
		require: { [key: string]: any };
		fields: { [key: string]: any };
	}>;
};

export type SendingOptions = 'defineInNode' | 'autoMapInputs';

export type FieldsToSend = { properties: GristDefinedFields };
