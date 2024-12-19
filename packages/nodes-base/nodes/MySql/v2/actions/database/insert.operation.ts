import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	QueryMode,
	QueryRunner,
	QueryValues,
	QueryWithValues,
} from '../../helpers/interfaces';
import { AUTO_MAP, BATCH_MODE, DATA_MODE } from '../../helpers/interfaces';
import { escapeSqlIdentifier, replaceEmptyStringsByNulls } from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: DATA_MODE.AUTO_MAP,
				description: 'Use when node input properties names exactly match the table column names',
			},
			{
				name: 'Map Each Column Manually',
				value: DATA_MODE.MANUAL,
				description: 'Set the value for each destination column manually',
			},
		],
		default: AUTO_MAP,
		description:
			'Whether to map node input properties and the table data automatically or manually',
	},
	{
		displayName: `
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use an 'Edit Fields' node before this node to change the field names.
		`,
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataMode: [DATA_MODE.AUTO_MAP],
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
				dataMode: [DATA_MODE.MANUAL],
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
						// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/" target="_blank">expression</a>',
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
	hide: {
		table: [''],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputItems: INodeExecutionData[],
	runQueries: QueryRunner,
	nodeOptions: IDataObject,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = replaceEmptyStringsByNulls(inputItems, nodeOptions.replaceEmptyStrings as boolean);

	const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;

	const dataMode = this.getNodeParameter('dataMode', 0) as string;
	const queryBatching = (nodeOptions.queryBatching as QueryMode) || BATCH_MODE.SINGLE;

	const queries: QueryWithValues[] = [];

	if (queryBatching === BATCH_MODE.SINGLE) {
		let columns: string[] = [];
		let insertItems: IDataObject[] = [];

		const priority = (nodeOptions.priority as string) || '';
		const ignore = (nodeOptions.skipOnConflict as boolean) ? 'IGNORE' : '';

		if (dataMode === DATA_MODE.AUTO_MAP) {
			columns = [
				...new Set(
					items.reduce((acc, item) => {
						const itemColumns = Object.keys(item.json);

						return acc.concat(itemColumns);
					}, [] as string[]),
				),
			];
			insertItems = this.helpers.copyInputItems(items, columns);
		}

		if (dataMode === DATA_MODE.MANUAL) {
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

		const escapedColumns = columns.map(escapeSqlIdentifier).join(', ');
		const placeholder = `(${columns.map(() => '?').join(',')})`;
		const replacements = items.map(() => placeholder).join(',');

		const query = `INSERT ${priority} ${ignore} INTO ${escapeSqlIdentifier(
			table,
		)} (${escapedColumns}) VALUES ${replacements}`;

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

			if (dataMode === DATA_MODE.AUTO_MAP) {
				columns = Object.keys(items[i].json);
				insertItem = columns.reduce((acc, key) => {
					if (columns.includes(key)) {
						acc[key] = items[i].json[key];
					}
					return acc;
				}, {} as IDataObject);
			}

			if (dataMode === DATA_MODE.MANUAL) {
				const valuesToSend = (this.getNodeParameter('valuesToSend', i, []) as IDataObject)
					.values as IDataObject[];

				insertItem = valuesToSend.reduce((acc, { column, value }) => {
					acc[column as string] = value;
					return acc;
				}, {} as IDataObject);

				columns = Object.keys(insertItem);
			}

			const escapedColumns = columns.map(escapeSqlIdentifier).join(', ');
			const placeholder = `(${columns.map(() => '?').join(',')})`;

			const query = `INSERT ${priority} ${ignore} INTO ${escapeSqlIdentifier(
				table,
			)} (${escapedColumns}) VALUES ${placeholder};`;

			const values = Object.values(insertItem) as QueryValues;

			queries.push({ query, values });
		}
	}

	returnData = await runQueries(queries);

	return returnData;
}
