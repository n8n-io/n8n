import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import * as mssql from 'mssql';

/**
 * Returns of copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
function getItemCopy(
	items: INodeExecutionData[],
	properties: string[]
): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	return items.map(item => {
		newItem = {};
		for (const property of properties) {
			if (item.json[property] === undefined) {
				newItem[property] = null;
			} else {
				newItem[property] = JSON.parse(JSON.stringify(item.json[property]));
			}
		}
		return newItem;
	});
}

export class MicrosoftSqlServer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SQL Server',
		name: 'microsoftSqlServer',
		icon: 'file:postgres.png',
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

		let pool = new mssql.ConnectionPool(config);
		await pool.connect();

		let returnItems: any = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const queryQueue = items.map((item, index) => {
				const rawQuery = this.getNodeParameter('query', index) as string;

				return pool.request().query(rawQuery);
			});
			let queryResult = await Promise.all(queryQueue);

			console.log(queryResult);

			returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);
		}
		// Close the connection
		await pool.close();

		return this.prepareOutputData(returnItems);
	}
}
