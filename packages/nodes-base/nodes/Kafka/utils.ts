import type {
	Consumer,
	RemoveInstrumentationEventListener,
	KafkaMessage,
	KafkaConfig,
	SASLOptions,
	ConsumerConfig,
} from 'kafkajs';
import { logLevel } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { Logger, ITriggerFunctions, IDataObject, IRun } from 'n8n-workflow';
import { ensureError, jsonParse, NodeOperationError, sleep } from 'n8n-workflow';

// Default delay in milliseconds before retrying after a failed offset resolution.
// This prevents rapid retry loops that could overwhelm the Kafka broker
const DEFAULT_ERROR_RETRY_DELAY_MS = 5000;

export interface KafkaTriggerOptions {
	allowAutoTopicCreation?: boolean;
	autoCommitThreshold?: number;
	autoCommitInterval?: number;
	batchSize?: number;
	errorRetryDelay?: number;
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
}

interface KafkaCredentials {
	clientId: string;
	brokers: string;
	ssl: boolean;
	authentication: boolean;
	username?: string;
	password?: string;
	saslMechanism?: 'plain' | 'scram-sha-256' | 'scram-sha-512';
}

type ResolveOffsetMode = 'immediately' | 'onCompletion' | 'onSuccess' | 'onStatus';

export async function createConfig(ctx: ITriggerFunctions) {
	const credentials = (await ctx.getCredentials('kafka')) as KafkaCredentials;
	const clientId = credentials.clientId;
	const brokers = (credentials.brokers ?? '').split(',').map((item) => item.trim());
	const ssl = credentials.ssl;

	const config: KafkaConfig = {
		clientId,
		brokers,
		ssl,
		logLevel: logLevel.ERROR,
	};

	if (credentials.authentication) {
		if (!(credentials.username && credentials.password)) {
			throw new NodeOperationError(
				ctx.getNode(),
				'Username and password are required for authentication',
			);
		}
		config.sasl = {
			username: credentials.username as string,
			password: credentials.password as string,
			mechanism: credentials.saslMechanism as string,
		} as SASLOptions;
	}

	return config;
}

export function createConsumerConfig(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
) {
	const groupId = ctx.getNodeParameter('groupId') as string;
	const maxInFlightRequests = (
		ctx.getNodeParameter('options.maxInFlightRequests', null) === 0
			? null
			: ctx.getNodeParameter('options.maxInFlightRequests', null)
	) as number;

	let sessionTimeout: number;
	let heartbeatInterval: number;
	if (nodeVersion < 1.2) {
		sessionTimeout = options.sessionTimeout ?? 30000;
		heartbeatInterval = options.heartbeatInterval ?? 3000;
	} else {
		// Add 5 seconds buffer to ensure the session doesn't expire before the workflow completes
		const executionTimeoutInSeconds = (ctx.getWorkflowSettings().executionTimeout ?? 3600) + 5;
		sessionTimeout = executionTimeoutInSeconds * 1000;
		// KafkaJS recommends heartbeat interval to be 1/3 of session timeout
		// Manual heartbeat() calls in the batch loop keep the session alive during processing
		heartbeatInterval = Math.floor(sessionTimeout / 3);
	}

	const rebalanceTimeout = options.rebalanceTimeout ?? 600000;
	const maxBytesPerPartition = options.fetchMaxBytes;
	const minBytes = options.fetchMinBytes;

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

	return consumerConfig;
}

