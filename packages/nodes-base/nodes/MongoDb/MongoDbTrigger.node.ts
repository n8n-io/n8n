import {IDataObject, INodeType, INodeTypeDescription, ITriggerResponse} from 'n8n-workflow';
import {ITriggerFunctions} from 'n8n-core';
import {
	ChangeEvent,
	ChangeStream,
	Collection,
	MongoClient,
	MongoError
} from 'mongodb';
import {validateAndResolveMongoCredentials} from './mongo.node.utils';
import {nodeDescription} from './mongoTrigger.node.options';

export class MongoDbTrigger implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const {database, connectionString} = validateAndResolveMongoCredentials(
			this,
			await this.getCredentials('mongoDb'),
		);
		const collectionName = this.getNodeParameter('collection') as string;
		const includeFullDocument = this.getNodeParameter('includeFullDocument') as boolean;
		const self = this;

		let changeStream: ChangeStream;

		const client: MongoClient = new MongoClient(connectionString, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		await client.connect();

		async function manualTriggerFunction() {
			await new Promise((resolve, reject) => {
				client.db(database)
				.listCollections({name: collectionName})
				.hasNext((error: MongoError, isFound: boolean) => {
					if (isFound) {
						const collection: Collection = client.db(database).collection(collectionName);

						changeStream = includeFullDocument ?
							collection.watch({fullDocument: 'updateLookup'}) :
							collection.watch();

						changeStream.on('change', (next: ChangeEvent) => {
							self.emit([self.helpers.returnJsonArray(next as unknown as IDataObject)]);
							resolve(true);
						});

						changeStream.on('error', (error) => {
							reject(error);
						});
					}
					else {
						reject(new Error('The collection was not found'));
					}
				});
			});
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
