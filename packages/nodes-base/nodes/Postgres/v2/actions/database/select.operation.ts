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
	addStartAfterClause,
	addWhereClauses,
	checkStartAfterColumn,
	getStartAfter,
	getStartAfterSortRules,
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
	const checkedStartAfterColumns = new Set<string>();

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

		let sortRules =
			((this.getNodeParameter('sort', i, []) as IDataObject).values as SortRule[]) || [];

		const startAfter = getStartAfter(this, i);

		if (startAfter) {
			const { column } = startAfter;
			// An expression can give Output Columns as one string.
			const selectedColumns: unknown[] = Array.isArray(outputColumns)
				? outputColumns
				: [outputColumns];

			if (!selectedColumns.includes('*') && !selectedColumns.includes(column)) {
				throw new NodeOperationError(this.getNode(), `Add "${column}" to Output Columns`, {
					itemIndex: i,
					description: `Start After needs "${column}" in the output to get the next page.`,
				});
			}

			sortRules = getStartAfterSortRules(this.getNode(), i, sortRules, column);

			const columnKey = JSON.stringify([schema, table, column]);
			if (!checkedStartAfterColumns.has(columnKey)) {
				await checkStartAfterColumn(db, this.getNode(), i, schema, table, column);
				checkedStartAfterColumns.add(columnKey);
			}
		}

		[query, values] = startAfter
			? addStartAfterClause(
					query,
					whereClauses,
					values,
					combineConditions,
					startAfter,
					sortRules[0].direction === 'DESC',
				)
			: addWhereClauses(this.getNode(), i, query, whereClauses, values, combineConditions);

		[query, values] = addSortRules(query, sortRules, values);

		const returnAll = this.getNodeParameter('returnAll', i, false);
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
