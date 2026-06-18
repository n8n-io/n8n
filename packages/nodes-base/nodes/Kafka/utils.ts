import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type {
	Logger,
	ITriggerFunctions,
	IDataObject,
	IRun,
	IBinaryKeyData,
	INodeExecutionData,
} from 'n8n-workflow';

import { ensureError, jsonParse, NodeOperationError, sleep } from 'n8n-workflow';

import {
	buildClientConfig,
	buildConsumerConfig,
	MAX_POLL_BUFFER_MS,
	resolveMaxPollIntervalMs,
} from './configConverter';

type KafkaMessage = KafkaJS.KafkaMessage;

// Default delay in milliseconds before retrying after a failed offset resolution.
// This prevents rapid retry loops that could overwhelm the Kafka broker
const DEFAULT_ERROR_RETRY_DELAY_MS = 5000;

export interface KafkaTriggerOptions {
	allowAutoTopicCreation?: boolean;
	autoCommitThreshold?: number;
	autoCommitInterval?: number;
	batchSize?: number;
	eachBatchAutoResolve?: boolean;
	errorRetryDelay?: number;
	fetchMaxBytes?: number;
	fetchMinBytes?: number;
	heartbeatInterval?: number;
	maxInFlightRequests?: number;
	fromBeginning?: boolean;
	jsonParseMessage?: boolean;
	keepBinaryData?: boolean;
	parallelProcessing?: boolean;
	partitionsConsumedConcurrently?: number;
	onlyMessage?: boolean;
	returnHeaders?: boolean;
	rebalanceTimeout?: number;
	sessionTimeout?: number;
}

export interface KafkaCredentials {
	clientId: string;
	brokers: string;
	ssl: boolean;
	authentication: boolean;
	username?: string;
	password?: string;
	saslMechanism?: 'plain' | 'scram-sha-256' | 'scram-sha-512';
}

type ResolveOffsetMode = 'immediately' | 'onCompletion' | 'onSuccess' | 'onStatus';

/**
 * Creates Kafka client configuration from n8n credentials
 * @param ctx - The trigger function context
 * @returns Kafka configuration object with authentication settings
 */
export async function createConfig(ctx: ITriggerFunctions) {
	const credentials = (await ctx.getCredentials('kafka')) as KafkaCredentials;

	if (credentials.authentication && !(credentials.username && credentials.password)) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Username and password are required for authentication',
		);
	}

	return buildClientConfig(credentials);
}

/**
 * Creates Kafka consumer configuration with session timeout and heartbeat settings
 * @param ctx - The trigger function context
 * @param options - Kafka trigger options from node parameters
 * @param nodeVersion - The version of the Kafka trigger node
 * @returns Consumer configuration object
 */
export function createConsumerConfig(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
) {
	const groupId = ctx.getNodeParameter('groupId') as string;
	const executionTimeout = ctx.getWorkflowSettings().executionTimeout;
	return buildConsumerConfig(groupId, options, nodeVersion, executionTimeout);
}

/**
 * Configures a message parser function that processes Kafka messages based on node options
 * @param options - Kafka trigger options for parsing behavior
 * @param logger - Logger instance for warnings
 * @param registry - Optional schema registry for message decoding
 * @param prepareBinaryData - Helper function to prepare binary data
 * @returns Async function that parses Kafka messages into n8n execution data
 */
export function configureMessageParser(
	options: KafkaTriggerOptions,
	logger: Logger,
	registry: SchemaRegistry | undefined,
	prepareBinaryData: ITriggerFunctions['helpers']['prepareBinaryData'],
) {
	return async (message: KafkaMessage, messageTopic: string): Promise<INodeExecutionData> => {
		let data: IDataObject = {};
		let value = message.value?.toString() as string;
		const binary: IBinaryKeyData = {};

		if (options.jsonParseMessage) {
			try {
				value = jsonParse(value);
			} catch (error) {
				logger.warn('Could not parse message to JSON, returning as string', { error });
			}
		}

		if (registry) {
			try {
				value = await registry.decode(message.value as Buffer);
			} catch (error) {
				logger.warn('Could not decode message with Schema Registry, returning original message', {
					error,
				});
			}
		}

		// Preserve raw binary data for downstream processing (only in v1.2+)
		if (options.keepBinaryData && message.value) {
			const binaryData = await prepareBinaryData(
				message.value as Buffer,
				'message',
				'application/octet-stream',
			);
			binary.data = binaryData;
		}

		if (options.returnHeaders && message.headers) {
			data.headers = Object.fromEntries(
				Object.entries(message.headers).map(([headerKey, headerValue]) => [
					headerKey,
					headerValue?.toString() ?? '',
				]),
			);
		}

		data.message = value;
		data.topic = messageTopic;

		if (options.onlyMessage) {
			data = value as unknown as IDataObject;
		}

		if (options.keepBinaryData && Object.keys(binary).length) {
			return { json: data, binary };
		}

		return { json: data };
	};
}

/**
 * Initializes Confluent Schema Registry if enabled in node parameters
 * @param ctx - The trigger function context
 * @returns Schema registry instance or undefined if not configured
 */
export function setSchemaRegistry(ctx: ITriggerFunctions) {
	const useSchemaRegistry = ctx.getNodeParameter('useSchemaRegistry', 0) as boolean;

	if (useSchemaRegistry) {
		try {
			const schemaRegistryUrl = ctx.getNodeParameter('schemaRegistryUrl', 0) as string;
			return new SchemaRegistry({ host: schemaRegistryUrl });
		} catch (error) {
			ctx.logger.warn('Could not connect to Schema Registry', { error });
		}
	}

	return undefined;
}

