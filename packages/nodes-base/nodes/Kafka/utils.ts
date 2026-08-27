import type {
	Consumer,
	RemoveInstrumentationEventListener,
	KafkaMessage,
	KafkaConfig,
	SASLOptions,
	ConsumerConfig,
} from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { formatPemBlock } from '@n8n/utils/format-pem-block';
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
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { sleep } from '@n8n/utils/sleep';
import { jsonParse, NodeOperationError, OperationalError, UserError } from 'n8n-workflow';
import http from 'node:http';
import https from 'node:https';
import type { ConnectionOptions } from 'node:tls';

// Default delay in milliseconds before retrying after a failed offset resolution.
// This prevents rapid retry loops that could overwhelm the Kafka broker
export const DEFAULT_ERROR_RETRY_DELAY_MS = 5000;

/**
 * Node keeps a timer's delay in a 32-bit signed integer. Anything larger
 * overflows to a 1ms delay and only prints a process warning, so a value past
 * this is not a long wait, it is no wait at all.
 */
export const MAX_TIMER_DELAY_MS = 2_147_483_647;

/** True for a delay `setTimeout` would honour as written. Zero is fine. */
function isUsableDelay(value: number): boolean {
	return Number.isFinite(value) && value >= 0 && value <= MAX_TIMER_DELAY_MS;
}

/**
 * A usable retry delay in milliseconds, or the default when the value is not one.
 *
 * Unlike a count, zero is legitimate here and means "do not wait". Everything
 * `setTimeout` would quietly turn into no wait at all falls back instead:
 * `NaN`, `Infinity`, a negative, and anything past the 32-bit timer limit. The
 * pacing would otherwise disappear without anything failing. `??` alone does
 * not catch these, since none of them is `undefined`, and a node option can
 * arrive as any of them from an expression.
 * @param logger - Warns when a value was supplied and had to be replaced, so
 * the misconfiguration is visible rather than silently corrected. An absent
 * value is not a misconfiguration and is never warned about.
 */
export function resolveRetryDelay(value: number | undefined, logger?: Logger): number {
	if (value === undefined) return DEFAULT_ERROR_RETRY_DELAY_MS;

	if (typeof value !== 'number' || !isUsableDelay(value)) {
		logger?.warn(
			`Kafka "Retry Delay on Error" of ${String(value)} cannot be used as a delay, falling back to ${DEFAULT_ERROR_RETRY_DELAY_MS}ms`,
		);
		return DEFAULT_ERROR_RETRY_DELAY_MS;
	}
	return value;
}

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
	allowUnauthorizedCerts?: boolean;
	ca?: string;
	cert?: string;
	key?: string;
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
 * Normalizes a PEM credential field, throwing a clear error when the value is not
 * a PEM block (the most common paste mistake) so the failure surfaces at config
 * time instead of as an opaque TLS handshake error.
 *
 * The strict BEGIN/END check stays here rather than in the shared `formatPemBlock`
 * normalizer: that helper is a non-throwing, best-effort formatter used by many
 * credentials (it returns multi-block chains and unrecognized input unchanged), so
 * only this Kafka mTLS path wants to reject an incomplete PEM loudly at config time.
 * @param value - The raw PEM string from the credential
 * @param fieldName - Human-readable field name used in the error message
 */
export function formatAndValidatePem(value: string, fieldName: string): string {
	const formatted = formatPemBlock(value);
	// Require a matching BEGIN/END pair with the same label — a lone BEGIN header
	// (e.g. a truncated paste) would otherwise pass and only fail later as an
	// opaque TLS handshake error.
	if (!/-----BEGIN ([A-Z0-9 ]+)-----[\s\S]+-----END \1-----/.test(formatted)) {
		throw new UserError(`The Kafka ${fieldName} is not a valid PEM block`, {
			level: 'warning',
			description:
				'Paste the full PEM, including the "-----BEGIN ...-----" and "-----END ...-----" lines.',
		});
	}
	return formatted;
}

