import {
	Kafka as apacheKafka,
	KafkaConfig,
	logLevel,
	SASLOptions,
} from 'kafkajs';

import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

import {
	ITriggerFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError,
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
				required: true,
				placeholder: 'topic-name',
				description: 'Name of the queue of topic to consume from',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'n8n-kafka',
				description: 'ID of the consumer group',
			},
			{
				displayName: 'Use Schema Registry',
				name: 'useSchemaRegistry',
				type: 'boolean',
				default: false,
				description: 'Use Confluent Schema Registry',
			},
			{
				displayName: 'Schema Registry URL',
				name: 'schemaRegistryUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						useSchemaRegistry: [
							true,
						],
					},
				},
				placeholder: 'https://schema-registry-domain:8081',
				default: '',
				description: 'URL of the schema registry',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Allow Topic Creation',
						name: 'allowAutoTopicCreation',
						type: 'boolean',
						default: false,
						description: 'Allow sending message to a previously non exisiting topic',
					},
					{
						displayName: 'Read Messages From Beginning',
						name: 'fromBeginning',
						type: 'boolean',
						default: true,
						description: 'Read message from beginning',
					},
					{
						displayName: 'JSON Parse Message',
						name: 'jsonParseMessage',
						type: 'boolean',
						default: false,
						description: 'Try to parse the message to an object',
					},
					{
						displayName: 'Only Message',
						name: 'onlyMessage',
						type: 'boolean',
						displayOptions: {
							show: {
								jsonParseMessage: [
									true,
								],
							},
						},
						default: false,
						description: 'Returns only the message property',
					},
					{
						displayName: 'Session Timeout',
						name: 'sessionTimeout',
						type: 'number',
						default: 30000,
						description: 'The time to await a response in ms',
					},
					{
						displayName: 'Return Headers',
						name: 'returnHeaders',
						type: 'boolean',
						default: false,
						description: 'Return the headers received from Kafka',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {

		const topic = this.getNodeParameter('topic') as string;

		const groupId = this.getNodeParameter('groupId') as string;

		const credentials = await this.getCredentials('kafka');

		const brokers = (credentials.brokers as string || '').split(',').map(item => item.trim()) as string[];

		const clientId = credentials.clientId as string;

		const ssl = credentials.ssl as boolean;

		const config: KafkaConfig = {
			clientId,
			brokers,
			ssl,
			logLevel: logLevel.ERROR,
		};

		if (credentials.authentication === true) {
			if(!(credentials.username && credentials.password)) {
				throw new NodeOperationError(this.getNode(), 'Username and password are required for authentication');
			}
			config.sasl = {
				username: credentials.username as string,
				password: credentials.password as string,
				mechanism: credentials.saslMechanism as string,
			} as SASLOptions;
		}

		const kafka = new apacheKafka(config);

		const consumer = kafka.consumer({ groupId });

		await consumer.connect();

		const options = this.getNodeParameter('options', {}) as IDataObject;

		await consumer.subscribe({ topic, fromBeginning: (options.fromBeginning)? true : false });

		const self = this;

		const useSchemaRegistry = this.getNodeParameter('useSchemaRegistry', 0) as boolean;

		const schemaRegistryUrl = this.getNodeParameter('schemaRegistryUrl', 0) as string;

		const startConsumer = async () => {
			await consumer.run({
				eachMessage: async ({ topic, message }) => {

					let data: IDataObject = {};
					let value = message.value?.toString() as string;

					if (options.jsonParseMessage) {
						try {
							value = JSON.parse(value);
						} catch (error) { }
					}

					if (useSchemaRegistry) {
						try {
							const registry = new SchemaRegistry({ host: schemaRegistryUrl });
							value = await registry.decode(message.value as Buffer);
						} catch (error) { }
					}

					if (options.returnHeaders && message.headers) {
						const headers: {[key: string]: string} = {};
						for (const key of Object.keys(message.headers)) {
							const header = message.headers[key];
							headers[key] = header?.toString('utf8') || '';
						}

						data.headers = headers;
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
