import { DateTime } from 'luxon';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { SchemaField, TableRawData, TableSchema } from './interfaces';

function getFieldValue(schemaField: SchemaField, field: IDataObject, parseTimestamps = false) {
	if (schemaField.type === 'RECORD') {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return simplify([field.v as TableRawData], schemaField.fields as unknown as SchemaField[]);
	} else {
		let value = field.v;
		if (schemaField.type === 'JSON') {
			try {
				value = jsonParse(value as string);
			} catch (error) {}
		} else if (schemaField.type === 'TIMESTAMP' && parseTimestamps) {
			const dt = DateTime.fromSeconds(Number(value));
			value = dt.isValid ? dt.toISO() : value;
		}
		return value;
	}
}

export function wrapData(data: IDataObject | IDataObject[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		return [{ json: data }];
	}
	return data.map((item) => ({
		json: item,
	}));
}

export function simplify(
	data: TableRawData[],
	schema: SchemaField[],
	includeSchema = false,
	parseTimestamps = false,
) {
	const returnData: IDataObject[] = [];
	for (const entry of data) {
		const record: IDataObject = {};

		for (const [index, field] of entry.f.entries()) {
			if (schema[index].mode !== 'REPEATED') {
				record[schema[index].name] = getFieldValue(schema[index], field, parseTimestamps);
			} else {
				record[schema[index].name] = (field.v as unknown as IDataObject[]).flatMap(
					(repeatedField) => {
						return getFieldValue(
							schema[index],
							repeatedField as unknown as IDataObject,
							parseTimestamps,
						);
					},
				);
			}
		}

		if (includeSchema) {
			record._schema = schema;
		}

		returnData.push(record);
	}

	return returnData;
}

export function prepareOutput(
	this: IExecuteFunctions,
	response: IDataObject,
	itemIndex: number,
	rawOutput: boolean,
	includeSchema = false,
) {
	let responseData;

	if (response === undefined) return [];

	if (rawOutput) {
		responseData = response;
	} else {
		const { rows, schema } = response;
		const parseTimestamps = this.getNode().typeVersion >= 2.1;

		if (rows !== undefined && schema !== undefined) {
			const fields = (schema as TableSchema).fields;
			responseData = rows;

			responseData = simplify(
				responseData as TableRawData[],
				fields,
				includeSchema,
				parseTimestamps,
			);
		} else if (schema && includeSchema) {
			responseData = { success: true, _schema: schema };
		} else {
			responseData = { success: true };
		}
	}

	const executionData = this.helpers.constructExecutionMetaData(
		wrapData(responseData as IDataObject[]),
		{
			itemData: { item: itemIndex },
		},
	);

	return executionData;
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
		if (type !== 'STRING' && returnData[name] === '') {
			returnData[name] = null;
		}
		if (type === 'JSON') {
			let value = returnData[name];
			if (typeof value === 'object') {
				value = JSON.stringify(value);
			}
			returnData[name] = value;
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
