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
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Connection Timeout',
				name: 'connectionTimeoutMillis',
				type: 'number',
				default: 0,
				description: 'Number of milliseconds reserved for connecting to the database',
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
			{
				displayName: 'Skip on Conflict',
				name: 'skipOnConflict',
				type: 'boolean',
				default: false,
				description:
					'Whether to skip the row and do not throw error if a unique constraint or exclusion constraint is violated',
			},
			{
				displayName: 'Output Large-Format Numbers As',
				name: 'largeNumbersOutput',
				type: 'options',
				options: [
					{
						name: 'Numbers',
						value: 'numbers',
					},
					{
						name: 'Text',
						value: 'text',
						description:
							'Use this if you expect numbers longer than 16 digits (otherwise numbers may be incorrect)',
					},
				],
				hint: 'Applies to NUMERIC and BIGINT columns only',
				default: 'text',
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

	const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
	const options = this.getNodeParameter('options', 0);

	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials, options);

	const priority = (options.priority as string) || '';
	const ignore = (options.skipOnConflict as boolean) ? 'IGNORE' : '';

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
		for (let i = 0; i < items.length; i++) {
			try {
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

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
				} else {
					await connection.end();
					throw error;
				}
			}
		}
	}

	if (queryBatching === 'transaction') {
		await connection.beginTransaction();

		for (let i = 0; i < items.length; i++) {
			try {
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

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
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

		await connection.commit();
	}

	await connection.end();

	return returnData;
}
