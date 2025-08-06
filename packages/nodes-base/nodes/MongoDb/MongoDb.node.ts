import type {
	FindOneAndReplaceOptions,
	FindOneAndUpdateOptions,
	UpdateOptions,
	Sort,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import { ApplicationError, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	IPairedItemData,
} from 'n8n-workflow';

import {
	buildParameterizedConnString,
	connectMongoClient,
	prepareFields,
	prepareItems,
	stringifyObjectIDs,
	validateAndResolveMongoCredentials,
} from './GenericFunctions';
import type { IMongoParametricCredentials } from './mongoDb.types';
import { nodeProperties } from './MongoDbProperties';
import { generatePairedItemData } from '../../utils/utilities';

export class MongoDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MongoDB',
		name: 'mongoDb',
		icon: 'file:mongodb.svg',
		group: ['input'],
		version: [1, 1.1, 1.2],
		description: 'Find, insert and update documents in MongoDB',
		defaults: {
			name: 'MongoDB',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'mongoDb',
				required: true,
				testedBy: 'mongoDbCredentialTest',
			},
		],
		properties: nodeProperties,
	};

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

					const client = await connectMongoClient(connectionString, credentials);

					const { databases } = await client.db().admin().listDatabases();

					if (!(databases as IDataObject[]).map((db) => db.name).includes(database)) {
						throw new ApplicationError(`Database "${database}" does not exist`, {
							level: 'warning',
						});
					}
					await client.close();
				} catch (error) {
					return {
						status: 'Error',
						message: (error as Error).message,
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
		const credentials = await this.getCredentials('mongoDb');
		const { database, connectionString } = validateAndResolveMongoCredentials(this, credentials);
		const client = await connectMongoClient(connectionString, credentials);
		let returnData: INodeExecutionData[] = [];

		try {
			const mdb = client.db(database);

			const items = this.getInputData();
			const operation = this.getNodeParameter('operation', 0);
			const nodeVersion = this.getNode().typeVersion;

			let itemsLength = items.length ? 1 : 0;
			let fallbackPairedItems: IPairedItemData[] | null = null;

			if (nodeVersion >= 1.1) {
				itemsLength = items.length;
			} else {
				fallbackPairedItems = generatePairedItemData(items.length);
			}

			if (operation === 'aggregate') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const queryParameter = JSON.parse(
							this.getNodeParameter('query', i) as string,
						) as IDataObject;

						if (queryParameter._id && typeof queryParameter._id === 'string') {
							queryParameter._id = new ObjectId(queryParameter._id);
						}

						const query = mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.aggregate(queryParameter as unknown as Document[]);

						for (const entry of await query.toArray()) {
							returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'delete') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const { deletedCount } = await mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.deleteMany(JSON.parse(this.getNodeParameter('query', i) as string) as Document);

						returnData.push({
							json: { deletedCount },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'find') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const queryParameter = JSON.parse(
							this.getNodeParameter('query', i) as string,
						) as IDataObject;

						if (queryParameter._id && typeof queryParameter._id === 'string') {
							queryParameter._id = new ObjectId(queryParameter._id);
						}

						let query = mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.find(queryParameter as unknown as Document);

						const options = this.getNodeParameter('options', i);
						const limit = options.limit as number;
						const skip = options.skip as number;
						const projection =
							options.projection && (JSON.parse(options.projection as string) as Document);
						const sort = options.sort && (JSON.parse(options.sort as string) as Sort);

						if (skip > 0) {
							query = query.skip(skip);
						}
						if (limit > 0) {
							query = query.limit(limit);
						}
						if (sort && Object.keys(sort).length !== 0 && sort.constructor === Object) {
							query = query.sort(sort);
						}

						if (
							projection &&
							Object.keys(projection).length !== 0 &&
							projection.constructor === Object
						) {
							query = query.project(projection);
						}

						const queryResult = await query.toArray();

						for (const entry of queryResult) {
							returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findOneAndReplace') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
				const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
				const dateFields = prepareFields(
					this.getNodeParameter('options.dateFields', 0, '') as string,
				);

				const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

				const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
					? { upsert: true }
					: undefined;

				const updateItems = prepareItems({ items, fields, updateKey, useDotNotation, dateFields });

				for (const item of updateItems) {
					try {
						const filter = { [updateKey]: item[updateKey] };
						if (updateKey === '_id') {
							filter[updateKey] = new ObjectId(item[updateKey] as string);
							delete item._id;
						}

						await mdb
							.collection(this.getNodeParameter('collection', 0) as string)
							.findOneAndReplace(filter, item, updateOptions as FindOneAndReplaceOptions);
					} catch (error) {
						if (this.continueOnFail()) {
							item.json = { error: (error as JsonObject).message };
							continue;
						}
						throw error;
					}
				}

				returnData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(updateItems),
					{ itemData: fallbackPairedItems },
				);
			}

			if (operation === 'findOneAndUpdate') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
				const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
				const dateFields = prepareFields(
					this.getNodeParameter('options.dateFields', 0, '') as string,
				);

				const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

				const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
					? { upsert: true }
					: undefined;

				const updateItems = prepareItems({
					items,
					fields,
					updateKey,
					useDotNotation,
					dateFields,
					isUpdate: nodeVersion >= 1.2,
				});

				for (const item of updateItems) {
					try {
						const filter = { [updateKey]: item[updateKey] };
						if (updateKey === '_id') {
							filter[updateKey] = new ObjectId(item[updateKey] as string);
							delete item._id;
						}

						await mdb
							.collection(this.getNodeParameter('collection', 0) as string)
							.findOneAndUpdate(filter, { $set: item }, updateOptions as FindOneAndUpdateOptions);
					} catch (error) {
						if (this.continueOnFail()) {
							item.json = { error: (error as JsonObject).message };
							continue;
						}
						throw error;
					}
				}

				returnData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(updateItems),
					{ itemData: fallbackPairedItems },
				);
			}

			if (operation === 'insert') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				let responseData: IDataObject[] = [];
				try {
					// Prepare the data to insert and copy it to be returned
					const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
					const useDotNotation = this.getNodeParameter(
						'options.useDotNotation',
						0,
						false,
					) as boolean;
					const dateFields = prepareFields(
						this.getNodeParameter('options.dateFields', 0, '') as string,
					);

					const insertItems = prepareItems({
						items,
						fields,
						updateKey: '',
						useDotNotation,
						dateFields,
					});

					const { insertedIds } = await mdb
						.collection(this.getNodeParameter('collection', 0) as string)
						.insertMany(insertItems);

					// Add the id to the data
					for (const i of Object.keys(insertedIds)) {
						responseData.push({
							...insertItems[parseInt(i, 10)],
							id: insertedIds[parseInt(i, 10)] as unknown as string,
						});
					}
				} catch (error) {
					if (this.continueOnFail()) {
						responseData = [{ error: (error as JsonObject).message }];
					} else {
						throw error;
					}
				}

				returnData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: fallbackPairedItems },
				);
			}

			if (operation === 'update') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
				const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
				const dateFields = prepareFields(
					this.getNodeParameter('options.dateFields', 0, '') as string,
				);

				const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

				const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
					? { upsert: true }
					: undefined;

				const updateItems = prepareItems({
					items,
					fields,
					updateKey,
					useDotNotation,
					dateFields,
					isUpdate: nodeVersion >= 1.2,
				});

				for (const item of updateItems) {
					try {
						const filter = { [updateKey]: item[updateKey] };
						if (updateKey === '_id') {
							filter[updateKey] = new ObjectId(item[updateKey] as string);
							delete item._id;
						}

						await mdb
							.collection(this.getNodeParameter('collection', 0) as string)
							.updateOne(filter, { $set: item }, updateOptions as UpdateOptions);
					} catch (error) {
						if (this.continueOnFail()) {
							item.json = { error: (error as JsonObject).message };
							continue;
						}
						throw error;
					}
				}

				returnData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(updateItems),
					{ itemData: fallbackPairedItems },
				);
			}

			if (operation === 'listSearchIndexes') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = (() => {
							const name = this.getNodeParameter('indexName', i) as string;
							return name.length === 0 ? undefined : name;
						})();

						const cursor = indexName
							? mdb.collection(collection).listSearchIndexes(indexName)
							: mdb.collection(collection).listSearchIndexes();

						const query = await cursor.toArray();
						const result = query.map((json) => ({
							json,
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						}));
						returnData.push(...result);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'dropSearchIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;

						await mdb.collection(collection).dropSearchIndex(indexName);
						returnData.push({
							json: {
								[indexName]: true,
							},
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'createSearchIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;
						const definition = JSON.parse(
							this.getNodeParameter('indexDefinition', i) as string,
						) as Record<string, unknown>;

						await mdb.collection(collection).createSearchIndex({
							name: indexName,
							definition,
						});

						returnData.push({
							json: { indexName },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'updateSearchIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;
						const definition = JSON.parse(
							this.getNodeParameter('indexDefinition', i) as string,
						) as Record<string, unknown>;

						await mdb.collection(collection).updateSearchIndex(indexName, definition);

						returnData.push({
							json: { [indexName]: true },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}
		} finally {
			await client.close().catch(() => {});
		}

		return [stringifyObjectIDs(returnData)];
	}
}
