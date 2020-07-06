import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { chunk, flatten, sum } from 'lodash';

import * as mssql from 'mssql';

import {
	copyInputItems,
	extractValues,
	extractUpdateSet,
	extractUpdateCondition,
	extractDeleteValues
} from './GenericFunctions';

export class MicrosoftSqlServer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SQL Server',
		name: 'microsoftSqlServer',
		icon: 'file:mssql.png',
		group: ['input'],
		version: 1,
		description: 'Gets, add and update data in Microsoft SQL Server.',
		defaults: {
			name: 'Microsoft SQL Server',
			color: '#1d4bab'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftSqlServer',
				required: true
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Executes a SQL query.'
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database.'
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Updates rows in database.'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Deletes rows in database.'
					}
				],
				default: 'insert',
				description: 'The operation to perform.'
			},

			// ----------------------------------
			//         executeQuery
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 5
				},
				displayOptions: {
					show: {
						operation: ['executeQuery']
					}
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE id < 40',
				required: true,
				description: 'The SQL query to execute.'
			},

			// ----------------------------------
			//         insert
			// ----------------------------------
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert']
					}
				},
				default: '',
				required: true,
				description: 'Name of the table in which to insert data to.'
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert']
					}
				},
				default: '',
				placeholder: 'id,name,description',
				description:
					'Comma separated list of the properties which should used as columns for the new rows.'
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update']
					}
				},
				default: '',
				required: true,
				description: 'Name of the table in which to update data in'
			},
			{
				displayName: 'Update Key',
				name: 'updateKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update']
					}
				},
				default: 'id',
				required: true,
				description:
					'Name of the property which decides which rows in the database should be updated. Normally that would be "id".'
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update']
					}
				},
				default: '',
				placeholder: 'name,description',
				description:
					'Comma separated list of the properties which should used as columns for rows to update.'
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['delete']
					}
				},
				default: '',
				required: true,
				description: 'Name of the table in which to delete data.'
			},
			{
				displayName: 'Delete Key',
				name: 'deleteKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['delete']
					}
				},
				default: 'id',
				required: true,
				description:
					'Name of the property which decides which rows in the database should be deleted. Normally that would be "id".'
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getCredentials('microsoftSqlServer');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const config = {
			server: credentials.server as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
			domain: credentials.domain ? (credentials.domain as string) : undefined
		};

		const pool = new mssql.ConnectionPool(config);
		await pool.connect();

		let returnItems: any = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		// asdf = {
		// 	tableName: [{ values, columns }]
		// };

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const rawQuery = this.getNodeParameter('query', 0) as string;

			const queryResult = await pool.request().query(rawQuery);

			const result =
				queryResult.recordsets.length > 1
					? flatten(queryResult.recordsets)
					: queryResult.recordsets[0];

			returnItems = this.helpers.returnJsonArray(result as IDataObject[]);
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map(column => column.trim());

			const insertValuesList = chunk(copyInputItems(items, columns), 1000);
			const queryQueue = insertValuesList.map(insertValues => {
				const values = insertValues.map(item => extractValues(item)).join(',');

				return pool
					.request()
					.query(`INSERT INTO ${table}(${columnString}) VALUES ${values};`);
			});
			const queryResult = await Promise.all(queryQueue);
			const result = queryResult.reduce(
				(acc, item): number => (acc += sum(item.rowsAffected)),
				0
			);

			returnItems = this.helpers.returnJsonArray({
				rowsAffected: result
			} as IDataObject);
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const updateKey = this.getNodeParameter('updateKey', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map(column => column.trim());

			const updateItems = copyInputItems(items, [updateKey].concat(columns));
			const queryQueue = updateItems.map(item => {
				const setValues = extractUpdateSet(item, columns);
				const condition = extractUpdateCondition(item, updateKey);

				return pool
					.request()
					.query(`UPDATE ${table} SET ${setValues} WHERE ${condition};`);
			});
			const queryResult = await Promise.all(queryQueue);
			const result = queryResult.reduce(
				(acc, item): number => (acc += sum(item.rowsAffected)),
				0
			);

			returnItems = this.helpers.returnJsonArray({
				rowsAffected: result
			} as IDataObject);
		} else if (operation === 'delete') {
			// ----------------------------------
			//         delete
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const deleteKey = this.getNodeParameter('deleteKey', 0) as string;

			const deleteItemsList = chunk(copyInputItems(items, [deleteKey]), 1000);

			const queryQueue = deleteItemsList.map(deleteValues => {
				console.log(extractDeleteValues(deleteValues, deleteKey));
				return pool
					.request()
					.query(
						`DELETE FROM ${table} WHERE ${deleteKey} IN ${extractDeleteValues(
							deleteValues,
							deleteKey
						)};`
					);
			});
			const queryResult = await Promise.all(queryQueue);

			const result = queryResult.reduce(
				(acc, item): number => (acc += sum(item.rowsAffected)),
				0
			);

			returnItems = this.helpers.returnJsonArray({
				rowsAffected: result
			} as IDataObject);
		} else {
			await pool.close();
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		// Close the connection
		await pool.close();

		return this.prepareOutputData(returnItems);
	}
}
