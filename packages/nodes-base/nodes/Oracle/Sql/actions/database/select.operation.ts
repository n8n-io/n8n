import memoize from 'lodash/memoize';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type * as oracleDBTypes from 'oracledb';

import {
	addCursorPredicate,
	addCursorSortRule,
	assertUniqueCursorColumn,
	getStartAfter,
} from '@utils/sql-keyset-paging';
import { updateDisplayOptions } from '@utils/utilities';

import type {
	OracleDBNodeOptions,
	QueriesRunner,
	QueryWithValues,
	SortRule,
	WhereClause,
} from '../../helpers/interfaces';
import {
	addBindParam,
	addSortRules,
	addWhereClauses,
	quoteSqlIdentifier,
	getColumnMap,
	getColumnMetaData,
	getUniqueKeyColumns,
} from '../../helpers/utils';
import {
	combineConditionsCollection,
	optionsCollection,
	sortFixedCollection,
	startAfterFixedCollection,
	whereFixedCollection,
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
				resource: ['database'],
				operation: ['select'],
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
				resource: ['database'],
				operation: ['select'],
				returnAll: [false],
			},
		},
	},
	startAfterFixedCollection,
	whereFixedCollection,
	combineConditionsCollection,
	sortFixedCollection,
	...optionsCollection,
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
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: OracleDBNodeOptions,
	pool: oracleDBTypes.Pool,
): Promise<INodeExecutionData[]> {
	const queries: QueryWithValues[] = [];
	const uniqueColumnsOf = memoize(
		async (schema: string, table: string) => await getUniqueKeyColumns(pool, schema, table),
		(schema, table) => `${schema}.${table}`,
	);

	const conn = await pool.getConnection();
	const isCDBSupported = conn.oracleServerVersion >= 1200000000;
	await conn.close();

	for (let i = 0; i < items.length; i++) {
		const schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const tableSchema = await getColumnMetaData(this.getNode(), pool, schema, table, i);
		const columnMetaDataObject = getColumnMap(tableSchema);
		let values: any = [];
		const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']) as string[];

		let query = '';
		let innerQuery = outputColumns.includes('*')
			? `SELECT * FROM ${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)}`
			: `SELECT ${outputColumns.map(quoteSqlIdentifier).join(',')} FROM ${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)}`;

		// Add WHERE clause
		const whereClauses =
			((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];
		const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as string;
		const base = innerQuery;
		[innerQuery, values] = addWhereClauses(
			innerQuery,
			whereClauses,
			combineConditions,
			columnMetaDataObject,
			this.getNode(),
			i,
		);

		const sortRules =
			((this.getNodeParameter('sort', i, []) as IDataObject).values as SortRule[]) || [];
		let rules = sortRules;

		const returnAll = this.getNodeParameter('returnAll', i, false);
		if (!returnAll) {
			const { column, value } = getStartAfter(this, i);

			if (column !== '') {
				const uniqueColumns = await uniqueColumnsOf(schema, table);
				assertUniqueCursorColumn(this.getNode(), i, uniqueColumns, column, table);
				if (!columnMetaDataObject[column]) {
					throw new NodeOperationError(
						this.getNode(),
						`Column "${column}" was not found in table "${table}"`,
						{ itemIndex: i },
					);
				}

				if (value !== '') {
					const predicate = `${quoteSqlIdentifier(column)} > :${values.length}`;
					innerQuery = addCursorPredicate(base, innerQuery, predicate);
					addBindParam(columnMetaDataObject[column], value, values);
				}

				rules = addCursorSortRule(sortRules, column);
			}
		}

		// Add ORDER BY if needed
		innerQuery = addSortRules(innerQuery, rules);

		// Handle LIMIT / pagination
		if (!returnAll) {
			const limitParam = this.getNodeParameter('limit', i, 50);
			const limit = Number.isFinite(Number(limitParam)) ? Math.trunc(Number(limitParam)) : 0;

			if (isCDBSupported) {
				// Oracle 12c+ (FETCH FIRST)
				query += `${innerQuery} FETCH FIRST ${limit} ROWS ONLY`;
			} else {
				if (rules.length > 0 || whereClauses.length > 0) {
					// Wrap inner query to preserve WHERE + ORDER BY
					query = `SELECT * FROM (${innerQuery}) WHERE ROWNUM <= ${limit}`;
				} else {
					// No ORDER BY or WHERE: safe to append ROWNUM inline
					query = `${innerQuery} WHERE ROWNUM <= ${limit}`;
				}
			}
		} else {
			// return all: no limit
			query = innerQuery;
		}

		const queryWithValues = { query, values };
		queries.push(queryWithValues);
	}

	return await runQueries(queries, items, nodeOptions);
}
