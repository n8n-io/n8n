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
import type {
	Logger,
	ITriggerFunctions,
	IDataObject,
	IRun,
	IBinaryKeyData,
	INode,
	INodeExecutionData,
	FunctionsBase,
	RequestHelperFunctions,
} from 'n8n-workflow';
import { ensureError, jsonParse, NodeOperationError, sleep } from 'n8n-workflow';
import http from 'node:http';
import https from 'node:https';

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

interface KafkaCredentials {
	clientId: string;
	brokers: string;
	ssl: boolean;
	authentication: boolean;
	username?: string;
	password?: string;
	saslMechanism?: 'plain' | 'scram-sha-256' | 'scram-sha-512';
}

interface SchemaRegistryCredentials {
	url: string;
	authentication: 'none' | 'basicAuth';
	username?: string;
	password?: string;
}

interface SchemaRegistryOptions {
	host: string;
	auth?: { username: string; password: string };
}

type ResolveOffsetMode = 'immediately' | 'onCompletion' | 'onSuccess' | 'onStatus';

/**
 * Creates Kafka client configuration from n8n credentials
 * @param ctx - The trigger function context
 * @returns Kafka configuration object with authentication settings
 */
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
	const maxInFlightRequests = (
		ctx.getNodeParameter('options.maxInFlightRequests', null) === 0
			? null
			: ctx.getNodeParameter('options.maxInFlightRequests', null)
	) as number;

	const sessionTimeout = options.sessionTimeout ?? 30000;
	let heartbeatInterval: number;
	if (nodeVersion < 1.3) {
		heartbeatInterval = options.heartbeatInterval ?? 3000;
	} else {
		heartbeatInterval = options.heartbeatInterval ?? 10000;
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
				logger.warn(
					'Could not decode message with Schema Registry, returning original message',
					sanitizeRegistryError(error),
				);
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
					headerValue?.toString('utf8') ?? '',
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
 * Maps a fatal consumer error to a user-facing error. Known cases (such as a
 * topic compressed with a codec the client cannot decode) get an actionable
 * message that points the user at a fix; anything else is surfaced unchanged so
 * the original failure is still shown instead of an indefinite wait.
 * @param node - The node raising the error
 * @param error - The fatal error from the consumer
 */
export function toUserFacingConsumerError(node: INode, error: Error): Error {
	if (/compression not implemented/i.test(error.message)) {
		return new NodeOperationError(node, 'Kafka topic uses an unsupported compression codec', {
			description:
				'This topic contains messages compressed with LZ4, Snappy, or ZSTD, which the Kafka Trigger cannot decode (only GZIP and uncompressed messages are supported). Set the producer to use gzip or no compression to consume this topic.',
		});
	}

	return error;
}

/**
 * Handler invoked with a fatal (non-retriable) consumer error so the caller can
 * surface it to the execution instead of leaving the trigger waiting.
 */
export type ConsumerErrorHandler = (error: Error) => void;

/**
 * Attaches event listeners to the Kafka consumer for monitoring and logging
 * @param consumer - The Kafka consumer instance
 * @param logger - Logger instance for event logging
 * @param onFatalCrash - Optional handler called when the consumer crashes non-retriably
 * @returns Array of listener removal functions
 */
export function connectEventListeners(
	consumer: Consumer,
	logger: Logger,
	onFatalCrash?: ConsumerErrorHandler,
) {
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
	const onCrash = consumer.on(consumer.events.CRASH, (event) => {
		const { error, restart } = event.payload;
		logger.error('Consumer has crashed', { error, restart });
		// kafkajs auto-restarts retriable crashes (restart === true). A non-retriable
		// crash (e.g. an undecodable compressed batch, or a group authorization
		// failure) leaves the consumer dead; without surfacing it, the trigger just
		// keeps waiting forever. Route it to the caller so the execution can fail.
		if (!restart) {
			onFatalCrash?.(ensureError(error));
		}
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

/**
 * Removes all event listeners from the Kafka consumer
 * @param listeners - Array of listener removal functions
 */
export function disconnectEventListeners(
	listeners: Array<RemoveInstrumentationEventListener<'consumer.connect'>>,
) {
	listeners.forEach((listener) => listener());
}

/**
 * Builds a sanitized log payload from a schema registry error, so raw error
 * payloads are never logged: only the message (with any URL userinfo redacted,
 * since registry client errors embed full request URLs) and, when present, the
 * status
 * @param error - The caught error
 * @returns Log metadata with the redacted error message and optional status
 */
// The registry client interpolates the upstream HTTP response body into its
// error message, which can be large, so the logged message is bounded.
const MAX_REGISTRY_ERROR_MESSAGE_LENGTH = 500;

function sanitizeRegistryError(error: unknown) {
	const ensured = ensureError(error);
	const redacted = ensured.message.replace(/\/\/[^/\s]+@/g, '//***@');
	const message =
		redacted.length > MAX_REGISTRY_ERROR_MESSAGE_LENGTH
			? `${redacted.slice(0, MAX_REGISTRY_ERROR_MESSAGE_LENGTH)}...`
			: redacted;
	return {
		message,
		...('status' in ensured ? { status: ensured.status } : {}),
	};
}

/**
 * Resolves the Confluent Schema Registry connection options, preferring a
 * selected `schemaRegistryApi` credential over the legacy URL node parameter
 * @param ctx - The execution context (node or trigger)
 * @param fallbackUrl - The `schemaRegistryUrl` node parameter, used when no credential is selected
 * @returns Options for the `SchemaRegistry` constructor
 */
export async function getSchemaRegistryOptions(
	ctx: Pick<FunctionsBase, 'getNode' | 'getCredentials'>,
	fallbackUrl: string,
): Promise<SchemaRegistryOptions> {
	const emptyConfigError = () =>
		new NodeOperationError(
			ctx.getNode(),
			'Select a Schema Registry credential or enter a Schema Registry URL',
		);

	if (!ctx.getNode().credentials?.schemaRegistryApi) {
		const host = fallbackUrl.trim();
		if (!host) {
			throw emptyConfigError();
		}
		return { host };
	}

	const credentials = await ctx.getCredentials<SchemaRegistryCredentials>('schemaRegistryApi');

	const host = credentials.url?.trim();
	if (!host) {
		throw emptyConfigError();
	}

	const options: SchemaRegistryOptions = { host };

	if (credentials.authentication === 'basicAuth') {
		if (!(credentials.username && credentials.password)) {
			throw new NodeOperationError(
				ctx.getNode(),
				'Username and password are required for Schema Registry Basic Auth',
			);
		}
		options.auth = { username: credentials.username, password: credentials.password };
	}

	return options;
}

/**
 * Constructs a Schema Registry client from the resolved connection options.
 * Shared by the Kafka producer node and the Kafka Trigger; each caller layers
 * its own behavior on top (the producer resolves a schema id, the trigger
 * applies the warn-and-continue policy).
 * @param ctx - The execution context (node or trigger)
 * @param fallbackUrl - The `schemaRegistryUrl` node parameter, used when no credential is selected
 */
export async function createSchemaRegistry(
	ctx: Pick<FunctionsBase, 'getNode' | 'getCredentials'> & {
		helpers: Pick<RequestHelperFunctions, 'getSecureEgressFilter'>;
	},
	fallbackUrl: string,
): Promise<SchemaRegistry> {
	const options = await getSchemaRegistryOptions(ctx, fallbackUrl);

	const filter = ctx.helpers.getSecureEgressFilter();
	if (!filter) {
		// Egress filtering not configured: use the default transport unchanged.
		return new SchemaRegistry(options);
	}

	// Parse the configured host once. A valid registry host is an absolute
	// http(s) URL; if it does not parse or uses an unexpected scheme, reject so
	// the validated target always matches the target the client connects to.
	let parsed: URL;
	try {
		parsed = new URL(options.host);
	} catch {
		throw new NodeOperationError(ctx.getNode(), 'Verify your Schema Registry configuration', {
			description: 'The Schema Registry URL is not a valid URL',
		});
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new NodeOperationError(ctx.getNode(), 'Verify your Schema Registry configuration', {
			description: 'The Schema Registry URL must use http or https',
		});
	}

	// Validate the target host against the configured egress rules before any
	// request, covering direct/resolved IPs without DNS.
	const result = await filter.validateUrl(parsed);
	if (!result.ok) {
		throw new NodeOperationError(ctx.getNode(), 'Verify your Schema Registry configuration', {
			description: result.error.message,
		});
	}

	// Connect using the canonical href so the client re-parses the exact
	// authority we validated, and validate the resolved addresses at connect
	// time via the secure lookup.
	const agent =
		parsed.protocol === 'https:'
			? new https.Agent({ lookup: filter.createSecureLookup() })
			: new http.Agent({ lookup: filter.createSecureLookup() });
	return new SchemaRegistry({ ...options, host: parsed.href, agent });
}

/**
 * Initializes Confluent Schema Registry if enabled in node parameters
 * @param ctx - The trigger function context
 * @returns Schema registry instance or undefined if not configured
 */
export async function setSchemaRegistry(ctx: ITriggerFunctions) {
	const useSchemaRegistry = ctx.getNodeParameter('useSchemaRegistry', 0) as boolean;

	if (useSchemaRegistry) {
		try {
			const schemaRegistryUrl = ctx.getNodeParameter('schemaRegistryUrl', 0) as string;
			return await createSchemaRegistry(ctx, schemaRegistryUrl);
		} catch (error) {
			// Credential/config misconfiguration must fail loudly at activation
			if (error instanceof NodeOperationError) {
				throw error;
			}
			// Connection-type failures keep the warn-and-continue behavior
			ctx.logger.warn('Could not connect to Schema Registry', sanitizeRegistryError(error));
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

	const executionTimeoutInSeconds = ctx.getWorkflowSettings().executionTimeout ?? 3600;
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
							`Execution took longer than the configured workflow timeout of ${executionTimeoutInSeconds} seconds to complete, offsets not resolved.`,
						),
					);
				}, executionTimeoutInSeconds * 1000);
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
 * Determines auto-commit settings based on node's optons
 * @param options - Kafka trigger options
 * @returns Object with auto-commit configuration
 */
export function getAutoCommitSettings(options: KafkaTriggerOptions) {
	const eachBatchAutoResolve = options.eachBatchAutoResolve ?? false;

	const autoCommitInterval = options.autoCommitInterval ?? undefined;
	const autoCommitThreshold = options.autoCommitThreshold ?? undefined;

	return {
		autoCommit: true,
		eachBatchAutoResolve,
		autoCommitInterval,
		autoCommitThreshold,
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
