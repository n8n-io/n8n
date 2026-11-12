import {
	NodeOperationError,
	tryToParseNumber,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	PgpDatabase,
	PostgresNodeOptions,
	QueriesRunner,
	QueryValues,
	QueryWithValues,
	SortRule,
} from '../../helpers/interfaces';
import {
	addSortRules,
	addWhereClauses,
	getUniqueKeyColumns,
	getWhereClauses,
	replaceEmptyStringsByNulls,
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
	whereFixedCollection,
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
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: PostgresNodeOptions,
	db: PgpDatabase,
): Promise<INodeExecutionData[]> {
	items = replaceEmptyStringsByNulls(items, nodeOptions.replaceEmptyStrings as boolean);

	const queries: QueryWithValues[] = [];
	const uniqueColumnsByTable = new Map<string, string[]>();

	for (let i = 0; i < items.length; i++) {
		const schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		let values: QueryValues = [schema, table];

		const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']) as string[];

		let query = '';

		if (outputColumns.includes('*')) {
			query = 'SELECT * FROM $1:name.$2:name';
		} else {
			values.push(outputColumns);
			query = `SELECT $${values.length}:name FROM $1:name.$2:name`;
		}

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
				const tableKey = `${schema}.${table}`;
				let uniqueColumns = uniqueColumnsByTable.get(tableKey);
				if (!uniqueColumns) {
					uniqueColumns = await getUniqueKeyColumns(db, schema, table);
					uniqueColumnsByTable.set(tableKey, uniqueColumns);
				}
				if (!uniqueColumns.includes(column)) {
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
					values.push(column, value);
					const predicate = `$${values.length - 1}:name > $${values.length}`;
					query = where
						? `${base} WHERE (${where.slice(' WHERE '.length)}) AND ${predicate}`
						: `${base} WHERE ${predicate}`;
				}

				// The walk is only correct with no Sort rules, or with Sort = cursor column ASC.
				// The node does not guard this; the user owns the Sort rules.
				rules = sortRules.some((rule) => rule.column === column)
					? sortRules
					: [...sortRules, { column, direction: 'ASC' }];
			}
		}

		[query, values] = addSortRules(query, rules, values);

		if (!returnAll) {
			const limitRaw = this.getNodeParameter('limit', i, 50);
			const limit = tryToParseNumber(limitRaw);
			values.push(limit);
			query += ` LIMIT $${values.length}`;
		}

		const queryWithValues = { query, values };
		queries.push(queryWithValues);
	}

	return await runQueries(queries, nodeOptions);
}
