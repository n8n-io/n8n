import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import type {
	PgpClient,
	PgpDatabase,
	QueryMode,
	QueryWithValues,
	SortRule,
	WhereClause,
} from '../../helpers/interfaces';
import {
	addSortRules,
	addWhereClauses,
	parsePostgresError,
	prepareErrorItem,
	wrapData,
} from '../../helpers/utils';
import {
	optionsCollection,
	schemaRLC,
	sortFixedCollection,
	tableRLC,
	whereFixedCollection,
} from '../common.descriptions';

const properties: INodeProperties[] = [
	schemaRLC,
	tableRLC,
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'all',
		options: [
			{
				name: 'All Columns',
				value: 'all',
				description: 'All columns in the table',
			},
			{
				name: 'Selected Columns',
				value: 'columns',
				description: 'Only selected columns in the table',
			},
		],
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Columns',
		name: 'columns',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['schema.value', 'table.value'],
		},
		default: [],
		displayOptions: {
			show: {
				output: ['columns'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
	},
	whereFixedCollection,
	sortFixedCollection,
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['select'],
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

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		let values: string[] = [schema, table];

		const output = this.getNodeParameter('output', i) as string;

		let outputColumns = '*';
		if (output === 'columns') {
			outputColumns = (this.getNodeParameter('columns', i, []) as string[]).join(', ');
		}

		let query = `SELECT ${outputColumns} FROM $1:name.$2:name`;

		const whereClauses =
			((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];

		[query, values] = addWhereClauses(query, whereClauses, values);

		const sortRules =
			((this.getNodeParameter('sort', i, []) as IDataObject).values as SortRule[]) || [];

		[query, values] = addSortRules(query, sortRules, values);

		const returnAll = this.getNodeParameter('returnAll', i, false);
		if (!returnAll) {
			const limit = this.getNodeParameter('limit', i, 50);
			query += ` LIMIT ${limit}`;
		}

		const queryWithValues = { query, values };
		queries.push(queryWithValues);
	}

	const mode = (options.mode as QueryMode) || 'multiple';

	if (mode === 'multiple') {
		try {
			returnData = (await db.multi(pgp.helpers.concat(queries)))
				.map((result, i) => {
					return this.helpers.constructExecutionMetaData(wrapData(result as IDataObject[]), {
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
			for (let i = 0; i < queries.length; i++) {
				try {
					const transactionResult = await t.any(queries[i].query, queries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(transactionResult as IDataObject[]),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err, i);
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
			for (let i = 0; i < queries.length; i++) {
				try {
					const transactionResult = await t.any(queries[i].query, queries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(transactionResult as IDataObject[]),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err, i);
					if (!this.continueOnFail()) throw error;
					result.push(prepareErrorItem(items, error, i));
				}
			}
			return result;
		});
	}

	return returnData;
}
