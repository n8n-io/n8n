import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

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

	const returnAll = this.getNodeParameter('returnAll', 0);
	const filterType = this.getNodeParameter('filterType', 0) as string;

	for (let i = 0; i < length; i++) {
		let whereClause = '';
		let baseParams: unknown[] = [];

		if (filterType === 'manual') {
			const matchType = this.getNodeParameter('matchType', 0) as string;
			const conditions = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];

			if (conditions.length > 0) {
				const { clause, params } = buildWhereClause(conditions, matchType, 1, this.getNode());
				whereClause = `WHERE ${clause}`;
				baseParams = params;
			}
		}

		let rows: IDataObject[] = [];
		let offset = 0;

		try {
			if (!returnAll) {
				const limit = parseInt(String(this.getNodeParameter('limit', 0, 50)), 10);
				const limitNum = isNaN(limit) ? 50 : limit;
				const limitParamIndex = baseParams.length + 1;
				const offsetParamIndex = baseParams.length + 2;
				const sql =
					`SELECT * FROM ${tableRef} ${whereClause} LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`.trim();
				rows = await managementApiRequest.call(this, projectRef, credentialType, sql, [
					...baseParams,
					limitNum,
					offset,
				]);
			} else {
				// Paginate in chunks of 1000
				let responseLength = 0;
				do {
					const limitParamIndex = baseParams.length + 1;
					const offsetParamIndex = baseParams.length + 2;
					const sql =
						`SELECT * FROM ${tableRef} ${whereClause} LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`.trim();
					const newRows = await managementApiRequest.call(this, projectRef, credentialType, sql, [
						...baseParams,
						1000,
						offset,
					]);
					responseLength = newRows.length;
					rows = rows.concat(newRows);
					offset = rows.length;
				} while (responseLength >= 1000);
			}

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
