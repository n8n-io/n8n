import type mysql2 from 'mysql2/promise';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { oldVersionNotice } from '@utils/descriptions';
import { getResolvables } from '@utils/utilities';

import { createConnection, searchTables } from './GenericFunctions';
import type { QueryValues } from '../v2/helpers/interfaces';
import { escapeSqlIdentifier, prepareSafeQuery } from '../v2/helpers/utils';

const versionDescription: INodeTypeDescription = {
	displayName: 'MySQL',
	name: 'mySql',
	icon: 'file:mysql.svg',
	group: ['input'],
	version: 1,
	description: 'Get, add and update data in MySQL',
	defaults: {
		name: 'MySQL',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'mySql',
			required: true,
			testedBy: 'mysqlConnectionTest',
		},
	],
	properties: [
		oldVersionNotice,
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
				sqlDialect: 'MySQL',
			},
			displayOptions: {
				show: {
					operation: ['executeQuery'],
				},
			},
			default: '',
			placeholder: 'SELECT id, name FROM product WHERE id < 40',
			required: true,
			description:
				"The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.",
			hint: 'Consider using query parameters to prevent SQL injection attacks. Add them in the options below',
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
			displayOptions: {
				show: {
					operation: ['insert', 'executeQuery'],
				},
			},
			default: {},
			placeholder: 'Add option',
			options: [
				{
					displayName: 'Query Parameters',
					name: 'queryReplacement',
					type: 'string',
					default: '',
					placeholder: 'e.g. value1,value2,value3',
					description:
						'Comma-separated list of the values you want to use as query parameters. You can drag the values from the input panel on the left. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql/" target="_blank">More info</a>',
					hint: 'Comma-separated list of values: reference them in your query as $1, $2, $3…',
					displayOptions: {
						show: {
							'/operation': ['executeQuery'],
						},
					},
				},
				{
					displayName: 'Ignore',
					name: 'ignore',
					type: 'boolean',
					default: true,
					description:
						'Whether to ignore any ignorable errors that occur while executing the INSERT statement',
					displayOptions: {
						show: {
							'/operation': ['insert'],
						},
					},
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
					displayOptions: {
						show: {
							'/operation': ['insert'],
						},
					},
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
	],
};

export class MySqlV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		credentialTest: {
			async mysqlConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;
				try {
					const connection = await createConnection(credentials);
					await connection.end();
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
			searchTables,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('mySql');
		const connection = await createConnection(credentials);
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let returnItems: INodeExecutionData[] = [];

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			try {
				const queryQueue = items.map(async (_, index) => {
					let rawQuery = (this.getNodeParameter('query', index) as string).trim();

					for (const resolvable of getResolvables(rawQuery)) {
						rawQuery = rawQuery.replace(
							resolvable,
							this.evaluateExpression(resolvable, index) as string,
						);
					}

					const options = this.getNodeParameter('options', index, {});
					let queryReplacement = options.queryReplacement ?? [];

					if (typeof queryReplacement === 'string') {
						queryReplacement = queryReplacement.split(',').map((entry) => entry.trim());
					}

					if (!Array.isArray(queryReplacement)) {
						throw new NodeOperationError(
							this.getNode(),
							'Query Parameters must be a string of comma-separated values, or an array of values',
							{ itemIndex: index },
						);
					}

					const { query, values } = prepareSafeQuery(rawQuery, queryReplacement as QueryValues);

					return values.length
						? await connection.query(query, values)
						: await connection.query(query);
				});

				returnItems = ((await Promise.all(queryQueue)) as mysql2.OkPacket[][]).reduce(
					(collection, result, index) => {
						const [rows] = result;

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(rows as unknown as IDataObject[]),
							{ itemData: { item: index } },
						);

						collection = collection.concat(executionData);

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

			try {
				const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
				const columnString = this.getNodeParameter('columns', 0) as string;
				const columns = columnString.split(',').map((column) => column.trim());
				const insertItems = this.helpers.copyInputItems(items, columns);
				const insertPlaceholder = `(${columns.map((_column) => '?').join(',')})`;
				const options = this.getNodeParameter('options', 0);
				const insertIgnore = options.ignore as boolean;
				const insertPriority = options.priority as string;

				const insertSQL = `INSERT ${insertPriority || ''} ${
					insertIgnore ? 'IGNORE' : ''
				} INTO ${escapeSqlIdentifier(table)}(${columns.map(escapeSqlIdentifier).join(',')}) VALUES ${items
					.map((_item) => insertPlaceholder)
					.join(',')};`;
				const queryItems = insertItems.reduce(
					(collection: IDataObject[], item) =>
						collection.concat(Object.values(item) as IDataObject[]),
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

			try {
				const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
				const updateKey = this.getNodeParameter('updateKey', 0) as string;
				const columnString = this.getNodeParameter('columns', 0) as string;
				const columns = columnString.split(',').map((column) => column.trim());

				if (!columns.includes(updateKey)) {
					columns.unshift(updateKey);
				}

				const updateItems = this.helpers.copyInputItems(items, columns);
				const updateSQL = `UPDATE ${escapeSqlIdentifier(table)} SET ${columns
					.map((column) => `${escapeSqlIdentifier(column)} = ?`)
					.join(',')} WHERE ${escapeSqlIdentifier(updateKey)} = ?;`;
				const queryQueue = updateItems.map(
					async (item) =>
						await connection.query(updateSQL, Object.values(item).concat(item[updateKey])),
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
		} else {
			if (this.continueOnFail()) {
				returnItems = this.helpers.returnJsonArray({
					error: `The operation "${operation}" is not supported!`,
				});
			} else {
				await connection.end();
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
			}
		}

		await connection.end();

		return [returnItems];
	}
}
