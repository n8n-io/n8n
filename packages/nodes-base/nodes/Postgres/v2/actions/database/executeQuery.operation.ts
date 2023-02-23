import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties, JsonObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
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
	overrideMode?: string,
): Promise<INodeExecutionData[]> {
	const additionalFields = this.getNodeParameter('additionalFields', 0);

	let valuesArray = [] as string[][];
	if (additionalFields.queryParams) {
		const propertiesString = additionalFields.queryParams as string;
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const properties = propertiesString.split(',').map((column) => column.trim());
		const paramsItems = getItemsCopy(items, properties);
		valuesArray = paramsItems.map((row) => properties.map((col) => row[col])) as string[][];
	}

	type QueryWithValues = { query: string; values?: string[] };
	const allQueries = new Array<QueryWithValues>();
	for (let i = 0; i < items.length; i++) {
		const query = this.getNodeParameter('query', i) as string;
		const values = valuesArray[i];
		const queryFormat = { query, values };
		allQueries.push(queryFormat);
	}

	const mode = overrideMode ? overrideMode : ((additionalFields.mode ?? 'multiple') as string);
	if (mode === 'multiple') {
		return (await db.multi(pgp.helpers.concat(allQueries)))
			.map((result, i) => {
				return this.helpers.constructExecutionMetaData(wrapData(result), {
					itemData: { item: i },
				});
			})
			.flat();
	} else if (mode === 'transaction') {
		return db.tx(async (t) => {
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
	} else if (mode === 'independently') {
		return db.task(async (t) => {
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
	throw new Error('multiple, independently or transaction are valid options');
}
