import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import type { Mysql2Pool, QueryValues, QueryWithValues } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import { replaceEmptyStringsByNulls, runQueries } from '../../helpers/utils';

import { optionsCollection, tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
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
		displayName: 'Unique Column',
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
		hint: "Used to find the correct row to update. Doesn't get changed. Has to be unique.",
	},
	{
		displayName: 'Value of Unique Column',
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
							loadOptionsMethod: 'getColumnsWithoutColumnToMatchOn',
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
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['upsert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	pool: Mysql2Pool,
	nodeOptions: IDataObject,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	const items = replaceEmptyStringsByNulls(
		this.getInputData(),
		nodeOptions.replaceEmptyStrings as boolean,
	);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const columnToMatchOn = this.getNodeParameter('columnToMatchOn', i) as string;

		const dataMode = this.getNodeParameter('dataMode', i) as string;

		let item: IDataObject = {};

		if (dataMode === 'autoMapInputData') {
			item = items[i].json;
		}

		if (dataMode === 'defineBelow') {
			const valuesToSend = (this.getNodeParameter('valuesToSend', i, []) as IDataObject)
				.values as IDataObject[];

			item = valuesToSend.reduce((acc, { column, value }) => {
				acc[column as string] = value;
				return acc;
			}, {} as IDataObject);

			item[columnToMatchOn] = this.getNodeParameter('valueToMatchOn', i) as string;
		}

		const onConflict = 'ON DUPLICATE KEY UPDATE';

		const columns = Object.keys(item);
		const escapedColumns = columns.map((column) => `\`${column}\``).join(', ');
		const placeholder = `${columns.map(() => '?').join(',')}`;

		const insertQuery = `INSERT INTO \`${table}\`(${escapedColumns}) VALUES(${placeholder})`;

		const values = Object.values(item) as QueryValues;

		const updateColumns = Object.keys(item).filter((column) => column !== columnToMatchOn);

		const updates: string[] = [];

		for (const column of updateColumns) {
			updates.push(`\`${column}\` = ?`);
			values.push(item[column] as string);
		}

		const query = `${insertQuery} ${onConflict} ${updates.join(', ')}`;

		queries.push({ query, values });
	}

	returnData = await runQueries.call(this, queries, nodeOptions, pool);

	return returnData;
}
