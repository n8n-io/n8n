import type { KafkaMessage } from 'kafkajs';
import { Kafka as apacheKafka } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type {
	ITriggerFunctions,
	IDataObject,
	INodeTypeDescription,
	ITriggerResponse,
	IRun,
	INodeExecutionData,
} from 'n8n-workflow';
import { Node, NodeConnectionType } from 'n8n-workflow';

import type { KafkaCredential, TriggerNodeOptions } from './types';
import { getConnectionConfig } from './GenericFunctions';

export class KafkaTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'Kafka Trigger',
		name: 'kafkaTrigger',
		icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
		group: ['trigger'],
		version: [1, 1.1],
		description: 'Consume messages from a Kafka topic',
		defaults: {
			name: 'Kafka Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
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
				description: 'Whether to use Confluent Schema Registry',
			},
			{
				displayName: 'Schema Registry URL',
				name: 'schemaRegistryUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						useSchemaRegistry: [true],
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
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Allow Topic Creation',
						name: 'allowAutoTopicCreation',
						type: 'boolean',
						default: false,
						description: 'Whether to allow sending message to a previously non exisiting topic',
					},
					{
						displayName: 'Auto Commit Threshold',
						name: 'autoCommitThreshold',
						type: 'number',
						default: 0,
						description:
							'The consumer will commit offsets after resolving a given number of messages',
					},
					{
						displayName: 'Auto Commit Interval',
						name: 'autoCommitInterval',
						type: 'number',
						default: 0,
						description:
							'The consumer will commit offsets after a given period, for example, five seconds',
						hint: 'Value in milliseconds',
					},
					{
						displayName: 'Heartbeat Interval',
						name: 'heartbeatInterval',
						type: 'number',
						default: 3000,
						description: "Heartbeats are used to ensure that the consumer's session stays active",
						hint: 'The value must be set lower than Session Timeout',
					},
					{
						displayName: 'Max Number of Requests',
						name: 'maxInFlightRequests',
						type: 'number',
						default: 1,
						description:
							'The maximum number of unacknowledged requests the client will send on a single connection',
					},
					{
						displayName: 'Read Messages From Beginning',
						name: 'fromBeginning',
						type: 'boolean',
						default: true,
						description: 'Whether to read message from beginning',
					},
					{
						displayName: 'JSON Parse Message',
						name: 'jsonParseMessage',
						type: 'boolean',
						default: false,
						description: 'Whether to try to parse the message to an object',
					},
					{
						displayName: 'Parallel Processing',
						name: 'parallelProcessing',
						type: 'boolean',
						default: true,
						displayOptions: {
							hide: {
								'@version': [1],
							},
						},
						description:
							'Whether to process messages in parallel or by keeping the message in order',
					},
					{
						displayName: 'Only Message',
						name: 'onlyMessage',
						type: 'boolean',
						displayOptions: {
							show: {
								jsonParseMessage: [true],
							},
						},
						default: false,
						description: 'Whether to return only the message property',
					},
					{
						displayName: 'Return Headers',
						name: 'returnHeaders',
						type: 'boolean',
						default: false,
						description: 'Whether to return the headers received from Kafka',
					},
					{
						displayName: 'Session Timeout',
						name: 'sessionTimeout',
						type: 'number',
						default: 30000,
						description: 'The time to await a response in ms',
						hint: 'Value in milliseconds',
					},
				],
			},
		],
	};

	async parsePayload(
		message: KafkaMessage,
		messageTopic: string,
		options: TriggerNodeOptions,
		context: ITriggerFunctions,
	): Promise<INodeExecutionData[][]> {
		const data: IDataObject = {};
		let value = message.value?.toString() as string;

		if (options.jsonParseMessage) {
			try {
				value = JSON.parse(value);
			} catch (error) {}
		}

		const useSchemaRegistry = context.getNodeParameter('useSchemaRegistry', 0) as boolean;
		if (useSchemaRegistry) {
			const schemaRegistryUrl = context.getNodeParameter('schemaRegistryUrl', 0) as string;
			try {
				const registry = new SchemaRegistry({ host: schemaRegistryUrl });
				value = await registry.decode(message.value as Buffer);
			} catch (error) {}
		}

		if (options.onlyMessage) {
			return [context.helpers.returnJsonArray([value as unknown as IDataObject])];
		}

		if (options.returnHeaders && message.headers) {
			const headers: { [key: string]: string } = {};
			for (const key of Object.keys(message.headers)) {
				const header = message.headers[key];
				headers[key] = header?.toString('utf8') || '';
			}

			data.headers = headers;
		}

		data.message = value;
		data.topic = messageTopic;

		return [context.helpers.returnJsonArray([data])];
	}

	async trigger(context: ITriggerFunctions): Promise<ITriggerResponse> {
		const topic = context.getNodeParameter('topic') as string;
		const groupId = context.getNodeParameter('groupId') as string;

		const options = context.getNodeParameter('options', {}) as TriggerNodeOptions;
		const nodeVersion = context.getNode().typeVersion;

		const credentials = await context.getCredentials<KafkaCredential>('kafka');
		const config = getConnectionConfig(context, credentials);
		const kafka = new apacheKafka(config);

		const consumer = kafka.consumer({
			groupId,
			maxInFlightRequests: options.maxInFlightRequests,
			sessionTimeout: options.sessionTimeout ?? 30000,
			heartbeatInterval: options.heartbeatInterval ?? 3000,
		});

		const startConsumer = async () => {
			await consumer.connect();
			await consumer.subscribe({ topic, fromBeginning: options.fromBeginning ? true : false });

			await consumer.run({
				autoCommitInterval: options.autoCommitInterval || null,
				autoCommitThreshold: options.autoCommitThreshold || null,
				eachMessage: async ({ topic: messageTopic, message }) => {
					const data = await this.parsePayload(message, messageTopic, options, context);
					const donePromise =
						!options.parallelProcessing && nodeVersion > 1 && context.getMode() === 'trigger'
							? context.helpers.createDeferredPromise<IRun>()
							: undefined;
					context.emit(data, undefined, donePromise);
					await donePromise?.promise;
				},
			});
		};

		async function manualTriggerFunction() {
			await startConsumer();
		}

		if (context.getMode() === 'trigger') {
			await startConsumer();
		}

		async function closeFunction() {
			await consumer.disconnect();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