export function configureMessageParser(
	options: KafkaTriggerOptions,
	logger: Logger,
	registry: SchemaRegistry | undefined,
) {
	return async (message: KafkaMessage, messageTopic: string): Promise<IDataObject> => {
		let data: IDataObject = {};
		let value = message.value?.toString() as string;

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
}

export function connectEventListeners(consumer: Consumer, logger: Logger) {
	const onConnected = consumer.on(consumer.events.CONNECT, () => {
		logger.debug('Kafka consumer connected');
	});
	const onGroupJoin = consumer.on(consumer.events.GROUP_JOIN, () => {
		logger.debug('Consumer has joined the group');
	});
	const onRequestTimeout = consumer.on(consumer.events.REQUEST_TIMEOUT, () => {
		logger.error('Consumer request timed out');
	});
	const onUnsubscribedtopicsReceived = consumer.on(
		consumer.events.RECEIVED_UNSUBSCRIBED_TOPICS,
		() => {
			logger.warn('Consumer received messages for unsubscribed topics');
		},
	);
	const onStop = consumer.on(consumer.events.STOP, async (error) => {
		logger.error('Consumer has stopped', { error });
	});
	const onDisconnect = consumer.on(consumer.events.DISCONNECT, async (error) => {
		logger.error('Consumer has disconnected', { error });
	});
	const onCommitOffsets = consumer.on(consumer.events.COMMIT_OFFSETS, () => {
		logger.debug('Consumer offsets committed!');
	});
	const onRebalancing = consumer.on(consumer.events.REBALANCING, (payload) => {
		logger.debug('Consumer is rebalancing', { payload });
	});
	const onCrash = consumer.on(consumer.events.CRASH, async (error) => {
		logger.error('Consumer has crashed', { error });
	});

	return [
		onConnected,
		onGroupJoin,
		onRequestTimeout,
		onUnsubscribedtopicsReceived,
		onStop,
		onDisconnect,
		onCommitOffsets,
		onRebalancing,
		onCrash,
	];
}

export function disconnectEventListeners(
	listeners: Array<RemoveInstrumentationEventListener<'consumer.connect'>>,
) {
	listeners.forEach((listener) => listener());
}

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

export function configureDataEmitter(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
) {
	const executionTimeoutInSeconds = ctx.getWorkflowSettings().executionTimeout ?? 3600;
	const resolveOffsetMode = getResolveOffsetMode(ctx, options, nodeVersion);
	const errorRetryDelay = options.errorRetryDelay ?? DEFAULT_ERROR_RETRY_DELAY_MS;

	// For manual mode, always use immediate emit (no donePromise)
	if (ctx.getMode() === 'manual' || resolveOffsetMode === 'immediately') {
		return async (dataArray: IDataObject[]) => {
			ctx.emit([ctx.helpers.returnJsonArray(dataArray)]);
			return { success: true };
		};
	}

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

	return async (dataArray: IDataObject[]) => {
		let timeoutId: NodeJS.Timeout | undefined;
		try {
			const responsePromise = ctx.helpers.createDeferredPromise<IRun>();
			ctx.emit([ctx.helpers.returnJsonArray(dataArray)], undefined, responsePromise);

			const timeoutPromise = new Promise<IRun>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(
						new NodeOperationError(
							ctx.getNode(),
							`Execution took longer than the configured workflow timeout of ${executionTimeoutInSeconds} seconds to complete, offsets not resolved.`,
						),
					);
				}, executionTimeoutInSeconds * 1000);
			});

			const run = await Promise.race([responsePromise.promise, timeoutPromise]);

			if (timeoutId) clearTimeout(timeoutId);

			if (resolveOffsetMode !== 'onCompletion' && !allowedStatuses.includes(run.status)) {
				throw new NodeOperationError(
					ctx.getNode(),
					'Execution status is not allowed for resolving offsets, current status: ' + run.status,
				);
			}

			return { success: true };
		} catch (e) {
			if (timeoutId) clearTimeout(timeoutId);
			await sleep(errorRetryDelay);
			const error = ensureError(e);
			ctx.logger.error(error.message, { error });
			return { success: false };
		}
	};
}

export function getAutoCommitSettings(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
) {
	let shouldAutoCommit = true;

	if (nodeVersion >= 1.2 && ctx.getMode() !== 'manual') {
		const resolveOffset = ctx.getNodeParameter('resolveOffset', 'immediately') as ResolveOffsetMode;
		if (resolveOffset !== 'immediately') {
			const disableAutoResolveOffset = ctx.getNodeParameter(
				'disableAutoResolveOffset',
				false,
			) as boolean;
			shouldAutoCommit = !disableAutoResolveOffset;
		}
	}

	const autoCommitInterval = options.autoCommitInterval ?? undefined;
	const autoCommitThreshold = options.autoCommitThreshold ?? undefined;

	return {
		autoCommit: shouldAutoCommit,
		eachBatchAutoResolve: shouldAutoCommit,
		autoCommitInterval,
		autoCommitThreshold,
	};
}
