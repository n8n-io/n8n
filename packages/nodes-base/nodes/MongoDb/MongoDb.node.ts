import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { MongoClient } from 'mongodb';


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


export class MongoDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MongoDB',
		name: 'mongoDb',
		icon: 'file:mongoDb.png',
		group: ['input'],
		version: 1,
		description: 'Find, insert and update documents in MongoDB.',
		defaults: {
			name: 'MongoDB',
			color: '#13AA52',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mongoDb',
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
						name: 'Find',
						value: 'find',
						description: 'Find documents.',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert documents.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Updates documents.',
					},
				],
				default: 'find',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Collection',
				name: 'collection',
				type: 'string',
				required: true,
				default: '',
				description: 'MongoDB Collection'
			},

			// ----------------------------------
			//         find
			// ----------------------------------
			{
				displayName: 'Query (JSON format)',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						operation: [
							'find'
						],
					},
				},
				default: '{}',
				placeholder: `{ "birth": { "$gt": "1950-01-01" } }`,
				required: true,
				description: 'MongoDB Find query.',
			},


			// ----------------------------------
			//         insert
			// ----------------------------------
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert'
						],
					},
				},
				default: '',
				placeholder: 'name,description',
				description: 'Comma separated list of the fields to be included into the new document.',
			},


			// ----------------------------------
			//         update
			// ----------------------------------
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
				displayName: 'Fields',
				name: 'fields',
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
				description: 'Comma separated list of the fields to be included into the new document.',
			},

		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const credentials = this.getCredentials('mongoDb');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		let connectionUri = '';

		if (credentials.port) {
			connectionUri = `mongodb://${credentials.user}:${credentials.password}@${credentials.host}:${credentials.port}`;
		} else {
			connectionUri = `mongodb+srv://${credentials.user}:${credentials.password}@${credentials.host}`;
		}

		const client = await MongoClient.connect(connectionUri, { useNewUrlParser: true, useUnifiedTopology: true });
		const mdb = client.db(credentials.database as string);

		let returnItems = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'find') {
			// ----------------------------------
			//         find
			// ----------------------------------

			const queryResult = await mdb
				.collection(this.getNodeParameter('collection', 0) as string)
				.find(JSON.parse(this.getNodeParameter('query', 0) as string))
				.toArray();

			returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);

		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			// Prepare the data to insert and copy it to be returned
			const fields = (this.getNodeParameter('fields', 0) as string)
				.split(',')
				.map(f => f.trim())
				.filter(f => !!f);

			const insertItems = getItemCopy(items, fields);

			const { insertedIds } = await mdb
				.collection(this.getNodeParameter('collection', 0) as string)
				.insertMany(insertItems);

			// Add the id to the data
			for (const i of Object.keys(insertedIds)) {
				returnItems.push({
					json: {
						...insertItems[parseInt(i, 10)],
						id: insertedIds[parseInt(i, 10)] as string,
					}
				});
			}
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const fields = (this.getNodeParameter('fields', 0) as string)
				.split(',')
				.map(f => f.trim())
				.filter(f => !!f);

			let updateKey = this.getNodeParameter('updateKey', 0) as string;
			updateKey = updateKey.trim();

			if (!fields.includes(updateKey)) {
				fields.push(updateKey);
			}

			// Prepare the data to update and copy it to be returned
			const updateItems = getItemCopy(items, fields);

			for (const item of updateItems) {
				if (item[updateKey] === undefined) {
					continue;
				}

				const filter: { [key: string] :string } = {};
				filter[updateKey] = item[updateKey] as string;

				await mdb
					.collection(this.getNodeParameter('collection', 0) as string)
					.updateOne(filter, { $set: item });
			}

			returnItems = this.helpers.returnJsonArray(updateItems as IDataObject[]);

		} else {
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		return this.prepareOutputData(returnItems);
	}
}
