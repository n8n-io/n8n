import {
	Kafka as apacheKafka,
	KafkaConfig,
	SASLOptions,
} from 'kafkajs';

import { ITriggerFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';


export class KafkaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kafka Trigger',
		name: 'kafkaTrigger',
		icon: 'file:kafka.svg',
		group: ['trigger'],
		version: 1,
		description: 'Consume messages from a Kafka topic',
		defaults: {
			name: 'Kafka Trigger',
			color: '#00FF00',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'kafka',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				placeholder: 'topic-name',
				description: 'Name of the queue of topic to consume from.',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				placeholder: 'n8n-kafka',
				description: 'Id of the consumer group.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Only Message',
						name: 'onlyMessage',
						type: 'boolean',
						default: false,
						description: 'Returns only the message property.',
					},
					{
						displayName: 'JSON Parse Message',
						name: 'jsonParseMessage',
						type: 'boolean',
						default: false,
						description: 'Try to parse the message to an object.',
					},
					{
						displayName: 'Allow topic creation',
						name: 'allowAutoTopicCreation',
						type: 'boolean',
						default: false,
						description: 'Allow sending message to a previously non exisiting topic .',
					},
					{
						displayName: 'Session Timeout',
						name: 'sessionTimeout',
						type: 'number',
						default: 30000,
						description: 'The time to await a response in ms.',
					},
				],
			},
		],
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {

		const topic = this.getNodeParameter('topic', "") as string;
		if (topic === '') {
			throw new Error('The topic is required.');
		}

		const groupId = this.getNodeParameter('groupId', "") as string;
		if (groupId === '') {
			throw new Error('The Group ID is required.');
		}

		const credentials = this.getCredentials('kafka') as IDataObject;

		const brokers = (credentials.brokers as string || '').split(',').map(item => item.trim()) as string[];

		const clientId = credentials.clientId as string;

		const ssl = credentials.ssl as boolean;

		const config: KafkaConfig = {
			clientId,
			brokers,
			ssl,
		};

		if (credentials.username || credentials.password) {
			config.sasl = {
				username: credentials.username as string,
				password: credentials.password as string,
			} as SASLOptions;
		}

		const kafka = new apacheKafka(config);

		const consumer = kafka.consumer({ groupId });

		await consumer.connect();

		await consumer.subscribe({ topic, fromBeginning: true });

		const self = this;

		const options = this.getNodeParameter('options', {}) as IDataObject;

		const startConsumer = async () => {
			await consumer.run({
				eachMessage: async ({ topic, message }) => {

					let data: IDataObject = {};
					let value = message.value?.toString() as string;

					if (options.jsonParseMessage) {
						try {
							value = JSON.parse(value);
						} catch (err) { }
					}

					data.message = value;
					data.topic = topic;

					if (options.onlyMessage) {
						//@ts-ignore
						data = value;
					}

					self.emit([self.helpers.returnJsonArray([data])]);
				},
			});
		};

		startConsumer();

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			await consumer.disconnect();
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually. So the function has to make sure that
		// the emit() gets called with similar data like when it
		// would trigger by itself so that the user knows what data
		// to expect.
		async function manualTriggerFunction() {
			startConsumer();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};

	}
}
