import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { SchemaField, TableRawData, TableSchema } from './BigQuery.types';

import { isEmpty, set } from 'lodash';

function getFieldValue(schemaField: SchemaField, field: IDataObject) {
	if (schemaField.type === 'RECORD') {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return simplify([field.v as TableRawData], schemaField.fields as unknown as SchemaField[]);
	} else {
		return field.v;
	}
}

export function simplify(data: TableRawData[], schema: SchemaField[]) {
	const returnData: IDataObject[] = [];

	for (const entry of data) {
		const record: IDataObject = {};

		for (const [index, field] of entry.f.entries()) {
			if (schema[index].mode !== 'REPEATED') {
				record[schema[index].name] = getFieldValue(schema[index], field);
			} else {
				record[schema[index].name] = (field.v as unknown as IDataObject[]).flatMap(
					(repeatedField) => {
						return getFieldValue(schema[index], repeatedField as unknown as IDataObject);
					},
				);
			}
		}

		returnData.push(record);
	}

	return returnData;
}

export function selectedFieldsToObject(selected: string) {
	const returnData: IDataObject = {};
	const fields = selected.split(',').map((entry) => entry.trim());
	fields.forEach((entry) => set(returnData, entry, {}));
	return returnData;
}

export function getSchemaForSelectedFields(
	schemaFields: SchemaField[],
	selectedFields: IDataObject,
) {
	const returnData: SchemaField[] = [];

	for (const field of schemaFields) {
		if (selectedFields[field.name] !== undefined) {
			if (isEmpty(selectedFields[field.name])) {
				returnData.push(field);
			}
			if (field.type === 'RECORD' && field.fields !== undefined) {
				const fields = getSchemaForSelectedFields(
					field.fields,
					selectedFields[field.name] as IDataObject,
				);
				returnData.push({
					...field,
					fields,
				});
			}
		}
	}

	return returnData;
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