/**
 * Determines the offset resolution mode based on node version and configuration
 * @param ctx - The trigger function context
 * @param options - Kafka trigger options
 * @param nodeVersion - The version of the Kafka trigger node
 * @returns The offset resolution mode
 */
function getResolveOffsetMode(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
): ResolveOffsetMode {
	if (nodeVersion === 1) return 'immediately';

	if (nodeVersion === 1.1) {
		if (options.parallelProcessing) return 'immediately';
		return 'onCompletion';
	}
	return ctx.getNodeParameter('resolveOffset', 'immediately') as ResolveOffsetMode;
}

/**
 * Configures a data emitter function that handles workflow execution and offset resolution
 * @param ctx - The trigger function context
 * @param options - Kafka trigger options
 * @param nodeVersion - The version of the Kafka trigger node
 * @returns Async function that emits data and waits for execution completion based on resolve mode
 */
export function configureDataEmitter(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
) {
	const resolveOffsetMode = getResolveOffsetMode(ctx, options, nodeVersion);

	// For manual mode, always use immediate emit (no donePromise)
	if (ctx.getMode() === 'manual' || resolveOffsetMode === 'immediately') {
		return async (dataArray: INodeExecutionData[]) => {
			ctx.emit([dataArray]);
			return { success: true };
		};
	}

	// T2 (D): bound the await so a stuck/failed execution settles BEFORE librdkafka's
	// max.poll.interval (rebalanceTimeout) evicts the consumer, leaving a buffer for
	// offset resolve/commit/return. This keeps the poll loop alive instead of blocking
	// it into eviction (the "stops consuming after one message" failure we hit).
	const executionTimeout = ctx.getWorkflowSettings().executionTimeout;
	const maxPollIntervalMs = resolveMaxPollIntervalMs(options, executionTimeout);
	const awaitTimeoutMs = Math.max(1000, maxPollIntervalMs - MAX_POLL_BUFFER_MS);
	const errorRetryDelay = options.errorRetryDelay ?? DEFAULT_ERROR_RETRY_DELAY_MS;

	const allowedStatuses: string[] = [];
	if (resolveOffsetMode === 'onSuccess') {
		allowedStatuses.push('success');
	} else if (resolveOffsetMode === 'onStatus') {
		const selectedStatuses = ctx.getNodeParameter('allowedStatuses', []) as string[];

		if (Array.isArray(selectedStatuses) && selectedStatuses.length) {
			allowedStatuses.push(...selectedStatuses);
		} else {
			throw new NodeOperationError(
				ctx.getNode(),
				'At least one execution status must be selected to resolve offsets on selected statuses.',
			);
		}
	}

	return async (dataArray: INodeExecutionData[]) => {
		let timeoutId: NodeJS.Timeout | undefined;
		try {
			const responsePromise = ctx.helpers.createDeferredPromise<IRun>();
			ctx.emit([dataArray], undefined, responsePromise);

			const timeoutPromise = new Promise<IRun>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(
						new NodeOperationError(
							ctx.getNode(),
							`Execution did not complete within ${Math.round(awaitTimeoutMs / 1000)}s (bounded by max.poll.interval to avoid consumer eviction); offsets not resolved.`,
						),
					);
				}, awaitTimeoutMs);
			});

			const run = await Promise.race([responsePromise.promise, timeoutPromise]);

			if (resolveOffsetMode !== 'onCompletion' && !allowedStatuses.includes(run.status)) {
				throw new NodeOperationError(
					ctx.getNode(),
					'Execution status is not allowed for resolving offsets, current status: ' + run.status,
				);
			}

			return { success: true };
		} catch (e) {
			await sleep(errorRetryDelay);
			const error = ensureError(e);
			ctx.logger.error(error.message, { error });
			return { success: false };
		} finally {
			if (timeoutId) clearTimeout(timeoutId);
		}
	};
}

/**
 * Returns the per-run() settings for the consumer.
 *
 * With @confluentinc/kafka-javascript, autoCommit and autoCommitInterval are
 * configured on the consumer (see createConsumerConfig), not on run(), and
 * autoCommitThreshold is unsupported. Only eachBatchAutoResolve remains here.
 * @param options - Kafka trigger options
 * @returns Object with the run()-level auto-resolve setting
 */
export function getAutoCommitSettings(options: KafkaTriggerOptions) {
	return {
		eachBatchAutoResolve: options.eachBatchAutoResolve ?? false,
	};
}

/**
 * Runs a task while periodically invoking a heartbeat function
 * at specified intervals to prevent session timeout
 * @param task - The promise to execute
 * @param heartbeat - The heartbeat function to call periodically
 * @param intervalMs - The interval in milliseconds between heartbeat calls (default: 3000)
 * @returns The result of the task promise
 */
export async function runWithHeartbeat<T>(
	task: Promise<T>,
	heartbeat: () => Promise<void>,
	intervalMs = 3000,
) {
	let timer;

	try {
		timer = setInterval(async () => {
			try {
				await heartbeat();
			} catch (error) {}
		}, intervalMs);

		return await task;
	} finally {
		clearInterval(timer);
	}
}

// Upper bound for consumer.disconnect() during closeFunction (T5 #1). Bounds a hung
// disconnect so we surface it instead of silently leaving an orphaned group member.
export const DISCONNECT_TIMEOUT_MS = 30000;

/**
 * Races a promise against a timeout. Rejects with a labelled error if the promise
 * does not settle within `ms`. Used to bound `consumer.disconnect()` so a hung
 * teardown surfaces rather than leaving an orphaned consumer (CAT-1686 / T5 #1).
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
