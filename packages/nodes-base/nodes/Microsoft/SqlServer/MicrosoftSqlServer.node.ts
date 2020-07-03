import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { flatten } from 'lodash';

import * as mssql from 'mssql';

import { copyInputItems } from './GenericFunctions';
import { query } from 'express';

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
			color: '#336791'
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
					}
				],
				default: 'executeQuery',
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

			const insertItems = copyInputItems(items, columns);
			// const insertPlaceholder = `(${columns.map(column => '?').join(',')})`;

			console.log(insertItems);
			const queryItems = insertItems
				.reduce((acc, item) => {
					acc.push(`(${Object.values(item as any)})`);
					return acc;
				}, [])
				.join(','); // tslint:disable-line:no-any
			console.log(queryItems);

			const insertSQL = `INSERT INTO ${table}(${columnString}) VALUES ${queryItems};`;
			console.log(insertSQL);
			const queryResult = await pool.request().query(insertSQL);

			returnItems = this.helpers.returnJsonArray(
				queryResult.recordset as IDataObject[]
			);
		}
		// Close the connection
		await pool.close();

		return this.prepareOutputData(returnItems);
	}
}
