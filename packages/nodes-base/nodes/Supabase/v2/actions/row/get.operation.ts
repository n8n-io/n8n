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

	for (let i = 0; i < length; i++) {
		const conditions = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];

		if (!conditions.length) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one select condition must be defined',
				{ itemIndex: i },
			);
		}

		// Get uses equality only
		const eqConditions = conditions.map((c) => ({ ...c, condition: 'eq' }));
		const { clause, params } = buildWhereClause(eqConditions, 'allFilters', 1, this.getNode());
		const sql = `SELECT * FROM ${tableRef} WHERE ${clause} LIMIT 1`;

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
