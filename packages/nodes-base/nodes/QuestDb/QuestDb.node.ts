import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as pgPromise from 'pg-promise';

import { pgQuery } from '../Postgres/Postgres.node.functions';

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

		let returnItems = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const queryResult = await pgQuery(this.getNodeParameter, pgp, db, items);

			returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------
			const tableName = this.getNodeParameter('table', 0) as string;
			const returnFields = this.getNodeParameter('returnFields', 0) as string;

			const queries : string[] = [];
			items.map(item => {
				const columns = Object.keys(item.json);

				const values : string = columns.map((col : string) => {
					if (typeof item.json[col] === 'string') {
						return `\'${item.json[col]}\'`;
					} else {
						return item.json[col];
					}
				}).join(',');

				const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${values});`;
				queries.push(query);
			});

			await db.any(pgp.helpers.concat(queries));

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
