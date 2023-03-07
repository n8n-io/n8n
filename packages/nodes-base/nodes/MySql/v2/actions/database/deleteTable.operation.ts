import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { QueryValues, QueryWithValues, WhereClause } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import { addWhereClauses, runQueries } from '../../helpers/utils';

import { optionsCollection, tableRLC, whereFixedCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	tableRLC,
	{
		displayName: 'Command',
		name: 'deleteCommand',
		type: 'options',
		default: 'truncate',
		options: [
			{
				name: 'Truncate',
				value: 'truncate',
				description: "Only removes the table's data and preserves the table's structure",
			},
			{
				name: 'Delete',
				value: 'delete',
				description:
					"Delete the rows that match the 'Select Rows' conditions below. If no selection is made, all rows in the table are deleted.",
			},
			{
				name: 'Drop',
				value: 'drop',
				description: "Deletes the table's data and also the table's structure permanently",
			},
		],
	},
	{
		...whereFixedCollection,
		displayOptions: {
			show: {
				deleteCommand: ['delete'],
			},
		},
	},
	{
		displayName: 'Combine Conditions',
		name: 'combineConditions',
		type: 'options',
		description: 'How to combine conditions',
		options: [
			{
				name: 'AND',
				value: 'AND',
			},
			{
				name: 'OR',
				value: 'OR',
			},
		],
		default: 'AND',
		displayOptions: {
			show: {
				deleteCommand: ['delete'],
			},
		},
	},
	optionsCollection,
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['deleteTable'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();

	const nodeOptions = this.getNodeParameter('options', 0);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const deleteCommand = this.getNodeParameter('deleteCommand', i) as string;

		let query = '';
		let values: QueryValues = [];

		if (deleteCommand === 'drop') {
			query = `DROP TABLE IF EXISTS \`${table}\``;
		}

		if (deleteCommand === 'truncate') {
			query = `TRUNCATE TABLE \`${table}\``;
		}

		if (deleteCommand === 'delete') {
			const whereClauses =
				((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];

			const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as string;

			[query, values] = addWhereClauses(
				`DELETE FROM \`${table}\``,
				whereClauses,
				values,
				combineConditions,
			);
		}

		if (query === '') {
			throw new NodeOperationError(
				this.getNode(),
				'Invalid delete command, only drop, delete and truncate are supported ',
				{ itemIndex: i },
			);
		}

		const queryWithValues = { query, values };

		queries.push(queryWithValues);
	}

	returnData = await runQueries.call(this, queries, nodeOptions);

	return returnData;
}
