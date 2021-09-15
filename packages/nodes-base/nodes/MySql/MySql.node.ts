import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
// @ts-ignore
import * as mysql2 from 'mysql2/promise';

import { copyInputItems } from './GenericFunctions';

export class MySql implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MySQL',
		name: 'mySql',
		icon: 'file:mysql.svg',
		group: ['input'],
		version: 1,
		description: 'Get, add and update data in MySQL',
		defaults: {
			name: 'MySQL',
			color: '#4279a2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mySql',
				required: true,
			},
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
						description: 'Execute an SQL query.',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in database.',
					},
				],
				default: 'insert',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         executeQuery
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						operation: [
							'executeQuery',
						],
					},
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE id < 40',
				required: true,
				description: 'The SQL query to execute.',
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
						operation: [
							'insert',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to insert data to.',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert',
						],
					},
				},
				default: '',
				placeholder: 'id,name,description',
				description: 'Comma separated list of the properties which should used as columns for the new rows.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'insert',
						],
					},
				},
				default: {},
				placeholder: 'Add modifiers',
				description: 'Modifiers for INSERT statement.',
				options: [
					{
						displayName: 'Ignore',
						name: 'ignore',
						type: 'boolean',
						default: true,
						description: 'Ignore any ignorable errors that occur while executing the INSERT statement.',
					},
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [
							{
								name: 'Low Prioirity',
								value: 'LOW_PRIORITY',
								description: 'Delays execution of the INSERT until no other clients are reading from the table.',
							},
							{
								name: 'High Priority',
								value: 'HIGH_PRIORITY',
								description: 'Overrides the effect of the --low-priority-updates option if the server was started with that option. It also causes concurrent inserts not to be used.',
							},
						],
						default: 'LOW_PRIORITY',
						description: 'Ignore any ignorable errors that occur while executing the INSERT statement.',
					},
				],
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
						operation: [
							'update',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to update data in',
			},
			{
				displayName: 'Update Key',
				name: 'updateKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				default: 'id',
				required: true,
				description: 'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				default: '',
				placeholder: 'name,description',
				description: 'Comma separated list of the properties which should used as columns for rows to update.',
			},

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('mySql');

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		// Destructuring SSL configuration
		const {
			ssl,
			caCertificate,
			clientCertificate,
			clientPrivateKey,
			...baseCredentials
		} = credentials;

		if (ssl) {
			baseCredentials.ssl = {};

			if (caCertificate) {
				baseCredentials.ssl.ca = caCertificate;
			}

			// client certificates might not be required
			if (clientCertificate || clientPrivateKey) {
				baseCredentials.ssl.cert = clientCertificate;
				baseCredentials.ssl.key = clientPrivateKey;
			}
		}

		const connection = await mysql2.createConnection(baseCredentials);
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		let returnItems = [];

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			try {
				const queryQueue = items.map((item, index) => {
					const rawQuery = this.getNodeParameter('query', index) as string;

					return connection.query(rawQuery);
				});

				const queryResult = (await Promise.all(queryQueue) as mysql2.OkPacket[][]).reduce((collection, result) => {
					const [rows, fields] = result;

					if (Array.isArray(rows)) {
						return collection.concat(rows);
					}

					collection.push(rows);

					return collection;
				}, []);

				returnItems = this.helpers.returnJsonArray(queryResult as unknown as IDataObject[]);

			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: error.message });
				} else {
					await connection.end();
					throw error;
				}
			}
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			try {
				const table = this.getNodeParameter('table', 0) as string;
				const columnString = this.getNodeParameter('columns', 0) as string;
				const columns = columnString.split(',').map(column => column.trim());
				const insertItems = copyInputItems(items, columns);
				const insertPlaceholder = `(${columns.map(column => '?').join(',')})`;
				const options = this.getNodeParameter('options', 0) as IDataObject;
				const insertIgnore = options.ignore as boolean;
				const insertPriority = options.priority as string;

				const insertSQL = `INSERT ${insertPriority || ''} ${insertIgnore ? 'IGNORE' : ''} INTO ${table}(${columnString}) VALUES ${items.map(item => insertPlaceholder).join(',')};`;
				const queryItems = insertItems.reduce((collection, item) => collection.concat(Object.values(item as any)), []); // tslint:disable-line:no-any

				const queryResult = await connection.query(insertSQL, queryItems);

				returnItems = this.helpers.returnJsonArray(queryResult[0] as unknown as IDataObject);
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: error.message });
				} else {
					await connection.end();
					throw error;
				}
			}

		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			try {
				const table = this.getNodeParameter('table', 0) as string;
				const updateKey = this.getNodeParameter('updateKey', 0) as string;
				const columnString = this.getNodeParameter('columns', 0) as string;
				const columns = columnString.split(',').map(column => column.trim());

				if (!columns.includes(updateKey)) {
					columns.unshift(updateKey);
				}

				const updateItems = copyInputItems(items, columns);
				const updateSQL = `UPDATE ${table} SET ${columns.map(column => `${column} = ?`).join(',')} WHERE ${updateKey} = ?;`;
				const queryQueue = updateItems.map((item) => connection.query(updateSQL, Object.values(item).concat(item[updateKey])));
				const queryResult = await Promise.all(queryQueue);
				returnItems = this.helpers.returnJsonArray(queryResult.map(result => result[0]) as unknown as IDataObject[]);

			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: error.message });
				} else {
					await connection.end();
					throw error;
				}
			}
		} else {
			if (this.continueOnFail()) {
				returnItems = this.helpers.returnJsonArray({ error: `The operation "${operation}" is not supported!` });
			} else {
				await connection.end();
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
			}
		}

		await connection.end();

		return this.prepareOutputData(returnItems);
	}
}
