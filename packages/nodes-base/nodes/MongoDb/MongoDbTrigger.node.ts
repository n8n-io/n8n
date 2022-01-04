import {INodeType, INodeTypeDescription, ITriggerResponse} from 'n8n-workflow';
import {ITriggerFunctions} from 'n8n-core';
import {ChangeStream, Collection, MongoClient, MongoError} from 'mongodb';
import {validateAndResolveMongoCredentials} from './mongo.node.utils';
import {nodeDescription} from './mongoTrigger.node.options';

export class MongoDbTrigger implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const {database, connectionString} = validateAndResolveMongoCredentials(
			this,
			await this.getCredentials('mongoDb'),
		);
		const collectionName = this.getNodeParameter('collection', '') as string;
		const getFullDocument = this.getNodeParameter('getFullDocument', false);
		const self = this;

		let changedObject = {};
		let changeStream: ChangeStream;

		const client: MongoClient = new MongoClient(connectionString);
		await client.connect();

		client.db(database)
			.listCollections({name: collectionName})
			.hasNext((error: MongoError, isFound: boolean) => {
				if (isFound) {
					const collection: Collection = client.db(database).collection(collectionName);
					changeStream = getFullDocument ?
						collection.watch({fullDocument: 'updateLookup'}) :
						collection.watch();

					monitorListingsUsingEventEmitter();
				}
				else {
					self.emit([self.helpers.returnJsonArray({error: 'Collection does not exist.'})]);
				}
		});

		async function monitorListingsUsingEventEmitter() {
			changeStream.on('change', (next) => {
				changedObject = JSON.parse(JSON.stringify(next));
				self.emit([self.helpers.returnJsonArray(changedObject)]);
			});
		}

		async function closeFunction() {
			await changeStream?.close();
			await client.close();
		}

		async function manualTriggerFunction() {
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
