import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeOperationError
} from 'n8n-workflow';

import {
	nodeDescription,
} from './mongo.node.options';

import {
	MongoClient,
	ObjectID,
} from 'mongodb';

import {
	getItemCopy,
	handleDateFields,
	validateAndResolveMongoCredentials
} from './mongo.node.utils';

export class MongoDb implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const { database, connectionString } = validateAndResolveMongoCredentials(
			this,
			await this.getCredentials('mongoDb'),
		);

		const client: MongoClient = await MongoClient.connect(connectionString, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		const mdb = client.db(database as string);

		let returnItems = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'aggregate') {
			// ----------------------------------
			//         aggregate
			// ----------------------------------

			try {
				const queryParameter = JSON.parse(this.getNodeParameter('query', 0) as string);

				if (queryParameter._id && typeof queryParameter._id === 'string') {
					queryParameter._id = new ObjectID(queryParameter._id);
				}

				const query = mdb
					.collection(this.getNodeParameter('collection', 0) as string)
					.aggregate(queryParameter);

				const queryResult = await query.toArray();

				returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: (error as JsonObject).message } );
				} else {
					throw error;
				}
			}
		} else if (operation === 'delete') {
			// ----------------------------------
			//         delete
			// ----------------------------------

			try {
				const { deletedCount } = await mdb
					.collection(this.getNodeParameter('collection', 0) as string)
					.deleteMany(JSON.parse(this.getNodeParameter('query', 0) as string));

				returnItems = this.helpers.returnJsonArray([{ deletedCount }]);
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: (error as JsonObject).message });
				} else {
					throw error;
				}
			}

		} else if (operation === 'find') {
			// ----------------------------------
			//         find
			// ----------------------------------

			try {
				const queryParameter = JSON.parse(this.getNodeParameter('query', 0) as string);

				if (queryParameter._id && typeof queryParameter._id === 'string') {
					queryParameter._id = new ObjectID(queryParameter._id);
				}

				let query = mdb
					.collection(this.getNodeParameter('collection', 0) as string)
					.find(queryParameter);

				const options = this.getNodeParameter('options', 0) as IDataObject;
				const limit = options.limit as number;
				const skip = options.skip as number;
				const sort = options.sort && JSON.parse(options.sort as string);
				if (skip > 0) {
					query = query.skip(skip);
				}
				if (limit > 0) {
					query = query.limit(limit);
				}
				if (sort && Object.keys(sort).length !== 0 && sort.constructor === Object) {
					query = query.sort(sort);
				}
				const queryResult = await query.toArray();

				returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: (error as JsonObject).message } );
				} else {
					throw error;
				}
			}
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------
			try {
				// Prepare the data to insert and copy it to be returned
				const fields = (this.getNodeParameter('fields', 0) as string)
					.split(',')
					.map(f => f.trim())
					.filter(f => !!f);

				const options = this.getNodeParameter('options', 0) as IDataObject;
				const insertItems = getItemCopy(items, fields);

				if (options.dateFields) {
					handleDateFields(insertItems, options.dateFields as string);
				}

				const { insertedIds } = await mdb
					.collection(this.getNodeParameter('collection', 0) as string)
					.insertMany(insertItems);

				// Add the id to the data
				for (const i of Object.keys(insertedIds)) {
					returnItems.push({
						json: {
							...insertItems[parseInt(i, 10)],
							id: insertedIds[parseInt(i, 10)] as string,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.returnJsonArray({ error: (error as JsonObject).message });
				} else {
					throw error;
				}
			}
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const fields = (this.getNodeParameter('fields', 0) as string)
				.split(',')
				.map(f => f.trim())
				.filter(f => !!f);

			const options = this.getNodeParameter('options', 0) as IDataObject;

			let updateKey = this.getNodeParameter('updateKey', 0) as string;
			updateKey = updateKey.trim();

			const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
				? { upsert: true } : undefined;

			if (!fields.includes(updateKey)) {
				fields.push(updateKey);
			}

			// Prepare the data to update and copy it to be returned
			const updateItems = getItemCopy(items, fields);

			if (options.dateFields) {
				handleDateFields(updateItems, options.dateFields as string);
			}

			for (const item of updateItems) {
				try {
					if (item[updateKey] === undefined) {
						continue;
					}

					const filter: { [key: string]: string | ObjectID } = {};
					filter[updateKey] = item[updateKey] as string;
					if (updateKey === '_id') {
						filter[updateKey] = new ObjectID(filter[updateKey]);
						delete item['_id'];
					}
					await mdb
						.collection(this.getNodeParameter('collection', 0) as string)
						.updateOne(filter, { $set: item }, updateOptions);
				} catch (error) {
					if (this.continueOnFail()) {
						item.json = { error: (error as JsonObject).message };
						continue;
					}
					throw error;
				}
			}
			returnItems = this.helpers.returnJsonArray(updateItems as IDataObject[]);
		} else {
			if (this.continueOnFail()) {
				returnItems = this.helpers.returnJsonArray({ json: { error: `The operation "${operation}" is not supported!` } });
			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
			}
		}

		client.close();
		return this.prepareOutputData(returnItems);
	}
}
