import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import * as knex from 'knex';

import { copyInputItems } from './GenericFunctions';

export class MySQL implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MySQL',
		name: 'mysql',
		icon: 'file:mysql.png',
		group: ['input'],
		version: 1,
		description: 'Gets, add and update data in MySQL.',
		defaults: {
			name: 'MySQL',
			color: '#4279a2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mysql',
				required: true,
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
						description: 'Executes a SQL query.',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Updates rows in database.',
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
					rows: 5,
				},
				displayOptions: {
					show: {
						operation: [
							'executeQuery'
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
							'insert'
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
							'insert'
						],
					},
				},
				default: '',
				placeholder: 'id,name,description',
				description: 'Comma separated list of the properties which should used as columns for the new rows.',
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
							'update'
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
							'update'
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
							'update'
						],
					},
				},
				default: '',
				placeholder: 'name,description',
				description: 'Comma separated list of the properties which should used as columns for rows to update.',
			},

		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getCredentials('mysql');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const client = knex({ client: 'mysql2', connection: credentials });
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		let returnItems = [];

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const queryQueue = items.map((item, index) => {
				const rawQuery = this.getNodeParameter('query', index) as string;

				return client.raw(rawQuery);
			});
			let queryResult = await Promise.all(queryQueue);

			queryResult = queryResult.reduce((result, current) => {
				if (Array.isArray(current[0])) {
					return result.concat(current[0]);
				}

				result.push(current[0]);

				return result;
			}, []);

			returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);

		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map(column => column.trim());
			const insertItems = copyInputItems(items, columns);
			const insertData = await client.insert(insertItems).into(table);

			returnItems = [{ json: { row_count: insertData[0] }}];

		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const updateKey = this.getNodeParameter('updateKey', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map(column => column.trim());

			if (!columns.includes(updateKey)) {
				columns.unshift(updateKey);
			}

			const updateItems = copyInputItems(items, columns);
			const queryQueue = updateItems.map((item) => {
				return client(table)
					.where(updateKey, '=', item[updateKey])
					.update(item);
			});

			await Promise.all(queryQueue);

			returnItems = this.helpers.returnJsonArray(updateItems as IDataObject[]);

		} else {
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		return this.prepareOutputData(returnItems);
	}
}
