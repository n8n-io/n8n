import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
// import type { Mysql2OkPacket } from '../../helpers/interfaces';
import { prepareQueryAndReplacements } from '../../helpers/utils';
import { createConnection, createPool } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'SELECT id, name FROM product WHERE id < 40',
		required: true,
		description: 'The SQL query to execute',
	},
	{
		displayName: `
		You can use <strong>Query Values Replacement</strong> to map values in <strong>Query</strong>, to reference first value use $1,to reference second $2 and so on, if value is SQL name or identifier add :name,<br/>
		e.g. SELECT * FROM $1:name WHERE id = $2;`,
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Query Values Replacement',
		name: 'queryReplacement',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		placeholder: 'Add Value',
		description:
			'Value has to be of type number, bigint, string, boolean, Date and null, types Array and Object will be converted to string',
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Query Batching',
				name: 'queryBatching',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Multiple Queries',
						value: 'multiple',
						description: 'Execute queries for all incoming items, then process the results',
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
		],
	},
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	const credentials = await this.getCredentials('mySql');

	const options = this.getNodeParameter('options', 0);
	const queryBatching = (options.queryBatching as string) || 'independently';

	if (queryBatching === 'multiple') {
		const pool = await createPool(credentials);
		const connection = await pool.getConnection();

		try {
			const queries = items.map((_item, index) => {
				//Trim the query and remove the semicolon at the end, overwise the query will fail when joined by the semicolon
				const rawQuery = (this.getNodeParameter('query', index) as string).trim().replace(/;$/, '');

				const values = (
					this.getNodeParameter('queryReplacement.values', index, []) as IDataObject[]
				).map((entry) => entry.value as string);

				const { newQuery, newValues } = prepareQueryAndReplacements(rawQuery, values);

				const formattedQuery = connection.format(newQuery, newValues);

				return formattedQuery;
			});

			const response = (await pool.query(queries.join(';')))[0] as unknown as IDataObject[][];

			if (response) {
				response.forEach((entry) => {
					returnData.push(...this.helpers.returnJsonArray(entry));
				});
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData = this.helpers.returnJsonArray([{ json: { error: error.message } }]);
			} else {
				connection.release();
				await pool.end();
				throw error;
			}
		}

		connection.release();
		await pool.end();
	}

	if (queryBatching === 'independently') {
		const connection = await createConnection(credentials);

		for (let i = 0; i < items.length; i++) {
			try {
				const rawQuery = this.getNodeParameter('query', i) as string;

				const values = (
					this.getNodeParameter('queryReplacement.values', i, []) as IDataObject[]
				).map((entry) => entry.value as string);

				const { newQuery, newValues } = prepareQueryAndReplacements(rawQuery, values);

				const formattedQuery = connection.format(newQuery, newValues);

				const response = (
					await connection.query(formattedQuery, values)
				)[0] as unknown as IDataObject;

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
					});
				} else {
					await connection.end();
					throw error;
				}
			}
		}

		await connection.end();
	}

	if (queryBatching === 'transaction') {
		const connection = await createConnection(credentials);
		await connection.beginTransaction();

		for (let i = 0; i < items.length; i++) {
			try {
				const rawQuery = this.getNodeParameter('query', i) as string;

				const values = (
					this.getNodeParameter('queryReplacement.values', i, []) as IDataObject[]
				).map((entry) => entry.value as string);

				const { newQuery, newValues } = prepareQueryAndReplacements(rawQuery, values);

				const formattedQuery = connection.format(newQuery, newValues);

				const response = (
					await connection.query(formattedQuery, values)
				)[0] as unknown as IDataObject;

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
		await connection.end();
	}

	return returnData;
}
