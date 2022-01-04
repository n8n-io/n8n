import {INode, INodeType, INodeTypeDescription, ITriggerResponse} from 'n8n-workflow';
import {ITriggerFunctions} from 'n8n-core';
import {MongoClient} from 'mongodb';

export class MongoDbTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MongoDbTrigger',
		name: 'mongoDbTrigger',
		icon: 'file:mongodb.svg',
		group: ['transform'],
		version: 1,
		description: 'Watch for change events in a collection',
		defaults: {
			name: 'MongoDbTrigger',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mongoDb',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Connection String',
				name: 'connectionString',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Database',
				name: 'database',
				type: 'string',
				required: true,
				default: '',
				description: 'MongoDb Database',
			},
			{
				displayName: 'Collection',
				name: 'collection',
				type: 'string',
				required: true,
				default: '',
				description: 'MongoDb Collection',
			},
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'fixedCollection',
				placeholder: 'Pipeline Options',
				default: {},
				options: [
					{
						displayName: 'Match',
						name: 'match',
						values: [
							{
								displayName: 'Item',
								name: 'matchItem',
								type: 'json',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'matchValue',
								type: 'string',
								default: '',
							},
						],
					},
					{
						displayName: 'Project',
						name: 'project',
						values: [
							{
								displayName: 'Item',
								name: 'projectItem',
								type: 'json',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'projectValue',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	};

	// Test connection string
	// mongodb+srv://liveq:liveq2099@realmcluster.yjy56.mongodb.net/test?authSource=admin&replicaSet=atlas-o8r5rl-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true
	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// TODO: Get username, password, cluster url, database, and collection from properties
		const connectionString = this.getNodeParameter('connectionString', '') as string;
		const database = this.getNodeParameter('database', '') as string;
		const collectionName = this.getNodeParameter('collection', '') as string;
		const self = this;
		const pipelineParameters = getPipelineJson(self.getNode());
		console.log(pipelineParameters);
		console.log(pipelineParameters.match);
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
