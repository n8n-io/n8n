import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as pgPromise from 'pg-promise';


/**
 * Returns of copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
function getItemCopy(items: INodeExecutionData[], properties: string[]): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	return items.map((item) => {
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


export class Postgres implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postgres',
		name: 'postgres',
		icon: 'file:postgres.png',
		group: ['input'],
		version: 1,
		description: 'Gets, add and update data in Postgres.',
		defaults: {
			name: 'Postgres',
			color: '#336791',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'postgres',
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
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert'
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
			{
				displayName: 'Return Fields',
				name: 'returnFields',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert'
						],
					},
				},
				default: '*',
				description: 'Comma separated list of the fields that the operation will return',
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

		const credentials = this.getCredentials('postgres');

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
			sslmode: credentials.ssl as string || 'disable',
		};

		const db = pgp(config);

		let returnItems = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const queries: string[] = [];
			for (let i = 0; i < items.length; i++) {
				queries.push(this.getNodeParameter('query', i) as string);
			}

			const queryResult = await db.any(pgp.helpers.concat(queries));

			returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);

		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const schema = this.getNodeParameter('schema', 0) as string;
			let returnFields = (this.getNodeParameter('returnFields', 0) as string).split(',') as string[];
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map(column => column.trim());

			const cs = new pgp.helpers.ColumnSet(columns);

			const te = new pgp.helpers.TableName({ table, schema });

			// Prepare the data to insert and copy it to be returned
			const insertItems = getItemCopy(items, columns);

			// Generate the multi-row insert query and return the id of new row
			returnFields = returnFields.map(value => value.trim()).filter(value => !!value);
			const query = pgp.helpers.insert(insertItems, cs, te) + (returnFields.length ?  ` RETURNING ${returnFields.join(',')}` : '');

			// Executing the query to insert the data
			const insertData = await db.manyOrNone(query);

			// Add the id to the data
			for (let i = 0; i < insertData.length; i++) {
				returnItems.push({
					json: {
						...insertData[i],
						...insertItems[i],
					}
				});
			}

		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const table = this.getNodeParameter('table', 0) as string;
			const updateKey = this.getNodeParameter('updateKey', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;

			const columns = columnString.split(',').map(column => column.trim());

			// Make sure that the updateKey does also get queried
			if (!columns.includes(updateKey)) {
				columns.unshift(updateKey);
			}

			// Prepare the data to update and copy it to be returned
			const updateItems = getItemCopy(items, columns);

			// Generate the multi-row update query
			const query = pgp.helpers.update(updateItems, columns, table) + ' WHERE v.' + updateKey + ' = t.' + updateKey;

			// Executing the query to update the data
			await db.none(query);

			returnItems = this.helpers.returnJsonArray(updateItems	 as IDataObject[]);

		} else {
			await pgp.end();
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		// Close the connection
		await pgp.end();

		return this.prepareOutputData(returnItems);
	}
}
