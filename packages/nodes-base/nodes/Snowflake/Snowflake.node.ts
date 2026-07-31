import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import snowflake from 'snowflake-sdk';

import { getResolvables } from '@utils/utilities';

import {
	connect,
	destroy,
	escapeSnowflakeIdentifier,
	escapeSnowflakeObjectIdentifier,
	execute,
	getConnectionOptions,
	type SnowflakeCredential,
} from './GenericFunctions';

export class Snowflake implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Snowflake',
		name: 'snowflake',
		icon: 'file:snowflake.svg',
		group: ['input'],
		version: 1,
		description: 'Get, add and update data in Snowflake',
		defaults: {
			name: 'Snowflake',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		credentials: [
			{
				name: 'snowflake',
				required: true,
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
					"The SQL query to execute. Use ? (bound in order) or :1, :2, :3 to refer to the 'Query Parameters' set in the options below.",
				hint: 'Consider using query parameters to prevent SQL injection attacks. Add them in the options below',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['executeQuery'],
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
							'Comma-separated list of the values you want to use as query parameters. You can drag the values from the input panel on the left.',
						hint: 'Comma-separated list of values: reference them in your query as ? (in order) or :1, :2, :3…',
					},
				],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials<SnowflakeCredential>('snowflake');

		const connectionOptions = getConnectionOptions(credentials);
		const connection = snowflake.createConnection(connectionOptions);

		await connect(connection);

		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			for (let i = 0; i < items.length; i++) {
				let query = this.getNodeParameter('query', i) as string;

				for (const resolvable of getResolvables(query)) {
					query = query.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
				}

				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const rawReplacement = options.queryReplacement;
				let binds: snowflake.Bind[] = [];

				if (rawReplacement !== undefined && rawReplacement !== '') {
					if (typeof rawReplacement === 'string') {
						binds = rawReplacement.split(',').map((entry) => entry.trim());
					} else if (Array.isArray(rawReplacement)) {
						binds = rawReplacement as snowflake.Bind[];
					} else {
						throw new NodeOperationError(
							this.getNode(),
							'Query Parameters must be a string of comma-separated values, or an array of values',
							{ itemIndex: i },
						);
					}
				}

				const responseData = await execute(connection, query, binds);
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			}
		}

		if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map((column) => column.trim());
			const quotedTable = escapeSnowflakeObjectIdentifier(table);
			const quotedColumns = columns.map(escapeSnowflakeIdentifier);
			const query = `INSERT INTO ${quotedTable} (${quotedColumns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
			const data = this.helpers.copyInputItems(items, columns);
			const binds = data.map((element) => [...Object.values(element)]);
			await execute(connection, query, binds as snowflake.Binds);
			data.forEach((d, i) => {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(d),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			});
		}

		if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const updateKey = this.getNodeParameter('updateKey', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map((column) => column.trim());

			if (!columns.includes(updateKey)) {
				columns.unshift(updateKey);
			}

			const quotedTable = escapeSnowflakeObjectIdentifier(table);
			const quotedColumns = columns.map(escapeSnowflakeIdentifier);
			const quotedUpdateKey = escapeSnowflakeIdentifier(updateKey);
			const query = `UPDATE ${quotedTable} SET ${quotedColumns.map((col) => `${col} = ?`).join(',')} WHERE ${quotedUpdateKey} = ?;`;
			const data = this.helpers.copyInputItems(items, columns);
			const binds = data.map((element) => {
				const values = Object.values(element);
				const rowBinds: unknown[] = [];
				columns.forEach((_col, idx) => {
					rowBinds.push(values[idx]);
				});
				rowBinds.push(element[updateKey]);
				return rowBinds;
			});
			for (let i = 0; i < binds.length; i++) {
				await execute(connection, query, binds[i] as snowflake.Binds);
			}
			data.forEach((d, i) => {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(d),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			});
		}

		await destroy(connection);
		return [returnData];
	}
}
