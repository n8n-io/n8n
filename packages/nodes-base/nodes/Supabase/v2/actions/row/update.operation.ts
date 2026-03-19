import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildWhereClause, managementApiRequest, quoteIdentifier } from '../../helpers';
import type { FieldsUiValues } from './create.operation';

export async function execute(
	this: IExecuteFunctions,
	tableRef: string,
	projectRef: string,
	credentialType: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const length = items.length;
	const returnData: INodeExecutionData[] = [];

	const filterType = this.getNodeParameter('filterType', 0) as string;

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
			}
		} else {
			const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
			for (const field of fields) {
				record[field.fieldId] = field.fieldValue;
			}
		}

		const node = this.getNode();
		const setCols = Object.keys(record);
		if (setCols.length === 0) {
			throw new NodeOperationError(node, 'No fields to update', { itemIndex: i });
		}

		const setParams: unknown[] = [];
		const setParts = setCols.map((col, idx) => {
			setParams.push(record[col]);
			return `${quoteIdentifier(col, node)} = $${idx + 1}`;
		});
		const setClause = setParts.join(', ');
		const whereStartIndex = setParams.length + 1;

		let whereSql = '';
		let whereParams: unknown[] = [];

		if (filterType === 'manual') {
			const matchType = this.getNodeParameter('matchType', 0) as string;
			const conditions = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];

			if (!conditions.length) {
				throw new NodeOperationError(node, 'At least one select condition must be defined', {
					itemIndex: i,
				});
			}

			const { clause, params } = buildWhereClause(conditions, matchType, whereStartIndex, node);
			whereSql = `WHERE ${clause}`;
			whereParams = params;
		}

		const sql = `UPDATE ${tableRef} SET ${setClause} ${whereSql} RETURNING *`.trim();
		const allParams = [...setParams, ...whereParams];

		try {
			const updatedRows = await managementApiRequest.call(
				this,
				projectRef,
				credentialType,
				sql,
				allParams,
			);
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(updatedRows),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: (error as Error).message }),
					{ itemData: { item: i } },
				);
				returnData.push.apply(returnData, executionData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
