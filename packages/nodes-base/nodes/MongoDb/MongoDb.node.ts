import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';

import { nodeDescription } from './mongo.node.options';

import { buildParameterizedConnString, prepareFields, prepareItems } from './mongo.node.utils';

import { MongoClient, ObjectID } from 'mongodb';

import { validateAndResolveMongoCredentials } from './mongo.node.utils';

import { IMongoParametricCredentials } from './mongo.node.types';

export class MongoDb implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	methods = {
		credentialTest: {
			async mongoDbCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;
				try {
					const database = ((credentials.database as string) || '').trim();
					let connectionString = '';

					if (credentials.configurationType === 'connectionString') {
						connectionString = ((credentials.connectionString as string) || '').trim();
					} else {
						connectionString = buildParameterizedConnString(
							credentials as unknown as IMongoParametricCredentials,
						);
					}

					const client: MongoClient = await MongoClient.connect(connectionString, {
						useNewUrlParser: true,
						useUnifiedTopology: true,
					});

					const { databases } = await client.db().admin().listDatabases();

					if (!(databases as IDataObject[]).map((db) => db.name).includes(database)) {
						// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
						throw new Error(`Database "${database}" does not exist`);
					}
					client.close();
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

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

		const returnItems: INodeExecutionData[] = [];
		let responseData: IDataObject | IDataObject[] = [];

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

				responseData = await query.toArray();
			} catch (error) {
				if (this.continueOnFail()) {
					responseData = [{ error: (error as JsonObject).message }];
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

				responseData = [{ deletedCount }];
			} catch (error) {
				if (this.continueOnFail()) {
					responseData = [{ error: (error as JsonObject).message }];
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

				responseData = queryResult;
			} catch (error) {
				if (this.continueOnFail()) {
					responseData = [{ error: (error as JsonObject).message }];
				} else {
					throw error;
				}
			}
		} else if (operation === 'findOneAndReplace') {
			// ----------------------------------
			//         findOneAndReplace
			// ----------------------------------

			const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
			const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
			const dateFields = prepareFields(
				this.getNodeParameter('options.dateFields', 0, '') as string,
			);

			const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

			const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
				? { upsert: true }
				: undefined;

			const updateItems = prepareItems(items, fields, updateKey, useDotNotation, dateFields);

			for (const item of updateItems) {
				try {
					const filter = { [updateKey]: item[updateKey] };
					if (updateKey === '_id') {
						filter[updateKey] = new ObjectID(item[updateKey] as string);
						delete item['_id'];
					}

					await mdb
						.collection(this.getNodeParameter('collection', 0) as string)
						.findOneAndReplace(filter, item, updateOptions);
				} catch (error) {
					if (this.continueOnFail()) {
						item.json = { error: (error as JsonObject).message };
						continue;
					}
					throw error;
				}
			}

			responseData = updateItems;
		} else if (operation === 'findOneAndUpdate') {
			// ----------------------------------
			//         findOneAndUpdate
			// ----------------------------------

			const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
			const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
			const dateFields = prepareFields(
				this.getNodeParameter('options.dateFields', 0, '') as string,
			);

			const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

			const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
				? { upsert: true }
				: undefined;

			const updateItems = prepareItems(items, fields, updateKey, useDotNotation, dateFields);

			for (const item of updateItems) {
				try {
					const filter = { [updateKey]: item[updateKey] };
					if (updateKey === '_id') {
						filter[updateKey] = new ObjectID(item[updateKey] as string);
						delete item['_id'];
					}

					await mdb
						.collection(this.getNodeParameter('collection', 0) as string)
						.findOneAndUpdate(filter, { $set: item }, updateOptions);
				} catch (error) {
					if (this.continueOnFail()) {
						item.json = { error: (error as JsonObject).message };
						continue;
					}
					throw error;
				}
			}

			responseData = updateItems;
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------
			try {
				// Prepare the data to insert and copy it to be returned
				const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
				const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
				const dateFields = prepareFields(
					this.getNodeParameter('options.dateFields', 0, '') as string,
				);

				const insertItems = prepareItems(items, fields, '', useDotNotation, dateFields);

				const { insertedIds } = await mdb
					.collection(this.getNodeParameter('collection', 0) as string)
					.insertMany(insertItems);

				// Add the id to the data
				for (const i of Object.keys(insertedIds)) {
					responseData.push({
						...insertItems[parseInt(i, 10)],
						id: insertedIds[parseInt(i, 10)] as string,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData = [{ error: (error as JsonObject).message }];
				} else {
					throw error;
				}
			}
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
			const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
			const dateFields = prepareFields(
				this.getNodeParameter('options.dateFields', 0, '') as string,
			);

			const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

			const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
				? { upsert: true }
				: undefined;

			const updateItems = prepareItems(items, fields, updateKey, useDotNotation, dateFields);

			for (const item of updateItems) {
				try {
					const filter = { [updateKey]: item[updateKey] };
					if (updateKey === '_id') {
						filter[updateKey] = new ObjectID(item[updateKey] as string);
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

			responseData = updateItems;
		} else {
			if (this.continueOnFail()) {
				responseData = [{ error: `The operation "${operation}" is not supported!` }];
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
					{ itemIndex: 0 },
				);
			}
		}

		client.close();

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData: { item: 0 } },
		);

		returnItems.push(...executionData);

		return this.prepareOutputData(returnItems);
	}
}
