import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import type { Mysql2Pool, QueryMode, QueryValues, QueryWithValues } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import { copyInputItems, runQueries } from '../../helpers/utils';

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
							loadOptionsDependsOn: ['table.value'],
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
		operation: ['insert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	pool: Mysql2Pool,
	nodeOptions: IDataObject,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;

	const dataMode = this.getNodeParameter('dataMode', 0) as string;
	const queryBatching = (nodeOptions.queryBatching as QueryMode) || 'multiple';

	const queries: QueryWithValues[] = [];

	if (queryBatching === 'multiple') {
		let columns: string[] = [];
		let insertItems: IDataObject[] = [];

		const priority = (nodeOptions.priority as string) || '';
		const ignore = (nodeOptions.skipOnConflict as boolean) ? 'IGNORE' : '';

		if (dataMode === 'autoMapInputData') {
			columns = [
				...new Set(
					items.reduce((acc, item) => {
						const itemColumns = Object.keys(item.json);

						return acc.concat(itemColumns);
					}, [] as string[]),
				),
			];
			insertItems = copyInputItems(items, columns);
		}

		if (dataMode === 'defineBelow') {
			for (let i = 0; i < items.length; i++) {
				const valuesToSend = (this.getNodeParameter('valuesToSend', i, []) as IDataObject)
					.values as IDataObject[];

				const item = valuesToSend.reduce((acc, { column, value }) => {
					acc[column as string] = value;
					return acc;
				}, {} as IDataObject);

				insertItems.push(item);
			}
			columns = [
				...new Set(
					insertItems.reduce((acc, item) => {
						const itemColumns = Object.keys(item);

						return acc.concat(itemColumns);
					}, [] as string[]),
				),
			];
		}

		const escapedColumns = columns.map((column) => `\`${column}\``).join(', ');
		const placeholder = `(${columns.map(() => '?').join(',')})`;
		const replacements = items.map(() => placeholder).join(',');

		const query = `INSERT ${priority} ${ignore} INTO \`${table}\` (${escapedColumns}) VALUES ${replacements}`;

		const values = insertItems.reduce(
			(acc: IDataObject[], item) => acc.concat(Object.values(item) as IDataObject[]),
			[],
		);

		queries.push({ query, values });
	} else {
		for (let i = 0; i < items.length; i++) {
			let columns: string[] = [];
			let insertItem: IDataObject = {};

			const options = this.getNodeParameter('options', i);
			const priority = (options.priority as string) || '';
			const ignore = (options.skipOnConflict as boolean) ? 'IGNORE' : '';

			if (dataMode === 'autoMapInputData') {
				columns = Object.keys(items[i].json);
				insertItem = columns.reduce((acc, key) => {
					if (columns.includes(key)) {
						acc[key] = items[i].json[key];
					}
					return acc;
				}, {} as IDataObject);
			}

			if (dataMode === 'defineBelow') {
				const valuesToSend = (this.getNodeParameter('valuesToSend', i, []) as IDataObject)
					.values as IDataObject[];

				insertItem = valuesToSend.reduce((acc, { column, value }) => {
					acc[column as string] = value;
					return acc;
				}, {} as IDataObject);

				columns = Object.keys(insertItem);
			}

			const escapedColumns = columns.map((column) => `\`${column}\``).join(', ');
			const placeholder = `(${columns.map(() => '?').join(',')})`;

			const query = `INSERT ${priority} ${ignore} INTO \`${table}\` (${escapedColumns}) VALUES ${placeholder};`;

			const values = Object.values(insertItem) as QueryValues;

			queries.push({ query, values });
		}
	}

	returnData = await runQueries.call(this, queries, nodeOptions, pool);

	return returnData;
}
