import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { connect, copyInputItems, destroy, execute } from './GenericFunctions';

import snowflake from 'snowflake-sdk';

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
		inputs: ['main'],
		outputs: ['main'],
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
				typeOptions: {
					alwaysOpenEditWindow: true,
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
		const credentials = (await this.getCredentials(
			'snowflake',
		)) as unknown as snowflake.ConnectionOptions;
		const returnData: IDataObject[] = [];
		let responseData;

		const connection = snowflake.createConnection(credentials);

		await connect(connection);

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			for (let i = 0; i < items.length; i++) {
				const query = this.getNodeParameter('query', i) as string;
				responseData = await execute(connection, query, []);
				returnData.push.apply(returnData, responseData as IDataObject[]);
			}
		}

		if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map((column) => column.trim());
			const query = `INSERT INTO ${table}(${columns.join(',')}) VALUES (${columns
				.map((_column) => '?')
				.join(',')})`;
			const data = copyInputItems(items, columns);
			const binds = data.map((element) => Object.values(element));
			await execute(connection, query, binds as unknown as snowflake.InsertBinds);
			returnData.push.apply(returnData, data);
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

			const query = `UPDATE ${table} SET ${columns
				.map((column) => `${column} = ?`)
				.join(',')} WHERE ${updateKey} = ?;`;
			const data = copyInputItems(items, columns);
			const binds = data.map((element) => Object.values(element).concat(element[updateKey]));
			for (let i = 0; i < binds.length; i++) {
				await execute(connection, query, binds[i] as unknown as snowflake.InsertBinds);
			}
			returnData.push.apply(returnData, data);
		}

		await destroy(connection);

		return [this.helpers.returnJsonArray(returnData)];
	}
}
