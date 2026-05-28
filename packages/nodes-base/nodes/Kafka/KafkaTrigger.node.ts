import type { EachBatchPayload } from 'kafkajs';
import { Kafka as apacheKafka } from 'kafkajs';
import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import {
	ensureError,
	NodeConnectionTypes,
	NodeOperationError,
	TriggerCloseError,
} from 'n8n-workflow';

import {
	type KafkaTriggerOptions,
	connectEventListeners,
	disconnectEventListeners,
	setSchemaRegistry,
	configureMessageParser,
	createConfig,
	createConsumerConfig,
	configureDataEmitter,
	getAutoCommitSettings,
	runWithHeartbeat,
} from './utils';

export class KafkaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kafka Trigger',
		name: 'kafkaTrigger',
		icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
		group: ['trigger'],
		version: [1, 1.1, 1.2, 1.3],
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
				displayName: 'Resolve Offset',
				name: 'resolveOffset',
				type: 'options',
				default: 'onCompletion',
				description:
					'Select on which condition the offsets should be resolved. In the manual mode, when execution started by clicking on Execute Workflow or Execute Step button, offsets are always resolved immediately after message received.',
				options: [
					{
						name: 'On Execution Completion',
						value: 'onCompletion',
						description: 'Resolve offset after execution completion regardless of the status',
					},
					{
						name: 'On Execution Success',
						value: 'onSuccess',
						description: 'Resolve offset only if execution status equals success',
					},
					{
						name: 'On Allowed Execution Statuses',
						value: 'onStatus',
						description: 'Resolve offset only if execution status in the list of selected statuses',
					},
					{
						name: 'Immediately',
						value: 'immediately',
						description:
							'Resolve offset immediately after message received. This option is not recommended as it can cause messages loss.',
					},
				],
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
			},
			{
				displayName: 'Allowed Statuses',
				name: 'allowedStatuses',
				type: 'multiOptions',
				default: ['success'],
				options: [
					{
						name: 'Canceled',
						value: 'canceled',
					},
					{
						name: 'Crashed',
						value: 'crashed',
					},
					{
						name: 'Error',
						value: 'error',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'Running',
						value: 'running',
					},
					{
						name: 'Success',
						value: 'success',
					},
					{
						name: 'Unknown',
						value: 'unknown',
					},
					{
						name: 'Waiting',
						value: 'waiting',
					},
				],
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.3 } }],
						resolveOffset: ['onStatus'],
					},
				},
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
						description: 'Whether to allow sending message to a previously non-existing topic',
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
						displayName: 'Each Batch Auto Resolve',
						name: 'eachBatchAutoResolve',
						type: 'boolean',
						default: false,
						description: 'Whether to auto resolve offsets for each batch',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
							},
						},
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
						default: 10000,
						description:
							'Controls how often the consumer sends heartbeats to the broker to indicate it is still alive. Must be lower than Session Timeout. Recommended value is approximately one third of the Session Timeout (for example: 10s heartbeat with 30s session timeout).',
						hint: 'Value in milliseconds',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
							},
						},
					},
					{
						displayName: 'Heartbeat Interval',
						name: 'heartbeatInterval',
						type: 'number',
						default: 3000,
						description: "Heartbeats are used to ensure that the consumer's session stays active",
						hint: 'The value must be set lower than Session Timeout',
						displayOptions: {
							hide: {
								'@version': [{ _cnd: { gte: 1.3 } }],
							},
						},
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
						displayName: 'Keep Message as Binary Data',
						name: 'keepBinaryData',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.2 } }],
							},
						},
						description:
							'Whether to keep message value as binary data for downstream processing (e.g., Avro deserialization)',
					},
					{
						displayName: 'Parallel Processing',
						name: 'parallelProcessing',
						type: 'boolean',
						default: true,
						description:
							'Whether to process messages in parallel resolving offsets independently or in order resolving offsets after execution completion. In the manual mode, when execution started by clicking on Execute Workflow or Execute Step button, messages are processed in parallel resolving offsets immediately.',
						displayOptions: {
							show: {
								'@version': [1.1, 1.2],
							},
						},
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
						displayName: 'Retry Delay on Error',
						name: 'errorRetryDelay',
						type: 'number',
						default: 5000,
						description:
							'Delay in milliseconds before retrying after a failed offset resolution. This prevents rapid retry loops that could overwhelm the Kafka broker.',
						hint: 'Value in milliseconds',
						typeOptions: {
							minValue: 1000,
						},
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
							},
							hide: {
								'/resolveOffset': ['immediately'],
							},
						},
					},
					{
						displayName: 'Session Timeout',
						name: 'sessionTimeout',
						type: 'number',
						default: 30000,
						description:
							'Timeout in milliseconds used to detect failures. Has to be higher than Heartbeat Interval. During the workflow execution heartbeat will be sent periodically to keep the session alive with configured Heartbeat Interval.',
						hint: 'Value in milliseconds',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const nodeVersion = this.getNode().typeVersion;

		const config = await createConfig(this);
		const kafka = new apacheKafka(config);
		const registry = setSchemaRegistry(this);

		const options = this.getNodeParameter('options', {}) as KafkaTriggerOptions;
		if (options.keepBinaryData && nodeVersion < 1.2) {
			options.keepBinaryData = undefined;
		}

		const consumerConfig = createConsumerConfig(this, options, nodeVersion);
		const consumer = kafka.consumer(consumerConfig);

		const processMessage = configureMessageParser(
			options,
			this.logger,
			registry,
			this.helpers.prepareBinaryData,
		);

		const topic = this.getNodeParameter('topic') as string;
		const batchSize = options.batchSize ?? 1;
		const partitionsConsumedConcurrently = options.partitionsConsumedConcurrently || undefined;

		const dataEmitter = configureDataEmitter(this, options, nodeVersion);

		const startConsumer = async () => {
			try {
				await consumer.connect();

				await consumer.subscribe({ topic, fromBeginning: options.fromBeginning ? true : false });

				await consumer.run({
					partitionsConsumedConcurrently,
					...getAutoCommitSettings(options),
					eachBatch: async ({
						batch,
						resolveOffset,
						heartbeat,
						isStale,
						isRunning,
						commitOffsetsIfNecessary,
					}: EachBatchPayload) => {
						// avoid throwing error in the callback, as it leads to consumer stop, disconnect and crash
						const messages = batch.messages;
						const messageTopic = batch.topic;

						for (let i = 0; i < messages.length; i += batchSize) {
							// stop if consumer stopped or partition revoked
							if (!isRunning() || isStale()) {
								this.logger.debug('Batch processing interrupted due to rebalance or consumer stop');
								break;
							}

							const chunk = messages.slice(i, Math.min(i + batchSize, messages.length));

							let processedData;
							try {
								processedData = await Promise.all(
									chunk.map(async (message) => await processMessage(message, messageTopic)),
								);
							} catch (err) {
								this.logger.error('Chunk processing failed, skipping commit for this chunk', err);
								await heartbeat();
								break;
							}

							const result = await runWithHeartbeat(
								dataEmitter(processedData),
								heartbeat,
								consumerConfig.heartbeatInterval,
							);

							if (!result.success) {
								this.logger.warn('runWithHeartbeat failed, skipping commit for this chunk');
								await heartbeat();
								break;
							}

							const lastMessage = chunk[chunk.length - 1];
							if (lastMessage) {
								resolveOffset(lastMessage.offset);
								await commitOffsetsIfNecessary();
							}

							await heartbeat();
						}
					},
				});
			} catch (error) {
				this.logger.error('Failed to start Kafka consumer', { error });
				throw new NodeOperationError(this.getNode(), error);
			}
		};

		const listeners = connectEventListeners(consumer, this.logger);

		const closeFunction = async () => {
			try {
				disconnectEventListeners(listeners);
				await consumer.stop();
				await consumer.disconnect();
			} catch (error) {
				throw new TriggerCloseError(this.getNode(), {
					cause: ensureError(error),
					level: 'warning',
				});
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
