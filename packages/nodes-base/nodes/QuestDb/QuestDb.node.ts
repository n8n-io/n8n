import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as pgPromise from 'pg-promise';

import {
	getItemCopy,
} from '../Postgres/Postgres.node.functions';

export class QuestDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QuestDB',
		name: 'questDb',
		icon: 'file:questdb.png',
		group: ['input'],
		version: 1,
		description: 'Gets, add and update data in QuestDB.',
		defaults: {
			name: 'QuestDB',
			color: '#2C4A79',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'questDb',
				required: true,
			},
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
							'executeQuery',
						],
					},
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE id < 40',
				required: true,
				description: 'The SQL query to execute.',
			},
			{
				displayName: 'Use query parameters',
				name: 'useQueryParams',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: false,
				required: true,
				description: 'Use Parametrized Queries, where variables are replaced using $1, $2, etc.. <br>Do not use this for regular n8n expressions.',
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['executeQuery'],
						useQueryParams: [true],
					},
				},
				default: '',
				placeholder: 'qty,price',
				description:
					'Comma separated list of properties which should be used as query parameters.',
			},

			// ----------------------------------
			//         insert
			// ----------------------------------
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert',
						],
					},
				},
				default: 'public',
				required: true,
				description: 'Name of the schema the table belongs to',
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert',
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
							'insert',
						],
					},
				},
				default: '',
				placeholder: 'id,name,description',
				description:
					'Comma separated list of the properties which should used as columns for the new rows.',
			},
			{
				displayName: 'Return Fields',
				name: 'returnFields',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert',
						],
					},
				},
				default: '*',
				description: 'Comma separated list of the fields that the operation will return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getCredentials('questDb');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const pgp = pgPromise();

		const config = {
			host: credentials.host as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
			ssl: !['disable', undefined].includes(credentials.ssl as string | undefined),
			sslmode: (credentials.ssl as string) || 'disable',
		};

		const db = pgp(config);

		let returnItems: Array<IDataObject> = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const useQueryParam = this.getNodeParameter('useQueryParams', 0) as boolean;
			let valuesArray = [] as string[][];
			if (useQueryParam) {
				const propertiesString = this.getNodeParameter('properties', 0) as string;
				const properties = propertiesString.split(',').map(column => column.trim());
				const paramsItems = getItemCopy(items, properties);
				valuesArray = paramsItems.map((row) => properties.map(col => row[col])) as string[][];
			}

			const queryResults: Array<IDataObject> = [];
			for (let i = 0; i < items.length; i++) {
				const query = this.getNodeParameter('query', i) as string;
				const values = valuesArray[i];
				const queryFormat = { text: query, values };
				const result = await db.query(queryFormat) as Array<IDataObject>;

				queryResults.push(...result);
			}
			returnItems = this.helpers.returnJsonArray(queryResults as IDataObject[]);
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------
			const tableName = this.getNodeParameter('table', 0) as string;
			const returnFields = this.getNodeParameter('returnFields', 0) as string;

			const queries : string[] = [];
			items.map((item, index) => {
				const columns = this.getNodeParameter('columns', index) as string;
				
				let columnNames: string[];
				if (columns !== '') {
					columnNames = columns.split(',').map(columnName => columnName.trim());
				} else {
					columnNames = Object.keys(item.json);
				}

				const values : string = columnNames.map((col : string) => {
					if (typeof item.json[col] === 'number') {
						// Skip quotes only for numbers. formats like dates should be quoted.
						return item.json[col];
					} else {
						return `\'${item.json[col]}\'`;
					}
				}).join(',');

				const query = `INSERT INTO ${tableName} (${columnNames.join(',')}) VALUES (${values});`;
				queries.push(query);
			});

			for(let i = 0; i < queries.length; i++) {
				// We have to insert lines one by one and wait
				// Otherwise we might get `table is busy` errors.
				await db.any(queries[i]);
			}

			const returnedItems = await db.any(`SELECT ${returnFields} from ${tableName}`);

			returnItems = this.helpers.returnJsonArray(returnedItems as IDataObject[]);
		} else {
			await pgp.end();
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		// Close the connection
		await pgp.end();

		return this.prepareOutputData(returnItems);
	}
}
