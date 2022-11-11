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
// @ts-ignore
import mysql2 from 'mysql2/promise';

import {
	copyInputItems,
	createCluster,
	createConnection,
	searchCluster,
	searchProject,
	searchTables,
	searchUser,
	tiDBCloudAuth,
} from './GenericFunctions';
import { IExecuteFunctions } from 'n8n-core';

export class TiDBCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TiDB Cloud',
		name: 'tiDBCloud',
		icon: 'file:tiDBCloud.svg',
		group: ['input'],
		version: 1,
		description: 'Use TiDB Cloud',
		defaults: {
			name: 'TiDB Cloud',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'tiDBCloudApi',
				required: true,
				testedBy: 'tidbCloudConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Project',
				name: 'project',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						placeholder: '',
						typeOptions: {
							searchListMethod: 'searchProject',
							searchable: true,
							searchFilterRequired: false,
						},
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Serverless Cluster',
						value: 'createServerlessCluster',
						description: 'Create a TiDB Serverless cluster',
						action: 'Create a TiDB Serverless cluster',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete rows in database',
						action: 'Delete rows in database',
					},
					{
						name: 'Execute SQL',
						value: 'executeSQL',
						description: 'Execute an SQL',
						action: 'Execute an SQL',
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
				],
				default: 'insert',
			},
			{
				displayName: 'Cluster',
				name: 'cluster',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						placeholder: '',
						typeOptions: {
							searchListMethod: 'searchCluster',
							searchable: true,
							searchFilterRequired: false,
						},
					},
				],
				displayOptions: {
					show: {
						operation: ['executeSQL', 'insert', 'update', 'delete'],
					},
				},
			},
			{
				displayName: 'User',
				name: 'user',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						placeholder: '',
						typeOptions: {
							searchListMethod: 'searchUser',
							searchable: true,
							searchFilterRequired: false,
						},
					},
				],
				displayOptions: {
					show: {
						operation: ['executeSQL', 'insert', 'update', 'delete'],
					},
				},
			},
			{
				displayName: 'Database',
				name: 'database',
				type: 'string',
				default: 'test',
				required: true,
				displayOptions: {
					show: {
						operation: ['executeSQL', 'insert', 'update', 'delete'],
					},
				},
			},

			// ----------------------------------
			//    create serverless cluster
			// ----------------------------------
			{
				displayName: 'Cluster Name',
				name: 'clusterName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createServerlessCluster'],
					},
				},
				default: 'Cluster0',
				required: true,
				// validate: (clusterName: string) => return true,
				description:
					'The name of cluster. The name must be 4-64 characters that can only include numbers, letters, and hyphens, and the first and last character must be a letter or number.',
			},
			{
				displayName: 'Region',
				name: 'region',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createServerlessCluster'],
					},
				},
				noDataExpression: true,
				options: [
					{
						name: 'Frankfurt (Eu-Central-1)',
						value: 'eu-central-1',
					},
					{
						name: 'N.Virginia (Us-East-1)',
						value: 'us-east-1',
					},
					{
						name: 'Oregon (Us-West-2)',
						value: 'us-west-2',
					},
					{
						name: 'Singapore (Ap-Southeast-1)',
						value: 'ap-southeast-1',
					},
					{
						name: 'Tokyo (Ap-Northeast-1)',
						value: 'ap-northeast-1',
					},
				],
				default: 'us-west-2',
			},

			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						operation: ['executeSQL', 'insert', 'update', 'delete', 'createServerlessCluster'],
					},
				},
				default: '',
			},

			// ----------------------------------
			//         executeSQL
			// ----------------------------------
			{
				displayName: 'SQL',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						operation: ['executeSQL'],
					},
				},
				default: '',
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
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Table...',
						typeOptions: {
							searchListMethod: 'searchTables',
							searchFilterRequired: false,
							searchable: true,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'table_name',
					},
				],
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
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
				placeholder: 'id,name,description',
				description:
					'Comma-separated list of the properties which should used as columns for the new rows',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
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
						description:
							'Ignore any ignorable errors that occur while executing the INSERT statement',
					},
				],
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Table',
				name: 'table',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Table...',
						typeOptions: {
							searchListMethod: 'searchTables',
							searchFilterRequired: false,
							searchable: true,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'table_name',
					},
				],
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
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
				description:
					'Name of the property which decides which rows in the database should be updated',
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
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Table...',
						typeOptions: {
							searchListMethod: 'searchTables',
							searchFilterRequired: false,
							searchable: true,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'table_name',
					},
				],
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				description: 'Name of the table in which to delete data in',
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
				description:
					'Name of the propertys which decides which rows in the database should be delete',
			},
		],
	};

	methods = {
		credentialTest: {
			async tidbCloudConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					const credentialsForTest = credential.data as ICredentialDataDecryptedObject;
					await tiDBCloudAuth.call(this, credentialsForTest);
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
		listSearch: {
			searchCluster,
			searchProject,
			searchTables,
			searchUser,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let connection: mysql2.Connection;
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		let returnItems: INodeExecutionData[] = [];

		if (operation === 'executeSQL') {
			// ----------------------------------
			//         executeSQL
			// ----------------------------------
			connection = await createConnection.call(this);
			try {
				const queryQueue = items.map((item, index) => {
					const rawQuery = this.getNodeParameter('query', index) as string;

					return connection.query(rawQuery);
				});

				returnItems = ((await Promise.all(queryQueue)) as mysql2.OkPacket[][]).reduce(
					(collection, result, index) => {
						const [rows] = result;

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(rows as unknown as IDataObject[]),
							{ itemData: { item: index } },
						);

						collection.push(...executionData);

						return collection;
					},
					[] as INodeExecutionData[],
				);
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
			connection = await createConnection.call(this);
			try {
				const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
				const columnString = this.getNodeParameter('columns', 0) as string;
				const columns = columnString.split(',').map((column) => column.trim());
				const insertItems = copyInputItems(items, columns);
				const insertPlaceholder = `(${columns.map((column) => '?').join(',')})`;
				const options = this.getNodeParameter('options', 0) as IDataObject;
				const insertIgnore = options.ignore as boolean;
				const insertPriority = options.priority as string;

				const insertSQL = `INSERT ${insertPriority || ''} ${
					insertIgnore ? 'IGNORE' : ''
				} INTO ${table}(${columnString}) VALUES ${items
					.map((item) => insertPlaceholder)
					.join(',')};`;
				const queryItems = insertItems.reduce(
					(collection, item) => collection.concat(Object.values(item as any)), // tslint:disable-line:no-any
					[],
				);
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
			connection = await createConnection.call(this);
			try {
				const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
				const updateKey = this.getNodeParameter('updateKey', 0) as string;
				const columnString = this.getNodeParameter('columns', 0) as string;
				const columns = columnString.split(',').map((column) => column.trim());

				if (!columns.includes(updateKey)) {
					columns.unshift(updateKey);
				}

				const updateItems = copyInputItems(items, columns);
				const updateSQL = `UPDATE ${table} SET ${columns
					.map((column) => `${column} = ?`)
					.join(',')} WHERE ${updateKey} = ?;`;
				const queryQueue = updateItems.map((item) =>
					connection.query(updateSQL, Object.values(item).concat(item[updateKey])),
				);
				const queryResult = await Promise.all(queryQueue);
				returnItems = this.helpers.returnJsonArray(
					queryResult.map((result) => result[0]) as unknown as IDataObject[],
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: error.message });
				} else {
					await connection.end();
					throw error;
				}
			}
		} else if (operation === 'delete') {
			// ----------------------------------
			//         delete
			// ----------------------------------
			connection = await createConnection.call(this);
			const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
			const deleteKey = this.getNodeParameter('deleteKey', 0) as string;
			const deleteItems = copyInputItems(items, [deleteKey]);
			const deleteSQL = `DELETE FROM ${table} WHERE ${deleteKey} =  ?;`;
			const queryItems = deleteItems.reduce(
				(collection, item) => collection.concat(Object.values(item as any)), // tslint:disable-line:no-any
				[],
			);
			const queryResult = await connection.query(deleteSQL, queryItems);
			returnItems = this.helpers.returnJsonArray(queryResult[0] as unknown as IDataObject);
		} else if (operation === 'createServerlessCluster') {
			let result;
			 try {
				 await createCluster.call(this);
				 result = {
					 result: 'Success to create TiDB Serverless cluster.',
				 };
			 } catch (error) {
				 result = {
					 result: 'Failed to create TiDB Serverless cluster.',
					 message: error.message,
				 };
			 }
			returnItems = this.helpers.returnJsonArray(result as IDataObject);
		} else {
			if (this.continueOnFail()) {
				returnItems = this.helpers.returnJsonArray({
					error: `The operation "${operation}" is not supported!`,
				});
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
			}
		}

		// @ts-ignore
		if (connection) {
			await connection.end();
		}
		return this.prepareOutputData(returnItems);
	}
}
