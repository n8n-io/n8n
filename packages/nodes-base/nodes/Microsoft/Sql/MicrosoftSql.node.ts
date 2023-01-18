import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { chunk, flatten } from '../../utils/utilities';

import mssql from 'mssql';

import { ITables } from './TableInterface';

import {
	copyInputItem,
	createTableStruct,
	executeQueryQueue,
	extractDeleteValues,
	extractUpdateCondition,
	extractUpdateSet,
	extractValues,
	formatColumns,
} from './GenericFunctions';

export class MicrosoftSql implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SQL',
		name: 'microsoftSql',
		icon: 'file:mssql.svg',
		group: ['input'],
		version: 1,
		description: 'Get, add and update data in Microsoft SQL',
		defaults: {
			name: 'Microsoft SQL',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftSql',
				required: true,
				testedBy: 'microsoftSqlConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute an SQL query',
						action: 'Execute a SQL query',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database',
						action: 'Insert rows in database',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in database',
						action: 'Update rows in database',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete rows in database',
						action: 'Delete rows in database',
					},
				],
				default: 'insert',
			},

			// ----------------------------------
			//         executeQuery
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
				placeholder: 'SELECT id, name FROM product WHERE id < 40',
				required: true,
				description: 'The SQL query to execute',
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
						operation: ['insert'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to insert data to',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
				placeholder: 'id,name,description',
				description:
					'Comma-separated list of the properties which should used as columns for the new rows',
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
						operation: ['update'],
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
						operation: ['update'],
					},
				},
				default: 'id',
				required: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: '',
				placeholder: 'name,description',
				description:
					'Comma-separated list of the properties which should used as columns for rows to update',
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
						operation: ['delete'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to delete data',
			},
			{
				displayName: 'Delete Key',
				name: 'deleteKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: 'id',
				required: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'Name of the property which decides which rows in the database should be deleted. Normally that would be "id".',
			},
		],
	};

	methods = {
		credentialTest: {
			async microsoftSqlConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;
				try {
					const config = {
						server: credentials.server as string,
						port: credentials.port as number,
						database: credentials.database as string,
						user: credentials.user as string,
						password: credentials.password as string,
						domain: credentials.domain ? (credentials.domain as string) : undefined,
						connectionTimeout: credentials.connectTimeout as number,
						requestTimeout: credentials.requestTimeout as number,
						options: {
							encrypt: credentials.tls as boolean,
							enableArithAbort: false,
						},
					};
					const pool = new mssql.ConnectionPool(config);
					await pool.connect();
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('microsoftSql');

		const config = {
			server: credentials.server as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
			domain: credentials.domain ? (credentials.domain as string) : undefined,
			connectionTimeout: credentials.connectTimeout as number,
			requestTimeout: credentials.requestTimeout as number,
			options: {
				encrypt: credentials.tls as boolean,
				enableArithAbort: false,
				tdsVersion: credentials.tdsVersion as string,
			},
		};

		const pool = new mssql.ConnectionPool(config);
		await pool.connect();

		const returnItems: INodeExecutionData[] = [];
		let responseData: IDataObject | IDataObject[] = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);

		try {
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

				responseData = result;
			} else if (operation === 'insert') {
				// ----------------------------------
				//         insert
				// ----------------------------------

				const tables = createTableStruct(this.getNodeParameter, items);
				await executeQueryQueue(
					tables,
					({
						table,
						columnString,
						// eslint-disable-next-line @typescript-eslint/no-shadow
						items,
					}: {
						table: string;
						columnString: string;
						items: IDataObject[];
					}): Array<Promise<object>> => {
						return chunk(items, 1000).map(async (insertValues) => {
							const values = insertValues.map((item: IDataObject) => extractValues(item)).join(',');
							return pool
								.request()
								.query(`INSERT INTO ${table}(${formatColumns(columnString)}) VALUES ${values};`);
						});
					},
				);

				responseData = items;
			} else if (operation === 'update') {
				// ----------------------------------
				//         update
				// ----------------------------------

				const updateKeys = items.map(
					(item, index) => this.getNodeParameter('updateKey', index) as string,
				);
				const tables = createTableStruct(
					this.getNodeParameter,
					items,
					['updateKey'].concat(updateKeys),
					'updateKey',
				);
				await executeQueryQueue(
					tables,
					({
						table,
						columnString,
						// eslint-disable-next-line @typescript-eslint/no-shadow
						items,
					}: {
						table: string;
						columnString: string;
						items: IDataObject[];
					}): Array<Promise<object>> => {
						return items.map(async (item) => {
							const columns = columnString.split(',').map((column) => column.trim());

							const setValues = extractUpdateSet(item, columns);
							const condition = extractUpdateCondition(item, item.updateKey as string);

							return pool.request().query(`UPDATE ${table} SET ${setValues} WHERE ${condition};`);
						});
					},
				);

				responseData = items;
			} else if (operation === 'delete') {
				// ----------------------------------
				//         delete
				// ----------------------------------

				const tables = items.reduce((acc, item, index) => {
					const table = this.getNodeParameter('table', index) as string;
					const deleteKey = this.getNodeParameter('deleteKey', index) as string;
					if (acc[table] === undefined) {
						acc[table] = {};
					}
					if (acc[table][deleteKey] === undefined) {
						acc[table][deleteKey] = [];
					}
					acc[table][deleteKey].push(item);
					return acc;
				}, {} as ITables);

				const queriesResults = await Promise.all(
					Object.keys(tables).map(async (table) => {
						const deleteKeyResults = Object.keys(tables[table]).map(async (deleteKey) => {
							const deleteItemsList = chunk(
								tables[table][deleteKey].map((item) =>
									copyInputItem(item as INodeExecutionData, [deleteKey]),
								),
								1000,
							);
							const queryQueue = deleteItemsList.map(async (deleteValues) => {
								return pool
									.request()
									.query(
										`DELETE FROM ${table} WHERE "${deleteKey}" IN ${extractDeleteValues(
											deleteValues,
											deleteKey,
										)};`,
									);
							});
							return Promise.all(queryQueue);
						});
						return Promise.all(deleteKeyResults);
					}),
				);

				const rowsDeleted = flatten(queriesResults).reduce(
					(acc: number, resp: mssql.IResult<object>): number =>
						(acc += resp.rowsAffected.reduce((sum, val) => (sum += val))),
					0,
				);

				responseData = rowsDeleted;
			} else {
				await pool.close();
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				responseData = items;
			} else {
				await pool.close();
				throw error;
			}
		}

		// Close the connection
		await pool.close();
		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData: { item: 0 } },
		);

		returnItems.push(...executionData);
		return this.prepareOutputData(returnItems);
	}
}
