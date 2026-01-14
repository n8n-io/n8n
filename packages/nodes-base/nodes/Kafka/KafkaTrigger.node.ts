import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { KafkaConfig, SASLOptions } from 'kafkajs';
import { Kafka as apacheKafka, logLevel } from 'kafkajs';
import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IRun,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

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

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const topic = this.getNodeParameter('topic') as string;

		const groupId = this.getNodeParameter('groupId') as string;

		const credentials = await this.getCredentials('kafka');

		const brokers = ((credentials.brokers as string) ?? '').split(',').map((item) => item.trim());

		const clientId = credentials.clientId as string;

		const ssl = credentials.ssl as boolean;

		const options = this.getNodeParameter('options', {}) as IDataObject;

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

		const useSchemaRegistry = this.getNodeParameter('useSchemaRegistry', 0) as boolean;

		const schemaRegistryUrl = this.getNodeParameter('schemaRegistryUrl', 0) as string;

		const kafka = new apacheKafka(config);
		const consumer = kafka.consumer({
			groupId,
			maxInFlightRequests,
			sessionTimeout: this.getNodeParameter('options.sessionTimeout', 30000) as number,
			heartbeatInterval: this.getNodeParameter('options.heartbeatInterval', 3000) as number,
		});

		let closeFunctionWasCalled = false;
		let isReconnecting = false;
		let reconnectAttempts = 0;
		const MAX_RECONNECT_DELAY = 30000;

		async function closeFunction() {
			closeFunctionWasCalled = true;
			try {
				await consumer.disconnect();
			} catch (error) {
				// Ignore errors during intentional shutdown
			}
		}

		const reconnect = async () => {
			if (closeFunctionWasCalled || isReconnecting) return;

			isReconnecting = true;
			reconnectAttempts++;

			// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
			const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);

			this.logger.info('Attempting to reconnect Kafka consumer', {
				groupId,
				topic,
				attempt: reconnectAttempts,
				delayMs: delay,
			});

			await sleep(delay);

			try {
				try {
					await consumer.disconnect();
				} catch (disconnectError) {
					this.logger.debug('Error during disconnect (expected after crash)', {
						error:
							disconnectError instanceof Error ? disconnectError.message : String(disconnectError),
					});
				}

				await startConsumer();

				reconnectAttempts = 0;
				this.logger.info('Kafka consumer reconnected successfully', { groupId, topic });
			} catch (error) {
				this.logger.error('Failed to reconnect Kafka consumer', {
					error: error instanceof Error ? error.message : String(error),
					groupId,
					topic,
					attempt: reconnectAttempts,
				});
				// Schedule next attempt after this function completes to allow flag reset
				setTimeout(() => {
					isReconnecting = false;
					void reconnect();
				}, 0);
				return;
			}

			isReconnecting = false;
		};

		const registry = useSchemaRegistry ? new SchemaRegistry({ host: schemaRegistryUrl }) : null;

		const startConsumer = async () => {
			await consumer.connect();

			await consumer.subscribe({ topic, fromBeginning: options.fromBeginning ? true : false });
			await consumer.run({
				autoCommitInterval: (options.autoCommitInterval as number) || null,
				autoCommitThreshold: (options.autoCommitThreshold as number) || null,
				eachMessage: async ({ topic: messageTopic, message }) => {
					let data: IDataObject = {};
					let value = message.value?.toString() as string;

					if (options.jsonParseMessage) {
						try {
							value = JSON.parse(value);
						} catch (error) {
							this.logger.debug('Failed to parse message as JSON', {
								error: error instanceof Error ? error.message : String(error),
							});
						}
					}

					if (registry) {
						try {
							value = await registry.decode(message.value as Buffer);
						} catch (error) {
							this.logger.warn('Failed to decode message with schema registry', {
								error: error instanceof Error ? error.message : String(error),
							});
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
						//@ts-ignore
						data = value;
					}
					let responsePromise = undefined;
					if (!parallelProcessing && (options.nodeVersion as number) > 1) {
						responsePromise = this.helpers.createDeferredPromise<IRun>();
						this.emit([this.helpers.returnJsonArray([data])], undefined, responsePromise);
					} else {
						this.emit([this.helpers.returnJsonArray([data])]);
					}
					if (responsePromise) {
						await responsePromise.promise;
					}
				},
			});
		};

		consumer.on(consumer.events.CRASH, (event) => {
			if (!closeFunctionWasCalled && !isReconnecting) {
				this.logger.error('Kafka consumer crashed, will attempt to reconnect', {
					error: event.payload.error.message,
					groupId,
					topic,
				});
				void reconnect();
			}
		});

		consumer.on(consumer.events.DISCONNECT, () => {
			if (!closeFunctionWasCalled && !isReconnecting) {
				this.logger.warn('Kafka consumer disconnected unexpectedly', { groupId, topic });
				void reconnect();
			}
		});

		consumer.on(consumer.events.STOP, () => {
			if (!closeFunctionWasCalled && !isReconnecting) {
				this.logger.warn('Kafka consumer stopped unexpectedly', { groupId, topic });
				void reconnect();
			}
		});

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
