import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, jsonParse, NodeOperationError } from 'n8n-workflow';
import { TableSchema } from './BigQuery.types';

export function simplify(rows: IDataObject[], fields: Array<string | IDataObject>) {
	if (!Array.isArray(rows)) {
		return (fields as IDataObject[]).reduce((acc, field, index) => {
			if (typeof field === 'string') {
				const rowData = ((rows as IDataObject).f as IDataObject[])[index].v;
				acc[field] = Array.isArray(rowData) ? rowData.map((entry) => entry.v) : rowData;
			} else {
				const name = Object.keys(field)[0];
				const rowData = ((rows as IDataObject).f as IDataObject[])[index].v as IDataObject[];

				acc[name] = simplify(rowData, field[name] as Array<string | IDataObject>);
				// acc[name] = rowData;
			}
			return acc;
		}, {} as IDataObject);
	}
	const results = [];

	for (const row of rows) {
		const record: IDataObject = {};
		for (const [index, field] of fields.entries()) {
			if (typeof field === 'string') {
				if (row.f) {
					record[field] = (row.f as IDataObject[])[index].v;
				} else {
					if (row.v) {
						record[field] = (((row.v as IDataObject).f as IDataObject[]) || []).map(
							(entry) => entry.v,
						);
					}
				}
			} else {
				const name = Object.keys(field)[0];
				const rowData = (row.f as IDataObject[])[index].v as IDataObject[];

				record[name] = rowData.map((entry) =>
					simplify(entry.v as IDataObject[], field[name] as Array<string | IDataObject>),
				);
			}
		}
		results.push(record);
	}
	return results;
}

export function extractSchemaFields(entry: IDataObject): string | IDataObject {
	const name = entry.name as string;
	const entryFields = entry.fields as IDataObject[];
	if (!entryFields) {
		return name;
	}
	return { [name]: entryFields.map(extractSchemaFields) };
}

export function parseField(field: string): string | IDataObject {
	if (!field.includes('.')) {
		return field;
	}
	const [rootField, ...rest] = field.split('.');
	return { [rootField]: [parseField(rest.join('.'))] };
}

export function checkSchema(
	this: IExecuteFunctions,
	schema: TableSchema,
	record: IDataObject,
	i: number,
) {
	const returnData = { ...record };

	schema.fields.forEach(({ name, mode, type, fields }) => {
		if (mode === 'REQUIRED' && returnData[name] === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				`The property '${name}' is required, please define it in the 'Fields to Send'`,
				{ itemIndex: i },
			);
		}
		if (type === 'RECORD' && typeof returnData[name] !== 'object') {
			let parsedField;
			try {
				parsedField = jsonParse(returnData[name] as string);
			} catch (error) {
				const recordField = fields ? `Field Schema:\n ${JSON.stringify(fields)}` : '';
				throw new NodeOperationError(
					this.getNode(),
					`The property '${name}' is a RECORD type, but the value is nor an object nor a valid JSON string`,
					{ itemIndex: i, description: recordField },
				);
			}
			returnData[name] = parsedField as IDataObject;
		}
	});

	return returnData;
}
