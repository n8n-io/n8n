import { IDataObject, INodeType, INodeTypeDescription, ITriggerResponse } from 'n8n-workflow';
import { ITriggerFunctions } from 'n8n-core';
import { ChangeStream, Collection, MongoClient, MongoError } from 'mongodb';
import { validateAndResolveMongoCredentials } from './MongoDb.node.utils';
import { nodeDescription } from './mongoDbTrigger.node.options';

export class MongoDbTrigger implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const { database, connectionString } = validateAndResolveMongoCredentials(
			this,
			await this.getCredentials('mongoDb'),
		);
		const resource = this.getNodeParameter('resource') as string;
		const self = this;

		let changeStream: ChangeStream;

		const client: MongoClient = new MongoClient(connectionString);
		await client.connect();

		async function manualTriggerFunction() {
			if (resource === 'changeStream') {
				const collectionName = self.getNodeParameter('collection') as string;
				const includeFullDocument = self.getNodeParameter('options.includeFullDocument', false) as boolean;
				const changeEvents = self.getNodeParameter('options.changeEvents', []) as string[];

				const aggregationPipeline: IDataObject[] = [];
				if (changeEvents.length) {
					const operationTypes = changeEvents.map((event) => ({ operationType: event }));
					aggregationPipeline.push({ $match: { $or: operationTypes } });
				}

				const db = client.db(database);
				const collectionExist = await db.listCollections({ name: collectionName }).hasNext();
				if (!collectionExist) {
					throw new Error('The collection was not found');
				}

				await new Promise((resolve, reject) => {
					const collection: Collection = db.collection(collectionName);

					changeStream = collection.watch(
						aggregationPipeline.length ? aggregationPipeline : undefined,
						includeFullDocument ? { fullDocument: 'updateLookup' } : undefined,
					);

					changeStream.on('change', (next) => {
						self.emit([self.helpers.returnJsonArray(next as unknown as IDataObject)]);
						resolve(true);
					});

					changeStream.on('error', (error) => {
						reject(error);
					});
				});
			}
		}

		if (this.getMode() === 'trigger') {
			manualTriggerFunction();
		}

		async function closeFunction() {
			await changeStream?.close();
			await client.close();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
