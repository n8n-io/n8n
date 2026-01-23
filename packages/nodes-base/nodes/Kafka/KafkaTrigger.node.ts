import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type {
	KafkaConfig,
	SASLOptions,
	EachBatchPayload,
	KafkaMessage,
	ConsumerConfig,
} from 'kafkajs';
import { Kafka as apacheKafka, logLevel } from 'kafkajs';
import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IRun,
} from 'n8n-workflow';
import {
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
	TriggerCloseError,
} from 'n8n-workflow';

interface KafkaTriggerOptions {
	allowAutoTopicCreation?: boolean;
	autoCommitThreshold?: number;
	autoCommitInterval?: number;
	batchSize?: number;
	fetchMaxBytes?: number;
	fetchMinBytes?: number;
	heartbeatInterval?: number;
	maxInFlightRequests?: number;
	fromBeginning?: boolean;
	jsonParseMessage?: boolean;
	parallelProcessing?: boolean;
	partitionsConsumedConcurrently?: number;
	onlyMessage?: boolean;
	returnHeaders?: boolean;
	rebalanceTimeout?: number;
	sessionTimeout?: number;
	nodeVersion?: number;
}

export class KafkaTrigger implements INodeType {
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
		outputs: [NodeConnectionTypes.Main],
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
						displayName: 'Batch Size',
						name: 'batchSize',
						type: 'number',
						default: 1,
						description:
							'Number of messages to process in each batch, when set to 1, message-by-message processing is enabled',
					},
					{
						displayName: 'Fetch Max Bytes',
						name: 'fetchMaxBytes',
						type: 'number',
						default: 1048576,
						description:
							'Maximum amount of data the server should return for a fetch request. In bytes. Default is 1MB. Higher values allow fetching more messages at once.',
					},
					{
						displayName: 'Fetch Min Bytes',
						name: 'fetchMinBytes',
						type: 'number',
						default: 1,
						description:
							'Minimum amount of data the server should return for a fetch request. In bytes. Server will wait up to fetchMaxWaitTime for this amount to accumulate.',
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
						displayName: 'Partitions Consumed Concurrently',
						name: 'partitionsConsumedConcurrently',
						type: 'number',
						default: 0,
						description:
							'Number of Kafka partitions to process in parallel. Controls how many partitions are processed concurrently by the consumer.',
						hint: 'Set to 0 to process all partitions sequentially',
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
						displayName: 'Rebalance Timeout',
						name: 'rebalanceTimeout',
						type: 'number',
						default: 600000,
						description: 'The maximum time allowed for a consumer to join the group',
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

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const topic = this.getNodeParameter('topic') as string;

		const groupId = this.getNodeParameter('groupId') as string;

		const credentials = await this.getCredentials('kafka');

		const brokers = ((credentials.brokers as string) ?? '').split(',').map((item) => item.trim());

		const clientId = credentials.clientId as string;

		const ssl = credentials.ssl as boolean;

		const options = this.getNodeParameter('options', {}) as KafkaTriggerOptions;

		options.nodeVersion = this.getNode().typeVersion;

		const config: KafkaConfig = {
			clientId,
			brokers,
			ssl,
			logLevel: logLevel.ERROR,
		};

		if (credentials.authentication === true) {
			if (!(credentials.username && credentials.password)) {
				throw new NodeOperationError(
					this.getNode(),
					'Username and password are required for authentication',
				);
			}
			config.sasl = {
				username: credentials.username as string,
				password: credentials.password as string,
				mechanism: credentials.saslMechanism as string,
			} as SASLOptions;
		}

		const maxInFlightRequests = (
			this.getNodeParameter('options.maxInFlightRequests', null) === 0
				? null
				: this.getNodeParameter('options.maxInFlightRequests', null)
		) as number;

		const parallelProcessing = options.parallelProcessing as boolean;
		const batchSize = options.batchSize ?? 1;
		const partitionsConsumedConcurrently = options.partitionsConsumedConcurrently || undefined;
		const sessionTimeout = options.sessionTimeout ?? 30000;
		const heartbeatInterval = options.heartbeatInterval ?? 3000;
		const rebalanceTimeout = options.rebalanceTimeout ?? 600000;
		const maxBytesPerPartition = options.fetchMaxBytes;
		const minBytes = options.fetchMinBytes;

		const useSchemaRegistry = this.getNodeParameter('useSchemaRegistry', 0) as boolean;
		const schemaRegistryUrl = this.getNodeParameter('schemaRegistryUrl', 0) as string;

		const kafka = new apacheKafka(config);

		const consumerConfig: ConsumerConfig = {
			groupId,
			maxInFlightRequests,
			sessionTimeout,
			heartbeatInterval,
			rebalanceTimeout,
		};

		if (maxBytesPerPartition !== undefined) {
			consumerConfig.maxBytesPerPartition = maxBytesPerPartition;
		}

		if (minBytes !== undefined) {
			consumerConfig.minBytes = minBytes;
		}

		const consumer = kafka.consumer(consumerConfig);

		const processMessage = async (
			message: KafkaMessage,
			messageTopic: string,
		): Promise<IDataObject> => {
			let data: IDataObject = {};
			let value = message.value?.toString() as string;

			if (options.jsonParseMessage) {
				try {
					value = jsonParse(value);
				} catch (error) {
					this.logger.warn('Could not parse message to JSON, returning as string', { error });
				}
			}

			if (useSchemaRegistry) {
				try {
					const registry = new SchemaRegistry({ host: schemaRegistryUrl });
					value = await registry.decode(message.value as Buffer);
				} catch (error) {
					this.logger.warn(
						'Could not decode message with Schema Registry, returning original message',
						{ error },
					);
				}
			}

			if (options.returnHeaders && message.headers) {
				data.headers = Object.fromEntries(
					Object.entries(message.headers).map(([headerKey, headerValue]) => [
						headerKey,
						headerValue?.toString('utf8') ?? '',
					]),
				);
			}

			data.message = value;
			data.topic = messageTopic;

			if (options.onlyMessage) {
				data = value as unknown as IDataObject;
			}

			return data;
		};

		const emitData = async (dataArray: IDataObject[]): Promise<void> => {
			if (!parallelProcessing && (options.nodeVersion as number) > 1) {
				const responsePromise = this.helpers.createDeferredPromise<IRun>();
				this.emit([this.helpers.returnJsonArray(dataArray)], undefined, responsePromise);
				await responsePromise.promise;
			} else {
				this.emit([this.helpers.returnJsonArray(dataArray)]);
			}
		};

		const startConsumer = async () => {
			try {
				await consumer.connect();

				await consumer.subscribe({ topic, fromBeginning: options.fromBeginning ? true : false });

				const useBatchProcessing = batchSize > 1;

				if (useBatchProcessing) {
					await consumer.run({
						autoCommitInterval: options.autoCommitInterval || null,
						autoCommitThreshold: options.autoCommitThreshold || null,
						partitionsConsumedConcurrently,
						eachBatch: async ({ batch, resolveOffset, heartbeat }: EachBatchPayload) => {
							const messages = batch.messages;
							const messageTopic = batch.topic;

							for (let i = 0; i < messages.length; i += batchSize) {
								const chunk = messages.slice(i, Math.min(i + batchSize, messages.length));

								const processedData = await Promise.all(
									chunk.map(async (message) => await processMessage(message, messageTopic)),
								);

								await emitData(processedData);

								const lastMessage = chunk[chunk.length - 1];
								if (lastMessage) {
									resolveOffset(lastMessage.offset);
								}

								await heartbeat();
							}
						},
					});
				} else {
					await consumer.run({
						autoCommitInterval: options.autoCommitInterval || null,
						autoCommitThreshold: options.autoCommitThreshold || null,
						partitionsConsumedConcurrently,
						eachMessage: async ({ topic: messageTopic, message }) => {
							const data = await processMessage(message, messageTopic);
							await emitData([data]);
						},
					});
				}
			} catch (error) {
				this.logger.error('Failed to start Kafka consumer', { error });
				throw new NodeOperationError(this.getNode(), error);
			}
		};

		const onConnected = consumer.on(consumer.events.CONNECT, () => {
			this.logger.debug('Kafka consumer connected');
		});
		const onGroupJoin = consumer.on(consumer.events.GROUP_JOIN, () => {
			this.logger.debug('Consumer has joined the group');
		});
		const onRequestTimeout = consumer.on(consumer.events.REQUEST_TIMEOUT, () => {
			this.logger.error('Consumer request timed out');
		});
		const onUnsubscribedtopicsReceived = consumer.on(
			consumer.events.RECEIVED_UNSUBSCRIBED_TOPICS,
			() => {
				this.logger.warn('Consumer received messages for unsubscribed topics');
			},
		);
		const onStop = consumer.on(consumer.events.STOP, async (error) => {
			this.logger.error('Consumer has stopped', { error });
		});
		const onDisconnect = consumer.on(consumer.events.DISCONNECT, async (error) => {
			this.logger.error('Consumer has disconnected', { error });
		});
		const onCommitOffsets = consumer.on(consumer.events.COMMIT_OFFSETS, () => {
			this.logger.debug('Consumer offsets committed!');
		});
		const onRebalancing = consumer.on(consumer.events.REBALANCING, (payload) => {
			this.logger.debug('Consumer is rebalancing', { payload });
		});
		const onCrash = consumer.on(consumer.events.CRASH, async (error) => {
			this.logger.error('Consumer has crashed', { error });
		});

		const closeFunction = async () => {
			try {
				// Clean up listeners
				onConnected();
				onGroupJoin();
				onRequestTimeout();
				onUnsubscribedtopicsReceived();
				onStop();
				onDisconnect();
				onCommitOffsets();
				onRebalancing();
				onCrash();

				await consumer.stop();
				await consumer.disconnect();
			} catch (error) {
				throw new TriggerCloseError(this.getNode(), { cause: error as Error, level: 'warning' });
			}
		};

		if (this.getMode() !== 'manual') {
			await startConsumer();
			return { closeFunction };
		} else {
			// The "manualTriggerFunction" function gets called by n8n
			// when a user is in the workflow editor and starts the
			// workflow manually. So the function has to make sure that
			// the emit() gets called with similar data like when it
			// would trigger by itself so that the user knows what data
			// to expect.
			async function manualTriggerFunction() {
				await startConsumer();
			}

			return {
				closeFunction,
				manualTriggerFunction,
			};
		}
	}
}
