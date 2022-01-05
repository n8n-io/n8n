import {INodeType, INodeTypeDescription, ITriggerResponse} from 'n8n-workflow';
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
					// The collection name is found... Continue with change stream.
					const collection: Collection = client.db(database).collection(collectionName);
					changeStream = getFullDocument ?
						collection.watch({fullDocument: 'updateLookup'}) :
						collection.watch();

					monitorListingsUsingEventEmitter();
				}
				// The collection name is not found... Return an empty array.
				else {
					return self.emit([]);
				}
		});

		async function monitorListingsUsingEventEmitter() {
			changeStream.on('change', (next: ChangeEvent) => {
				changedObject = flattenJson(JSON.stringify(next));
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

function flattenJson(jsonString: string): JSON {
	const jsonToFlatten = JSON.parse(jsonString);
	const result = {};
	flatten(jsonToFlatten, result);
	return result as JSON;

	function flatten(property: IData, result: IData, parentName= '') {
		const keys = Object.keys(property);

		for (const key of keys) {
			const value = property[key];

			if (typeof(value) === 'object' && !Array.isArray(value)) {
				flatten(value as IData, result, key);
			}

			else {
				const keyName = parentName === '' ? key : `${parentName}.${key}`;
				result[keyName] = value;
			}
		}
	}
}
type GenericValue = string | object | number | boolean;
interface IData {
	[key: string]: GenericValue | IData | GenericValue[] | IData[];
}
