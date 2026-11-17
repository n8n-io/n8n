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
	assertCursorColumnNotNull,
	assertCursorColumnType,
	assertUniqueCursorColumn,
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
	escapeSqlIdentifier,
	getUniqueKeyColumns,
	hasEmptyText,
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

const TEXT_TYPES = /^(char|varchar|tinytext|text|mediumtext|longtext)\b/;
// n8n outputs the other types as objects, or with another time zone or precision
const SUPPORTED_CURSOR_TYPES =
	/^(tinyint|smallint|mediumint|int|bigint|decimal|char|varchar|tinytext|text|mediumtext|longtext)\b/;

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
	const hasEmptyTextIn = memoize(
		async (table: string, column: string) => await hasEmptyText(pool, table, column),
		(table, column) => JSON.stringify([table, column]),
	);

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
			const startAfter = returnAll ? undefined : getStartAfter(this, i);
			if (startAfter) {
				const { column, value } = startAfter;
				assertCursorColumnInOutput(this.getNode(), i, outputColumns, column, true);
				rules = getStartAfterSortRules(this.getNode(), i, sortRules, column, true);
				const uniqueColumns = await uniqueColumnsOf(table);
				assertUniqueCursorColumn(
					this.getNode(),
					i,
					uniqueColumns.map((unique) => unique.column),
					column,
					true,
				);
				const key = uniqueColumns.find((unique) => unique.column === column.toLowerCase());
				assertCursorColumnNotNull(this.getNode(), i, column, key?.nullable ?? false);
				const type = key?.type ?? '';
				assertCursorColumnType(this.getNode(), i, column, type, SUPPORTED_CURSOR_TYPES);
				if (type.startsWith('decimal') && nodeOptions.decimalNumbers === true) {
					throw new NodeOperationError(
						this.getNode(),
						`Turn off Output Decimals as Numbers to page by "${column}"`,
						{
							itemIndex: i,
							description: `"${column}" is a DECIMAL column. As numbers, n8n can round its values in the output, so the next page can repeat or skip rows.`,
						},
					);
				}
				// Only an empty Value can start the walk again, so only then the node looks for empty text
				if (value === undefined && TEXT_TYPES.test(type) && (await hasEmptyTextIn(table, column))) {
					throw new NodeOperationError(
						this.getNode(),
						`Column "${column}" has empty text in one row`,
						{
							itemIndex: i,
							description:
								'An empty Value gets the first page. If a page ends on this row, the next page is the first page again, and the loop can repeat forever. With Sort DESC, the last page always ends on this row. Use another unique column, for example the primary key.',
						},
					);
				}

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
