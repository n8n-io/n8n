import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { copyInputItems } from '../../helpers/utils';
import { createConnection } from '../../transport';
import { tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	tableRLC,
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		requiresDataPath: 'multiple',
		default: '',
		placeholder: 'id,name,description',
		description:
			'Comma-separated list of the properties which should used as columns for the new rows',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add modifiers',
		description: 'Modifiers for INSERT statement',
		options: [
			{
				displayName: 'Ignore',
				name: 'ignore',
				type: 'boolean',
				default: true,
				description:
					'Whether to ignore any ignorable errors that occur while executing the INSERT statement',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: [
					{
						name: 'Low Prioirity',
						value: 'LOW_PRIORITY',
						description:
							'Delays execution of the INSERT until no other clients are reading from the table',
					},
					{
						name: 'High Priority',
						value: 'HIGH_PRIORITY',
						description:
							'Overrides the effect of the --low-priority-updates option if the server was started with that option. It also causes concurrent inserts not to be used.',
					},
				],
				default: 'LOW_PRIORITY',
				description: 'Ignore any ignorable errors that occur while executing the INSERT statement',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['insert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials);

	try {
		const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
		const columnString = this.getNodeParameter('columns', 0) as string;
		const columns = columnString.split(',').map((column) => column.trim());
		const insertItems = copyInputItems(items, columns);
		const insertPlaceholder = `(${columns.map((_column) => '?').join(',')})`;
		const options = this.getNodeParameter('options', 0);
		const insertIgnore = options.ignore as boolean;
		const insertPriority = options.priority as string;

		const insertSQL = `INSERT ${insertPriority || ''} ${
			insertIgnore ? 'IGNORE' : ''
		} INTO ${table}(${columnString}) VALUES ${items.map((_item) => insertPlaceholder).join(',')};`;
		const queryItems = insertItems.reduce(
			(collection: IDataObject[], item) => collection.concat(Object.values(item) as IDataObject[]),
			[],
		);

		const queryResult = await connection.query(insertSQL, queryItems);

		returnData = this.helpers.returnJsonArray(queryResult[0] as unknown as IDataObject);
	} catch (error) {
		if (this.continueOnFail()) {
			returnData = this.helpers.returnJsonArray({ error: error.message });
		} else {
			await connection.end();
			throw error;
		}
	}

	await connection.end();

	return returnData;
}
