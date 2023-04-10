import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import type {
	QueryRunner,
	QueryValues,
	QueryWithValues,
	SortRule,
	WhereClause,
} from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import { addSortRules, addWhereClauses } from '../../helpers/utils';

import {
	optionsCollection,
	sortFixedCollection,
	selectRowsFixedCollection,
	combineConditionsCollection,
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
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < inputItems.length; i++) {
		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']) as string[];
		const selectDistinct = this.getNodeParameter('options.selectDistinct', i, false) as boolean;

		let query = '';
		const SELECT = selectDistinct ? 'SELECT DISTINCT' : 'SELECT';

		if (outputColumns.includes('*')) {
			query = `${SELECT} * FROM \`${table}\``;
		} else {
			const escapedColumns = outputColumns.map((column) => `\`${column}\``).join(', ');
			query = `${SELECT} ${escapedColumns} FROM \`${table}\``;
		}

		let values: QueryValues = [];

		const whereClauses =
			((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];

		const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as string;

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

		[query, values] = addSortRules(query, sortRules, values);

		const returnAll = this.getNodeParameter('returnAll', i, false);
		if (!returnAll) {
			const limit = this.getNodeParameter('limit', i, 50);
			query += ' LIMIT ?';
			values.push(limit);
		}

		queries.push({ query, values });
	}

	returnData = await runQueries(queries);

	return returnData;
}
