import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import type { PgpClient, PgpDatabase, QueryWithValues } from '../../helpers/interfaces';

import { runQueries } from '../../helpers/utils';

import { optionsCollection, outpurSelector, schemaRLC, tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	schemaRLC,
	tableRLC,
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		default: 'autoMapInputData',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column to match on',
		name: 'columnToMatchOn',
		type: 'options',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['schema.value', 'table.value'],
		},
		default: '',
		hint: "Used to find the correct row to update. Doesn't get changed.",
	},
	{
		displayName: 'Value of Column to Match On',
		name: 'valueToMatchOn',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
			},
		},
	},
	{
		displayName: 'Values to Send',
		name: 'valuesToSend',
		placeholder: 'Add Value',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Value',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getColumns',
							loadOptionsDependsOn: ['schema.value', 'table.value'],
						},
						default: [],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	...outpurSelector,
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	pgp: PgpClient,
	db: PgpDatabase,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', 0);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const columnToMatchOn = this.getNodeParameter('columnToMatchOn', i) as string;

		let query = '';
		const values: IDataObject = { schema, table };

		const dataMode = this.getNodeParameter('dataMode', i) as string;

		if (dataMode === 'autoMapInputData') {
			values.item = { ...items[i].json };
			values.columnToMatchOn = columnToMatchOn;
			const condition = `$<${columnToMatchOn}:name> = $<item.${columnToMatchOn}>`;

			const updateColumns = Object.keys(values.item).filter((column) => column !== columnToMatchOn);

			const updates: string[] = [];

			for (const column of updateColumns) {
				updates.push(`$<${column}:name> = $<item.${column}>`);
			}

			query = `UPDATE $<schema:name>.$<table:name> SET ${updates.join(', ')} WHERE ${condition}`;
		}

		// if (dataMode === 'defineBelow') {
		// 	const valuesToSend = (this.getNodeParameter('valuesToSend', i, []) as IDataObject)
		// 		.values as IDataObject[];

		// 	const item = valuesToSend.reduce((acc, { column, value }) => {
		// 		acc[column as string] = value;
		// 		return acc;
		// 	}, {} as IDataObject);

		// 	values.push(item);
		// }

		const output = this.getNodeParameter('output', 0) as string;

		if (output === 'columns') {
			const outputColumns = this.getNodeParameter('returnColumns', i, []) as string[];
			values.outputColumns = outputColumns;
			query = `${query} RETURNING $<outputColumns:name>`;
		} else {
			query = `${query} RETURNING *`;
		}

		queries.push({ query, values });
	}

	return runQueries.call(this, pgp, db, queries, items, options);
}
