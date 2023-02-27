import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { PgpClient, PgpDatabase, QueryMode } from '../../helpers/interfaces';
import { parsePostgresError, prepareErrorItem, wrapData } from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
		required: true,
		description:
			"The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with 'Query Values Replacement'.",
	},
	{
		displayName:
			'You can use replacement values in query, $1 to reference first value, $2 second and so on, if value is SQL name or identifier use :name or ~, e.g. $1:name',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Query Values Replacement',
		name: 'queryReplacement',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		placeholder: 'Add Value',
		description:
			'Value has to be of type number, bigint, string, boolean, Date and null, types Array and Object are not supported',
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	optionsCollection,
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
	const options = this.getNodeParameter('options', 0);

	type QueryWithValues = { query: string; values?: string[] };
	const allQueries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const query = this.getNodeParameter('query', i) as string;
		const values = (this.getNodeParameter('queryReplacement.values', i, []) as IDataObject[]).map(
			(entry) => entry.value as string,
		);
		const queryFormat = { query, values };
		allQueries.push(queryFormat);
	}

	const mode = (options.mode as QueryMode) || 'multiple';

	if (mode === 'multiple') {
		try {
			returnData = (await db.multi(pgp.helpers.concat(allQueries)))
				.map((result, i) => {
					return this.helpers.constructExecutionMetaData(wrapData(result), {
						itemData: { item: i },
					});
				})
				.flat();
		} catch (err) {
			const error = parsePostgresError.call(this, err);
			if (!this.continueOnFail()) throw error;

			return [
				{
					json: {
						message: error.message,
						error: { ...error },
					},
				},
			];
		}
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
					const error = parsePostgresError.call(this, err);
					if (!this.continueOnFail()) throw error;
					result.push(prepareErrorItem(items, error, i));
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
					const error = parsePostgresError.call(this, err);
					if (!this.continueOnFail()) throw error;
					result.push(prepareErrorItem(items, error, i));
				}
			}
			return result;
		});
	}

	return returnData;
}
