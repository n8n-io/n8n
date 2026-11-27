import memoize from 'lodash/memoize';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	addCursorPredicate,
	assertCursorColumnInOutput,
	getStartAfter,
	getStartAfterSortRules,
} from '@utils/sql-keyset-paging';
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
	checkStartAfterColumn,
	escapeSqlIdentifier,
	getTableName,
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
	nodeOptions: IDataObject,
	pool: Mysql2Pool,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	const queries: QueryWithValues[] = [];
	const uniqueColumnsOf = memoize(async (table: string) => await getUniqueKeyColumns(pool, table));

	for (let i = 0; i < inputItems.length; i++) {
		try {
			const table = getTableName(this, i);

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
			const startAfter = returnAll ? undefined : getStartAfter(this, i);
			if (startAfter) {
				const { column, value } = startAfter;
				assertCursorColumnInOutput(this.getNode(), i, outputColumns, column, true);
				rules = getStartAfterSortRules(this.getNode(), i, sortRules, column, true);
				// Only an empty Value can start the walk again, so only then the node looks for empty text
				await checkStartAfterColumn(
					pool,
					this.getNode(),
					i,
					table,
					column,
					await uniqueColumnsOf(table),
					nodeOptions.decimalNumbers === true,
					value === undefined,
				);

				if (value !== undefined) {
					const operator = rules[0].direction === 'DESC' ? '<' : '>';
					query = addCursorPredicate(base, query, `${escapeSqlIdentifier(column)} ${operator} ?`);
					values.push(value);
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
