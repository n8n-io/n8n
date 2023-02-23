import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties, JsonObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { QueryMode } from '../../helpers/interfaces';
import type { PgpClient, PgpDatabase } from '../../helpers/utils';
import { getItemsCopy, wrapData } from '../../helpers/utils';

import { additionalFieldsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
		required: true,
		description:
			'The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParams',
		type: 'string',
		displayOptions: {
			show: {
				'/operation': ['executeQuery'],
			},
		},
		default: '',
		placeholder: 'quantity,price',
		description: 'Comma-separated list of properties which should be used as query parameters',
	},
	additionalFieldsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	pgp: PgpClient,
	db: PgpDatabase,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const additionalFields = this.getNodeParameter('additionalFields', 0);
	const queryParamsString = this.getNodeParameter('queryParams', 0, '') as string;

	let valuesArray = [] as string[][];
	if (queryParamsString !== '') {
		const queryParams = queryParamsString.split(',').map((column) => column.trim());
		const paramsItems = getItemsCopy(items, queryParams);
		valuesArray = paramsItems.map((row) => queryParams.map((col) => row[col])) as string[][];
	}

	type QueryWithValues = { query: string; values?: string[] };
	const allQueries = new Array<QueryWithValues>();
	for (let i = 0; i < items.length; i++) {
		const query = this.getNodeParameter('query', i) as string;
		const values = valuesArray[i];
		const queryFormat = { query, values };
		allQueries.push(queryFormat);
	}

	const mode = (additionalFields.mode as QueryMode) || 'multiple';

	if (mode === 'multiple') {
		returnData = (await db.multi(pgp.helpers.concat(allQueries)))
			.map((result, i) => {
				return this.helpers.constructExecutionMetaData(wrapData(result), {
					itemData: { item: i },
				});
			})
			.flat();
	}

	if (mode === 'transaction') {
		returnData = await db.tx(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					const transactionResult = await t.any(allQueries[i].query, allQueries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(transactionResult),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					if (!this.continueOnFail()) throw err;
					result.push({
						json: { ...items[i].json },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
					return result;
				}
			}
			return result;
		});
	}

	if (mode === 'independently') {
		returnData = await db.task(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					const transactionResult = await t.any(allQueries[i].query, allQueries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(transactionResult),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					if (!this.continueOnFail()) throw err;
					result.push({
						json: { ...items[i].json },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
				}
			}
			return result;
		});
	}

	return returnData;
}