/** kafkajs's `tls.ConnectionOptions` fields take Buffers, the v2 library takes strings. */
function toPemBuffer(value: string, fieldName: string): Buffer {
	return Buffer.from(formatAndValidatePem(value, fieldName));
}

/**
 * Resolves the kafkajs `ssl` option from the Kafka credential. Returns the plain
 * boolean (system CAs, full verification — unchanged legacy behavior) unless the
 * credential supplies mTLS material (client cert + key), a custom CA, or the
 * "Ignore SSL Issues" toggle, in which case a `tls.ConnectionOptions` object is
 * built. Throws a clear error when the cert/key pair is incomplete or a value is
 * not PEM, so misconfiguration fails loudly rather than at the TLS handshake.
 * @param credentials - The decrypted Kafka credential
 */
export function resolveKafkaSsl(credentials: KafkaCredentials): ConnectionOptions | boolean {
	if (!credentials.ssl) return false;

	const cert = credentials.cert?.trim() ? credentials.cert : undefined;
	const key = credentials.key?.trim() ? credentials.key : undefined;
	const ca = credentials.ca?.trim() ? credentials.ca : undefined;
	const allowUnauthorized = credentials.allowUnauthorizedCerts === true;

	// A client certificate and its private key are only meaningful together.
	if (Boolean(cert) !== Boolean(key)) {
		throw new UserError('Kafka mTLS needs both a client certificate and a client private key', {
			level: 'warning',
			description:
				'Set both the "Client Certificate" and "Client Private Key" credential fields, or clear both.',
		});
	}

	// Nothing beyond plain server-side TLS configured: keep the boolean form so
	// existing SSL-only and SASL credentials are completely unaffected.
	if (!cert && !ca && !allowUnauthorized) return true;

	const sslOptions: ConnectionOptions = {};
	if (ca) sslOptions.ca = [toPemBuffer(ca, 'CA certificate')];
	if (cert) sslOptions.cert = toPemBuffer(cert, 'client certificate');
	if (key) sslOptions.key = toPemBuffer(key, 'client private key');
	if (allowUnauthorized) sslOptions.rejectUnauthorized = false;

	return sslOptions;
}

/**
 * Creates Kafka client configuration from n8n credentials
 * @param ctx - The trigger function context
 * @returns Kafka configuration object with authentication settings
 */
