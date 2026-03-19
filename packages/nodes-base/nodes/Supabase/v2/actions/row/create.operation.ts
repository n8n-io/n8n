import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { mapPairedItemsFrom } from '../../../GenericFunctions';
import { managementApiRequest, quoteIdentifier } from '../../helpers';

export type FieldsUiValues = Array<{ fieldId: string; fieldValue: string }>;

export async function execute(
	this: IExecuteFunctions,
	tableRef: string,
	projectRef: string,
	credentialType: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const length = items.length;
	const returnData: INodeExecutionData[] = [];

	const allColumns = new Set<string>();
	const records: IDataObject[] = [];

	for (let i = 0; i < length; i++) {
		const record: IDataObject = {};
		const dataToSend = this.getNodeParameter('dataToSend', 0) as string;

		if (dataToSend === 'autoMapInputData') {
			const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i, '') as string;
			const inputDataToIgnore = rawInputsToIgnore
				.split(',')
				.map((c) => c.trim())
				.filter(Boolean);
			for (const key of Object.keys(items[i].json)) {
				if (inputDataToIgnore.includes(key)) continue;
				record[key] = items[i].json[key];
				allColumns.add(key);
			}
		} else {
			const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
			for (const field of fields) {
				record[field.fieldId] = field.fieldValue;
				allColumns.add(field.fieldId);
			}
		}
		records.push(record);
	}

	if (allColumns.size === 0) {
		return returnData;
	}

	const node = this.getNode();
	const columns = [...allColumns];
	const quotedCols = columns.map((c) => quoteIdentifier(c, node)).join(', ');

	const params: unknown[] = [];
	const valuePlaceholders: string[] = [];
	let paramIndex = 1;

	for (const record of records) {
		const rowPlaceholders: string[] = [];
		for (const col of columns) {
			params.push(record[col] ?? null);
			rowPlaceholders.push(`$${paramIndex}`);
			paramIndex++;
		}
		valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
	}

	const sql = `INSERT INTO ${tableRef} (${quotedCols}) VALUES ${valuePlaceholders.join(', ')} RETURNING *`;

	try {
		const createdRows = await managementApiRequest.call(
			this,
			projectRef,
			credentialType,
			sql,
			params,
		);
		createdRows.forEach((row, i) => {
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(row),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		});
	} catch (error) {
		if (this.continueOnFail()) {
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: (error as Error).message }),
				{ itemData: mapPairedItemsFrom(records) },
			);
			returnData.push.apply(returnData, executionData);
		} else {
			throw error;
		}
	}

	return returnData;
}
