import { KafkaJS } from '@confluentinc/kafka-javascript';
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
	setSchemaRegistry,
	configureMessageParser,
	createConfig,
	createConsumerConfig,
	configureDataEmitter,
	getAutoCommitSettings,
	runWithHeartbeat,
	withTimeout,
	DISCONNECT_TIMEOUT_MS,
} from './utils';

const { Kafka: apacheKafka } = KafkaJS;
type EachBatchPayload = KafkaJS.EachBatchPayload;

export class KafkaConfluentTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kafka Trigger (Beta)',
		name: 'kafkaConfluentTrigger',
		icon: { light: 'file:../kafka.svg', dark: 'file:../kafka.dark.svg' },
		group: ['trigger'],
		version: [1],
		description: 'Consume messages from a Kafka topic (Confluent/librdkafka engine — beta)',
		defaults: {
			name: 'Kafka Trigger (Beta)',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'kafka',
				required: true,
			},
			{
				name: 'schemaRegistryApi',
				required: false,
				displayName: 'Schema Registry',
				displayOptions: {
					show: {
						useSchemaRegistry: [true],
					},
				},
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
				description:
					'ID of the consumer group. Use a dedicated group ID when testing — sharing the production group ID splits partitions and steals messages from the live trigger.',
			},
			{
				displayName: 'Resolve Offset',
				name: 'resolveOffset',
				type: 'options',
				default: 'onCompletion',
				description:
					'Select on which condition the offsets should be resolved. In manual mode offsets are always resolved immediately.',
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
			},
			{
				displayName: 'Allowed Statuses',
				name: 'allowedStatuses',
				type: 'multiOptions',
				default: ['success'],
				options: [
					{ name: 'Canceled', value: 'canceled' },
					{ name: 'Crashed', value: 'crashed' },
					{ name: 'Error', value: 'error' },
					{ name: 'New', value: 'new' },
					{ name: 'Running', value: 'running' },
					{ name: 'Success', value: 'success' },
					{ name: 'Unknown', value: 'unknown' },
					{ name: 'Waiting', value: 'waiting' },
				],
				displayOptions: {
					show: {
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
				displayOptions: {
					show: {
						useSchemaRegistry: [true],
					},
				},
				placeholder: 'https://schema-registry-domain:8081',
				default: '',
				description:
					'URL of the schema registry. Only used when no Schema Registry credential is selected.',
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
							'Number of messages to process in each batch. Set to 1 for message-by-message processing.',
					},
					{
						displayName: 'Each Batch Auto Resolve',
						name: 'eachBatchAutoResolve',
						type: 'boolean',
						default: false,
						description: 'Whether to auto resolve offsets for each batch',
					},
					{
						displayName: 'Fetch Max Bytes',
						name: 'fetchMaxBytes',
						type: 'number',
						default: 1048576,
						description:
							'Maximum amount of data the server should return for a fetch request. In bytes. Default is 1MB.',
					},
					{
						displayName: 'Fetch Min Bytes',
						name: 'fetchMinBytes',
						type: 'number',
						default: 1,
						description:
							'Minimum amount of data the server should return for a fetch request. In bytes.',
					},
					{
						displayName: 'Heartbeat Interval',
						name: 'heartbeatInterval',
						type: 'number',
						default: 10000,
						description:
							'Controls how often the consumer sends heartbeats to the broker. Must be lower than Session Timeout.',
						hint: 'Value in milliseconds',
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
						description:
							'Whether to keep message value as binary data for downstream processing (e.g., Avro deserialization)',
					},
					{
						displayName: 'Partitions Consumed Concurrently',
						name: 'partitionsConsumedConcurrently',
						type: 'number',
						default: 1,
						description:
							'Number of Kafka partitions to process in parallel. Controls how many partitions are processed concurrently by the consumer.',
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
						description:
							'The maximum time allowed for a consumer to join the group. Also sets max.poll.interval.ms — if a workflow takes longer than this, the consumer will be evicted.',
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
							'Timeout in milliseconds used to detect failures. Must be higher than Heartbeat Interval.',
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
		// @confluentinc/kafka-javascript requires an explicit value; undefined throws RangeError.
		const partitionsConsumedConcurrently = options.partitionsConsumedConcurrently || 1;

		const dataEmitter = configureDataEmitter(this, options, nodeVersion);

		const startConsumer = async () => {
			try {
				await consumer.connect();

				// fromBeginning is set on the consumer config (createConsumerConfig), not per-subscribe.
				await consumer.subscribe({ topic });

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
						const messages = batch.messages;
						const messageTopic = batch.topic;

						for (let i = 0; i < messages.length; i += batchSize) {
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
								consumerConfig.kafkaJS?.heartbeatInterval,
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

		const closeFunction = async () => {
			try {
				// @confluentinc/kafka-javascript has no consumer.stop() — disconnect() stops
				// consumption and leaves the group. Bound it with a timeout so a hung disconnect
				// surfaces instead of silently leaving an orphaned consumer (CAT-1686).
				await withTimeout(
					consumer.disconnect(),
					DISCONNECT_TIMEOUT_MS,
					'Kafka consumer disconnect',
				);
			} catch (error) {
				this.logger.error(
					'Kafka consumer did not disconnect cleanly; it may still be a member of the consumer group',
					{ error },
				);
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