export async function createConfig(ctx: ITriggerFunctions) {
	// Loaded lazily so importing this module (shared with the v2 node, which runs on
	// a different Kafka library) never pulls `kafkajs` into the runtime.
	const { logLevel } = await import('kafkajs');

	const credentials = (await ctx.getCredentials('kafka')) as KafkaCredentials;
	const clientId = credentials.clientId;
	const brokers = (credentials.brokers ?? '').split(',').map((item) => item.trim());

	const config: KafkaConfig = {
		clientId,
		brokers,
		ssl: resolveKafkaSsl(credentials),
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

export function sanitizeRegistryError(error: unknown) {
	const ensured = ensureError(error);

	// URL userinfo first, and deliberately not the shared scrubber's rule for it.
	// Ours is greedy to the last `@`, so a password containing an unencoded `@`
	// is removed whole. The shared pattern stops at the first `@` and would leave
	// the tail of such a password in the log.
	const withoutUserinfo = ensured.message.replace(/\/\/[^/\s]+@/g, '//***@');

	// Then the shared scrubber, for anything the registry echoes back from a
	// response body that our URL rule cannot see: JWTs, Authorization headers,
	// provider API keys, `password=` style assignments.
	const scrubbed = scrubSecretsInText(withoutUserinfo);

	// Length capped last, so the cap applies to the redacted text.
	const message =
		scrubbed.length > MAX_REGISTRY_ERROR_MESSAGE_LENGTH
			? `${scrubbed.slice(0, MAX_REGISTRY_ERROR_MESSAGE_LENGTH)}...`
			: scrubbed;

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
 * @param closeSignal - Aborted when the trigger is being closed; unblocks any wait
 * on an in-flight execution so teardown is not delayed, leaving offsets unresolved
 * @returns Async function that emits data and waits for execution completion based on resolve mode
 */
export function configureDataEmitter(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
	closeSignal: AbortSignal,
) {
	const resolveOffsetMode = getResolveOffsetMode(ctx, options, nodeVersion);

	// For manual mode, always use immediate emit (no donePromise)
	if (ctx.getMode() === 'manual' || resolveOffsetMode === 'immediately') {
		return async (dataArray: INodeExecutionData[]) => {
			// Never start an execution once the trigger is closing.
			if (closeSignal.aborted) return { success: false };
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

	// Rejects on close; kept handled so it can never become an unhandled rejection.
	const abortPromise = new Promise<never>((_, reject) => {
		closeSignal.addEventListener(
			'abort',
			() =>
				reject(
					new OperationalError(
						'Trigger closed before the execution finished, offsets not resolved.',
					),
				),
			{ once: true },
		);
	});
	void abortPromise.catch(() => undefined);

	return async (dataArray: INodeExecutionData[]) => {
		// Never start an execution once the trigger is closing.
		if (closeSignal.aborted) return { success: false };

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

			const run = await Promise.race([responsePromise.promise, timeoutPromise, abortPromise]);

			if (resolveOffsetMode !== 'onCompletion' && !allowedStatuses.includes(run.status)) {
				throw new NodeOperationError(
					ctx.getNode(),
					'Execution status is not allowed for resolving offsets, current status: ' + run.status,
				);
			}

			return { success: true };
		} catch (e) {
			// The retry backoff must not delay teardown.
			if (!closeSignal.aborted) {
				await Promise.race([sleep(errorRetryDelay), abortPromise.catch(() => undefined)]);
			}
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
 * Bounds a promise with a timeout, rejecting with an `OperationalError` when it
 * does not settle in time. A late rejection of the abandoned promise stays
 * handled, so it cannot surface as an unhandled rejection.
 * @param promise - The promise to bound
 * @param ms - Timeout in milliseconds
 * @param message - Error message used when the timeout wins
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new OperationalError(message)), ms);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/**
 * Stops and disconnects a Kafka consumer, bounding each call so a hung broker
 * request cannot block teardown. Assumes close was already signaled by the
 * caller. When stop() times out while still pending, kafkajs disconnect() would
 * join the same shared stop promise, so the disconnect is instead chained in
 * the background for whenever stop settles.
 * @param consumer - The Kafka consumer instance
 * @param logger - Logger instance
 * @param timeoutMs - Upper bound for each teardown call
 * @returns The first teardown error, or undefined when teardown succeeded
 */
export async function stopAndDisconnectConsumer(
	consumer: Consumer,
	logger: Logger,
	timeoutMs: number,
): Promise<Error | undefined> {
	let teardownError: Error | undefined;
	let stopSettled = false;
	// Tracker is subscribed before the race so stopSettled is accurate when the
	// race settles.
	const stopPromise = consumer.stop();
	void stopPromise.then(
		() => (stopSettled = true),
		() => (stopSettled = true),
	);
	try {
		await withTimeout(stopPromise, timeoutMs, 'Kafka consumer did not stop in time');
	} catch (error) {
		teardownError = ensureError(error);
	}

	if (!stopSettled) {
		void stopPromise
			.catch(() => undefined)
			.then(async () => await consumer.disconnect())
			.catch((error: unknown) => {
				logger.warn('Kafka consumer disconnect after delayed stop failed', { error });
			});
		return teardownError;
	}

	// A failed stop() must not leave the broker connection open.
	try {
		await withTimeout(
			consumer.disconnect(),
			timeoutMs,
			'Kafka consumer did not disconnect in time',
		);
	} catch (error) {
		teardownError ??= ensureError(error);
	}
	return teardownError;
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
