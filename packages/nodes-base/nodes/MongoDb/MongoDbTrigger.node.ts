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
				const includeFullDocument = self.getNodeParameter(
					'options.includeFullDocument',
					false,
				) as boolean;
				const changeEvents = self.getNodeParameter('options.changeEvents', []) as string[];

				const aggregationPipeline: IDataObject[] = [];
				if (changeEvents.length) {
					const operationTypes = changeEvents.map((event) => ({ operationType: event }));
					aggregationPipeline.push({ $match: { $or: operationTypes } });
				}

				await new Promise((resolve, reject) => {
					client
						.db(database)
						.listCollections({ name: collectionName })
						.hasNext(isFound => {
							console.log(isFound);
							if (isFound) {
								const collection: Collection = client.db(database).collection(collectionName);

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
							} else {
								reject(new Error('The collection was not found'));
							}
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
