/* eslint-disable n8n-nodes-base/node-filename-against-convention */
// The node class lives in KafkaTriggerV2.node.ts; this file only holds its UI
// description, so the filename cannot match `description.name` as the rule
// expects. Same exemption Notion, NocoDB and Webflow take for the same split.
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Kafka Trigger',
	name: 'kafkaTrigger',
	icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
	group: ['trigger'],
	version: 2,
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
				// "Allow Topic Creation" is deliberately absent. v1 declares it and never
				// reads it, and wiring it to the consumer's `allow.auto.create.topics`
				// changed nothing: measured against a real broker with auto-creation
				// enabled, a consumer subscribed to a missing topic did not create it
				// with the flag on or off. Not shipped as a third control that does
				// nothing.
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
				// "Each Batch Auto Resolve" is deliberately absent. The consume loop
				// resolves offsets chunk by chunk and turns the library's automatic
				// resolution off, so honouring it would mark messages read that no
				// execution ever saw. Dropped rather than shipped as a dead control.
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
					hint: 'Value in milliseconds. Lowered automatically if it is more than a third of the Session Timeout.',
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
					description:
						'How long one batch may take to process before the consumer is dropped from its group. Only used when the workflow has no execution timeout of its own, since that timeout is the real deadline and takes precedence.',
					hint: 'Value in milliseconds',
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
						'Timeout in milliseconds used to detect failures. Has to be higher than Heartbeat Interval. During the workflow execution heartbeat will be sent periodically to keep the session alive with configured Heartbeat Interval.',
					hint: 'Value in milliseconds. Lowering this below three times the Heartbeat Interval will lower the heartbeat to match.',
				},
			],
		},
	],
};
