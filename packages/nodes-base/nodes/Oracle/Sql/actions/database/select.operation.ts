import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import type * as oracleDBTypes from 'oracledb';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	OracleDBNodeOptions,
	QueriesRunner,
	QueryWithValues,
	SortRule,
	WhereClause,
} from '../../helpers/interfaces';
import {
	addSortRules,
	addWhereClauses,
	quoteSqlIdentifier,
	getColumnMap,
	getColumnMetaData,
} from '../../helpers/utils';
import {
	combineConditionsCollection,
	optionsCollection,
	sortFixedCollection,
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
		[innerQuery, values] = addWhereClauses(
			innerQuery,
			whereClauses,
			combineConditions,
			columnMetaDataObject,
		);

		// Add ORDER BY if needed
		const sortRules =
			((this.getNodeParameter('sort', i, []) as IDataObject).values as SortRule[]) || [];
		innerQuery = addSortRules(innerQuery, sortRules);

		// Handle LIMIT / pagination
		const returnAll = this.getNodeParameter('returnAll', i, false);
		if (!returnAll) {
			const limit = this.getNodeParameter('limit', i, 50);

			if (isCDBSupported) {
				// Oracle 12c+ (FETCH FIRST)
				query += `${innerQuery} FETCH FIRST ${limit} ROWS ONLY`;
			} else {
				if (sortRules.length > 0 || whereClauses.length > 0) {
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
