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
		if (outputColumns.includes('*')) {
			query = `SELECT * FROM ${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)}`;
		} else {
			const quotedColumns = outputColumns.map(quoteSqlIdentifier).join(',');
			query = `SELECT ${quotedColumns} FROM ${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)}`;
		}

		const whereClauses =
			((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];
		const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as string;
		[query, values] = addWhereClauses(query, whereClauses, combineConditions, columnMetaDataObject);

		const sortRules =
			((this.getNodeParameter('sort', i, []) as IDataObject).values as SortRule[]) || [];
		query = addSortRules(query, sortRules);

		const returnAll = this.getNodeParameter('returnAll', i, false);
		if (!returnAll) {
			const limit = this.getNodeParameter('limit', i, 50);
			query += ` FETCH FIRST ${limit} ROWS ONLY`;
		}

		const queryWithValues = { query, values };
		queries.push(queryWithValues);
	}

	return await runQueries(queries, items, nodeOptions);
}
