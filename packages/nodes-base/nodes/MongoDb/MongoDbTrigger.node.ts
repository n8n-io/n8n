import {INode, INodeType, INodeTypeDescription, ITriggerResponse} from 'n8n-workflow';
import {ITriggerFunctions} from 'n8n-core';
import {MongoClient} from 'mongodb';
import {validateAndResolveMongoCredentials} from './mongo.node.utils';
import {nodeDescription} from './mongoTrigger.node.options';

export class MongoDbTrigger implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// TODO: Get username, password, cluster url, database, and collection from properties
		// Test connection string
		// mongodb+srv://liveq:liveq2099@realmcluster.yjy56.mongodb.net/test?authSource=admin&replicaSet=atlas-o8r5rl-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true
		const { database, connectionString } = validateAndResolveMongoCredentials(
			this,
			await this.getCredentials('mongoDb'),
		);
		const collectionName = this.getNodeParameter('collection', '') as string;
		const self = this;



		let changedObject = {};

		const client: MongoClient = new MongoClient(connectionString);
		await client.connect();
		const collection = client.db(database).collection(collectionName);
		const changeStream = collection.watch();

		await monitorListingsUsingEventEmitter();

		async function monitorListingsUsingEventEmitter() {
			changeStream.on('change', (next) => {
				changedObject = JSON.parse(JSON.stringify(next));
				self.emit([self.helpers.returnJsonArray(changedObject)]);
			});
		}

		async function closeFunction() {
			await changeStream.close();
			await client.close();
		}

		async function manualTriggerFunction() {

		}

		function createPipeline() {
			const pipelineParameters = getPipelineJson(self.getNode());



		}

		function getPipelineJson(node: INode): IPipeline {
			return node.parameters.pipeline as IPipeline;
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}

interface IPipeline {
	match?: IPipelineStage;
	project?: IPipelineStage;
	addFields?: IPipelineStage;
}

interface IPipelineStage {
	stage: {item: string, value: string};
}
