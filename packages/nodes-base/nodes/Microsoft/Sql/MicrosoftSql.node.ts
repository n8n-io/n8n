import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { ITables } from './interfaces';

import {
	configurePool,
	createTableStruct,
	deleteOperation,
	insertOperation,
	updateOperation,
} from './GenericFunctions';

import { flatten, generatePairedItemData, getResolvables } from '@utils/utilities';

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
				noDataExpression: true,
				typeOptions: {
					editor: 'sqlEditor',
					rows: 5,
					sqlDialect: 'MSSQL',
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
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
				requiresDataPath: 'multiple',
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
				requiresDataPath: 'single',
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
				requiresDataPath: 'multiple',
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
				requiresDataPath: 'single',
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
					const pool = configurePool(credentials);
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

		const pool = configurePool(credentials);
		await pool.connect();

		const returnItems: INodeExecutionData[] = [];
		let responseData: IDataObject | IDataObject[] = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);

		try {
			if (operation === 'executeQuery') {
				let rawQuery = this.getNodeParameter('query', 0) as string;

				for (const resolvable of getResolvables(rawQuery)) {
					rawQuery = rawQuery.replace(resolvable, this.evaluateExpression(resolvable, 0) as string);
				}

				const queryResult = await pool.request().query(rawQuery);

				const result =
					queryResult.recordsets.length > 1
						? flatten(queryResult.recordsets)
						: queryResult.recordsets[0];

				responseData = result;
			} else if (operation === 'insert') {
				const tables = createTableStruct(this.getNodeParameter, items);

				await insertOperation(tables, pool);

				responseData = items;
			} else if (operation === 'update') {
				const updateKeys = items.map(
					(item, index) => this.getNodeParameter('updateKey', index) as string,
				);

				const tables = createTableStruct(
					this.getNodeParameter,
					items,
					['updateKey'].concat(updateKeys),
					'updateKey',
				);

				await updateOperation(tables, pool);

				responseData = items;
			} else if (operation === 'delete') {
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

				responseData = await deleteOperation(tables, pool);
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

		// shuts down the connection pool associated with the db object to allow the process to finish
		await pool.close();

		const itemData = generatePairedItemData(items.length);

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData },
		);

		returnItems.push(...executionData);
		return [returnItems];
	}
}
