import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	Mysql2Pool,
	QueryRunner,
	QueryValues,
	QueryWithValues,
	SortRule,
} from '../../helpers/interfaces';
import {
	addSortRules,
	addWhereClauses,
	escapeSqlIdentifier,
	getUniqueKeyColumns,
	getWhereClauses,
	prepareErrorItem,
} from '../../helpers/utils';
import {
	optionsCollection,
	sortFixedCollection,
	selectRowsFixedCollection,
	combineConditionsCollection,
	startAfterFixedCollection,
} from '../common.descriptions';

const properties: INodeProperties[] = [
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
	startAfterFixedCollection,
	selectRowsFixedCollection,
	combineConditionsCollection,
	sortFixedCollection,
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['select'],
	},
	hide: {
		table: [''],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputItems: INodeExecutionData[],
	runQueries: QueryRunner,
	_nodeOptions: IDataObject,
	pool: Mysql2Pool,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	const queries: QueryWithValues[] = [];
	const uniqueColumnsByTable = new Map<string, string[]>();

	for (let i = 0; i < inputItems.length; i++) {
		try {
			const table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;

			const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']) as string[];
			const selectDistinct = this.getNodeParameter('options.selectDistinct', i, false) as boolean;

			let query = '';
			const SELECT = selectDistinct ? 'SELECT DISTINCT' : 'SELECT';

			if (outputColumns.includes('*')) {
				query = `${SELECT} * FROM ${escapeSqlIdentifier(table)}`;
			} else {
				const escapedColumns = outputColumns.map(escapeSqlIdentifier).join(', ');
				query = `${SELECT} ${escapedColumns} FROM ${escapeSqlIdentifier(table)}`;
			}

			let values: QueryValues = [];

			const whereClauses = getWhereClauses(this, i);

			const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as string;

			const base = query;
			[query, values] = addWhereClauses(
				this.getNode(),
				i,
				query,
				whereClauses,
				values,
				combineConditions,
			);

			const sortRules =
				((this.getNodeParameter('sort', i, []) as IDataObject).values as SortRule[]) || [];
			let rules = sortRules;

			const returnAll = this.getNodeParameter('returnAll', i, false);
			if (!returnAll) {
				const cursor = ((this.getNodeParameter('startAfter', i, {}) as IDataObject).values ??
					{}) as IDataObject;
				const column = String(cursor.column ?? '');
				const value = typeof cursor.value === 'number' ? cursor.value : String(cursor.value ?? '');

				if (column !== '') {
					let uniqueColumns = uniqueColumnsByTable.get(table);
					if (!uniqueColumns) {
						uniqueColumns = await getUniqueKeyColumns(pool, table);
						uniqueColumnsByTable.set(table, uniqueColumns);
					}
					if (!uniqueColumns.includes(column.toLowerCase())) {
						throw new NodeOperationError(
							this.getNode(),
							`Column "${column}" in table "${table}" is not unique. Start After needs a column with a single-column unique index or primary key`,
							{ itemIndex: i },
						);
					}

					if (value !== '') {
						// addWhereClauses prepends ' WHERE '. Wrap its body so an OR chain
						// stays grouped under the cursor AND.
						const where = query.slice(base.length);
						const predicate = `${escapeSqlIdentifier(column)} > ?`;
						query = where
							? `${base} WHERE (${where.slice(' WHERE '.length)}) AND ${predicate}`
							: `${base} WHERE ${predicate}`;
						values.push(value);
					}

					// The walk is only correct with no Sort rules, or with Sort = cursor column ASC.
					// The node does not guard this; the user owns the Sort rules.
					rules = sortRules.some((rule) => rule.column.toLowerCase() === column.toLowerCase())
						? sortRules
						: [...sortRules, { column, direction: 'ASC' }];
				}
			}

			[query, values] = addSortRules(query, rules, values);

			if (!returnAll) {
				const limit = this.getNodeParameter('limit', i, 50);
				query += ' LIMIT ?';
				values.push(limit);
			}

			queries.push({ query, values, itemIndex: i });
		} catch (error) {
			if (!this.continueOnFail()) throw error;

			const nodeError =
				error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });

			returnData.push(prepareErrorItem(inputItems[i].json, nodeError, i));
		}
	}

	if (queries.length > 0) {
		returnData = returnData.concat(await runQueries(queries));
	}

	return returnData;
}
