import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { copyInputItems } from './GenericFunctions';

export class SQLite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SQLite',
		name: 'sqlite',
		icon: 'file:sqlite.svg',
		group: ['input'],
		version: 1,
		description: 'Get, add and update data in SQLite',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'SQLite',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'File DB',
				name: 'database',
				type: 'string',
				default: '',
				required: true,
				placeholder: '/data/database.db',
				description: 'Path of the file to read',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				noDataExpression: true,
				type: 'options',
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute an SQL query',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in database',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete rows in database',
					},
				],
				default: 'insert',
				description: 'The operation to be performed on the database',
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
				description: 'Comma-separated list of the properties which should used as columns for the new rows',
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
				description: 'Comma-separated list of the properties which should used as columns for rows to update',
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const filename = this.getNodeParameter('database', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const db = await open({
			filename: filename,
			driver: sqlite3.Database
		});

		let returnItems:any[] = [];

		try {
			if (operation === 'executeQuery') {
				// ----------------------------------
				//         executeQuery
				// ----------------------------------

				const rawQuery = this.getNodeParameter('query', 0) as string;
				const queryResult = await db.all(rawQuery);

				returnItems = this.helpers.returnJsonArray(queryResult as unknown as IDataObject[]);
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

					const insertSQL = `INSERT INTO ${table}(${columnString}) VALUES ${items.map(item => insertPlaceholder).join(',')};`;
					const queryItems = insertItems.reduce((collection:any, item:any) => collection.concat(Object.values(item as any)), []); // tslint:disable-line:no-any
					const queryResult = await db.run(insertSQL, queryItems);

					returnItems = this.helpers.returnJsonArray(queryResult as unknown as IDataObject);
				} catch (error) {
					if (this.continueOnFail()) {
						returnItems = this.helpers.returnJsonArray({ error: error.message });
					} else {
						await db.close();
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
					const queryQueue = updateItems.map((item:any) => db.run(updateSQL, Object.values(item).concat(item[updateKey])));
					const queryResult = await Promise.all(queryQueue);
					returnItems = this.helpers.returnJsonArray(queryResult as unknown as IDataObject[]);

				} catch (error) {
					if (this.continueOnFail()) {
						returnItems = this.helpers.returnJsonArray({ error: error.message });
					} else {
						await db.close();
						throw error;
					}
				}
			} else {
				await db.close();
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
			}
		} catch (error) {
			console.log(error);
			if (this.continueOnFail()) {
				returnItems = this.helpers.returnJsonArray({ error: error.message });
			} else {
				// await db.close();
				throw error;
			}
		}

		return this.prepareOutputData(returnItems);
	};
}
