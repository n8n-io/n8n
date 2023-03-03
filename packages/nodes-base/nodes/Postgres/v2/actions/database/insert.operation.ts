import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import type {
	PgpClient,
	PgpDatabase,
	QueryValues,
	QueryWithValues,
} from '../../helpers/interfaces';

import { addReturning, runQueries } from '../../helpers/utils';

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
		displayName: `
		In this mode, make sure incoming data fields are named the same as the columns in your table. Use a 'Set' node before this node to change them if required.
		`,
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataMode: ['autoMapInputData'],
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
		operation: ['insert'],
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

		let onConflict = '';
		if (options.skipOnConflict) {
			onConflict = ' ON CONFLICT DO NOTHING';
		}

		let query = `INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv)${onConflict}`;
		let values: QueryValues = [schema, table];

		const dataMode = this.getNodeParameter('dataMode', i) as string;

		if (dataMode === 'autoMapInputData') {
			values.push(items[i].json);
		}

		if (dataMode === 'defineBelow') {
			const valuesToSend = (this.getNodeParameter('valuesToSend', i, []) as IDataObject)
				.values as IDataObject[];

			const item = valuesToSend.reduce((acc, { column, value }) => {
				acc[column as string] = value;
				return acc;
			}, {} as IDataObject);

			values.push(item);
		}

		const output = this.getNodeParameter('output', i) as string;

		let outputColumns: string | string[] = '*';
		if (output === 'columns') {
			outputColumns = this.getNodeParameter('returnColumns', i, []) as string[];
		}

		[query, values] = addReturning(query, outputColumns, values);

		queries.push({ query, values });
	}

	return runQueries.call(this, pgp, db, queries, items, options);
}
