import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildWhereClause, managementApiRequest } from '../../helpers';

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
		let sql: string;
		let params: unknown[] = [];

		if (filterType === 'manual') {
			const matchType = this.getNodeParameter('matchType', 0) as string;
			const conditions = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];

			if (!conditions.length) {
				throw new NodeOperationError(
					this.getNode(),
					'At least one select condition must be defined',
					{ itemIndex: i },
				);
			}

			const { clause, params: whereParams } = buildWhereClause(
				conditions,
				matchType,
				1,
				this.getNode(),
			);
			params = whereParams;
			sql = `DELETE FROM ${tableRef} WHERE ${clause} RETURNING *`;
		} else {
			sql = `DELETE FROM ${tableRef} RETURNING *`;
		}

		try {
			const rows = await managementApiRequest.call(this, projectRef, credentialType, sql, params);
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(rows),
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
