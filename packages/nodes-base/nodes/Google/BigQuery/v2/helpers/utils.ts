import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, jsonParse, NodeOperationError } from 'n8n-workflow';
import { SchemaField, TableRawData, TableSchema } from './BigQuery.types';

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

function getFieldValue(schemaField: SchemaField, field: IDataObject) {
	if (schemaField.type === 'RECORD') {
		return simplify([field.v as TableRawData], schemaField.fields as unknown as SchemaField[]);
	} else {
		return field.v;
	}
}

export function parseField(field: string): string | IDataObject {
	if (!field.includes('.')) {
		return field;
	}
	const [rootField, ...rest] = field.split('.');
	return { [rootField]: [parseField(rest.join('.'))] };
}

export function getSchemaForSelectedFields(schemaFields: SchemaField[], selectedFields: string[]) {
	const returnData: SchemaField[] = [];

	for (const field of schemaFields) {
		if (selectedFields.includes(field.name)) {
			// if (field.name.includes('.') && field.type === 'RECORD') {
			// 	const [rootField, ...rest] = field.name.split('.');
			// 	const rootFieldIndex = returnData.findIndex(({ name }) => name === rootField);
			// 	if (rootFieldIndex === -1) {
			// 		returnData.push({
			// 			...field,
			// 			fields: getSchemaForSelectedFields(field.fields as unknown as SchemaField[], [
			// 				rest.join('.'),
			// 			]),
			// 		});
			// 	} else {
			// 		const subField = getSchemaForSelectedFields(field.fields as unknown as SchemaField[], [
			// 			rest.join('.'),
			// 		]);
			// 		returnData[rootFieldIndex].fields = [
			// 			...(returnData[rootFieldIndex].fields as unknown as SchemaField[]),
			// 			...subField,
			// 		];
			// 	}
			// } else {
			returnData.push(field);
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
