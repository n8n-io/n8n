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
				displayName: 'Query Batching',
				name: 'queryBatching',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Multiple Queries',
						value: 'multiple',
						description: 'A single query for all incoming items',
					},
					{
						name: 'Independently',
						value: 'independently',
						description: 'Execute one query per incoming item',
					},
					{
						name: 'Transaction',
						value: 'transaction',
						description:
							'Execute all queries in a transaction, if a failure occurs, all changes are rolled back',
					},
				],
				default: 'multiple',
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

	const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
	const options = this.getNodeParameter('options', 0);

	const priority = (options.priority as string) || '';
	const ignore = (options.ignore as boolean) ? 'IGNORE' : '';

	const queryBatching = (options.queryBatching as string) || 'multiple';

	if (queryBatching === 'multiple') {
		try {
			const columns = (this.getNodeParameter('columns', 0) as string)
				.split(',')
				.map((column) => column.trim());

			const insertItems = copyInputItems(items, columns);

			const escapedColumns = columns.map((column) => `\`${column}\``).join(', ');
			const placeholder = `(${columns.map(() => '?').join(',')})`;
			const replacements = items.map(() => placeholder).join(',');

			const query = `INSERT ${priority} ${ignore} INTO \`${table}\` (${escapedColumns}) VALUES ${replacements};`;

			const values = insertItems.reduce(
				(acc: IDataObject[], item) => acc.concat(Object.values(item) as IDataObject[]),
				[],
			);

			const queryResult = await connection.query(query, values);

			returnData = this.helpers.returnJsonArray(queryResult[0] as unknown as IDataObject);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData = this.helpers.returnJsonArray({ error: error.message });
			} else {
				await connection.end();
				throw error;
			}
		}
	}

	if (queryBatching === 'independently') {
		try {
			for (let i = 0; i < items.length; i++) {
				const columns = (this.getNodeParameter('columns', i) as string)
					.split(',')
					.map((column) => column.trim());

				const insertItem = Object.keys(items[i].json).reduce((acc, key) => {
					if (columns.includes(key)) {
						acc[key] = items[i].json[key];
					}
					return acc;
				}, {} as IDataObject);

				const escapedColumns = columns.map((column) => `\`${column}\``).join(', ');
				const placeholder = `(${columns.map(() => '?').join(',')})`;

				const query = `INSERT ${priority} ${ignore} INTO \`${table}\` (${escapedColumns}) VALUES ${placeholder};`;

				const values = Object.values(insertItem);

				const response = (await connection.query(query, values))[0] as unknown as IDataObject;

				returnData.push({ json: response });
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
			} else {
				await connection.end();
				throw error;
			}
		}
	}

	if (queryBatching === 'transaction') {
		try {
			await connection.beginTransaction();

			for (let i = 0; i < items.length; i++) {
				const columns = (this.getNodeParameter('columns', i) as string)
					.split(',')
					.map((column) => column.trim());

				const insertItem = Object.keys(items[i].json).reduce((acc, key) => {
					if (columns.includes(key)) {
						acc[key] = items[i].json[key];
					}
					return acc;
				}, {} as IDataObject);

				const escapedColumns = columns.map((column) => `\`${column}\``).join(', ');
				const placeholder = `(${columns.map(() => '?').join(',')})`;

				const query = `INSERT ${priority} ${ignore} INTO \`${table}\` (${escapedColumns}) VALUES ${placeholder};`;

				const values = Object.values(insertItem);

				const response = (await connection.query(query, values))[0] as unknown as IDataObject;

				returnData.push({ json: response });
			}

			await connection.commit();
		} catch (error) {
			if (connection) {
				await connection.rollback();
				await connection.end();
			}

			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				return returnData;
			} else {
				throw error;
			}
		}
	}

	await connection.end();

	return returnData;
}
