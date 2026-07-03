import { KafkaJS } from '@confluentinc/kafka-javascript';

import type { KafkaTriggerOptions, KafkaCredentials } from './utils';

const { logLevel } = KafkaJS;
type SASLOptions = KafkaJS.SASLOptions;

/**
 * kafkajs-effective defaults preserved when translating to @confluentinc/kafka-javascript.
 * "Effective" = the n8n node default if the node set one, otherwise the kafkajs library default.
 * Goal: keep current behaviour identical after the library swap.
 */
export const KAFKAJS_DEFAULTS = {
	sessionTimeout: 30000,
	heartbeatIntervalLegacy: 3000, // node trigger < 1.3
	heartbeatIntervalV13: 10000, // node trigger >= 1.3
	rebalanceTimeout: 600000, // node override (kafkajs lib default is 60000)
	// kafkajs default; confluent/librdkafka default is 500ms. The node never exposed
	// this, so 5000ms is the de-facto current behaviour and we set it explicitly.
	maxWaitTimeInMs: 5000,
	producerTimeout: 30000,
} as const;

/**
 * Fallback `max.poll.interval.ms` when the workflow execution timeout is unlimited.
 * Cannot be infinite, so cap it at the kafkajs rebalanceTimeout default.
 */
export const DEFAULT_MAX_POLL_INTERVAL_MS = KAFKAJS_DEFAULTS.rebalanceTimeout;

/** Buffer between the in-callback await deadline and broker eviction (offset resolve/commit/return). */
export const MAX_POLL_BUFFER_MS = 30000;

/**
 * Resolves `max.poll.interval.ms` (the `rebalanceTimeout` in the kafkaJS compat layer).
 * librdkafka evicts the consumer if an `eachBatch` callback runs longer than this.
 * In "resolve on completion" mode the callback awaits the workflow execution, so we
 * tie this to the workflow `executionTimeout`:
 *
 * - explicit node `rebalanceTimeout` option always wins (user override)
 * - finite `executionTimeout` → `executionTimeout + buffer`
 * - unlimited (-1 / 0 / unset) → the default (cannot be infinite)
 */
export function resolveMaxPollIntervalMs(
	options: KafkaTriggerOptions,
	executionTimeoutSeconds: number | undefined,
): number {
	if (options.rebalanceTimeout) {
		return options.rebalanceTimeout;
	}
	if (executionTimeoutSeconds && executionTimeoutSeconds > 0) {
		return executionTimeoutSeconds * 1000 + MAX_POLL_BUFFER_MS;
	}
	return DEFAULT_MAX_POLL_INTERVAL_MS;
}

/**
 * Removes keys whose value is `undefined`. The confluent compat layer keys on
 * Object.hasOwn, so an undefined-valued key is forwarded to librdkafka and
 * rejected at runtime. Omitting the key lets the library default apply instead.
 */
function compact<T extends object>(obj: T): T {
	return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}

/**
 * Builds the client (Kafka constructor) config.
 * Callers must validate that username/password are present when authentication is true.
 */
export function buildClientConfig(credentials: KafkaCredentials): KafkaJS.CommonConstructorConfig {
	const brokers = (credentials.brokers ?? '').split(',').map((item) => item.trim());

	const kafkaJS: KafkaJS.KafkaConfig = {
		brokers,
		ssl: credentials.ssl,
		logLevel: logLevel.ERROR,
	};

	// Omit empty clientId so librdkafka's default applies.
	if (credentials.clientId) {
		kafkaJS.clientId = credentials.clientId;
	}

	if (credentials.authentication) {
		kafkaJS.sasl = {
			username: credentials.username,
			password: credentials.password,
			mechanism: credentials.saslMechanism,
		} as SASLOptions;
	}

	return { kafkaJS: compact(kafkaJS) };
}

/**
 * Builds the consumer config, preserving kafkajs-effective behaviour.
 * fromBeginning/autoCommit/autoCommitInterval are per-consumer here (they were
 * per-subscribe/per-run in kafkajs). autoCommitThreshold is dropped (unsupported).
 */
export function buildConsumerConfig(
	groupId: string,
	options: KafkaTriggerOptions,
	nodeVersion: number,
	executionTimeoutSeconds: number | undefined,
): KafkaJS.ConsumerConstructorConfig {
	const heartbeatInterval =
		options.heartbeatInterval ??
		(nodeVersion < 1.3
			? KAFKAJS_DEFAULTS.heartbeatIntervalLegacy
			: KAFKAJS_DEFAULTS.heartbeatIntervalV13);

	// 0 means "unset" in the node UI; treat as omitted so it does not reach the client.
	const maxInFlightRequests =
		options.maxInFlightRequests && options.maxInFlightRequests !== 0
			? options.maxInFlightRequests
			: undefined;

	const kafkaJS = compact({
		groupId,
		sessionTimeout: options.sessionTimeout ?? KAFKAJS_DEFAULTS.sessionTimeout,
		heartbeatInterval,
		// rebalanceTimeout == max.poll.interval.ms in librdkafka. Tied to the workflow
		// executionTimeout so long "resolve on completion" executions are not evicted.
		// User override / unlimited handling in resolveMaxPollIntervalMs.
		rebalanceTimeout: resolveMaxPollIntervalMs(options, executionTimeoutSeconds),
		// Preserve kafkajs's fetch-wait (confluent default would be 500ms).
		maxWaitTimeInMs: KAFKAJS_DEFAULTS.maxWaitTimeInMs,
		fromBeginning: options.fromBeginning ? true : false,
		autoCommit: true,
		// 0/unset -> omitted -> confluent default (5000). autoCommitThreshold is retired.
		autoCommitInterval: options.autoCommitInterval || undefined,
		// undefined -> omitted -> confluent default, which equals kafkajs's (1MB / 1 byte).
		maxBytesPerPartition: options.fetchMaxBytes,
		minBytes: options.fetchMinBytes,
		maxInFlightRequests,
	}) as KafkaJS.ConsumerConfig;

	return {
		kafkaJS,
		// The KafkaJS-compat layer caps every eachBatch call at 32 messages by default,
		// which makes the consumer ~30x chattier than kafkajs. Raise to a bounded value.
		'js.consumer.max.batch.size': 500,
	};
}
