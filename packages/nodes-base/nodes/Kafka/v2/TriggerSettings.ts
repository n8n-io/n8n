import { randomUUID } from 'node:crypto';
import type { ITriggerFunctions, Logger } from 'n8n-workflow';

import type { DataEmitterOptions, KafkaMessageParserOptions, ResolveOffsetMode } from './consumer';
import type { KafkaConsumerOptions } from './transport';

/** v1.3's `options` collection. Every field is optional: a `collection` node
 * parameter only carries the keys the user actually set, never its declared
 * UI defaults, so the converters below resolve each one explicitly. */
export interface KafkaTriggerV2Options extends KafkaMessageParserOptions {
	batchSize?: number;
	partitionsConsumedConcurrently?: number;
	errorRetryDelay?: number;
	sessionTimeout?: number;
	heartbeatInterval?: number;
	rebalanceTimeout?: number;
	fetchMaxBytes?: number;
	fetchMinBytes?: number;
	maxInFlightRequests?: number;
	fromBeginning?: boolean;
	autoCommitInterval?: number;
}

/**
 * Everything `trigger()` needs, already read, defaulted and converted. The
 * node's own code only ever deals with `settings.xxx`, never a raw
 * `getNodeParameter` call or an `options.foo as bar`.
 */
export interface KafkaTriggerSettings {
	topic: string;
	/** Ready for the consumer factory, including the manual-run group. */
	consumer: KafkaConsumerOptions;
	/** Ready for the data emitter, including the manual-run offset mode. */
	emitter: DataEmitterOptions;
	/** The subset of options that changes the parsed item shape. */
	parser: KafkaMessageParserOptions;
	batchSize?: number;
	partitionsConsumedConcurrently?: number;
	errorRetryDelay?: number;
}

/** v1's defaults for the consumer settings, from `createConsumerConfig`. v2 is
 * always >= 1.3, so the heartbeat default is 1.3's 10s rather than 3s. */
const DEFAULT_SESSION_TIMEOUT_MS = 30_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 10_000;
const DEFAULT_REBALANCE_TIMEOUT_MS = 600_000;

/**
 * The most we may ask for. librdkafka accepts 1..86400000 for
 * `max.poll.interval.ms`, and the library doubles whatever it is given, so half
 * of that ceiling is the limit here.
 *
 * Going over does not fail cleanly: the doubled value overflows the 32-bit int
 * librdkafka stores it in, and the consumer refuses to connect complaining
 * about a negative number nobody chose. Measured against a real broker with a
 * 30 day workflow timeout: `value -1702967296 is outside allowed range
 * 1..86400000`.
 */
const MAX_REBALANCE_TIMEOUT_MS = 43_200_000;

/** librdkafka's range for `auto.commit.interval.ms`. 0 turns interval commits off. */
const MAX_AUTO_COMMIT_INTERVAL_MS = 86_400_000;

/**
 * A user-supplied millisecond value, or `undefined` to leave the library's own
 * default in place. Options can come from an expression, so a value that
 * librdkafka would reject is dropped with a warning rather than passed on: it
 * fails the whole connection, and the error names a number nobody typed.
 * @param value - The raw option
 * @param max - Largest value librdkafka accepts
 * @param label - Option name, for the warning
 * @param logger - Warns when a supplied value could not be used
 */
function millisecondsInRange(
	value: number | undefined,
	max: number,
	label: string,
	logger?: Logger,
): number | undefined {
	if (value === undefined) return undefined;

	const usable = Number.isFinite(value) && value >= 0 && value <= max;
	if (!usable) {
		logger?.warn(`Kafka ${label} ignored, outside the range the library accepts`, {
			supplied: value,
			allowed: `0..${max}`,
		});
		return undefined;
	}

	return value;
}

/**
 * Reads and resolves every node parameter up front, so the trigger below never
 * touches one directly. The single cast is contained here: a `collection`
 * parameter is untyped at the boundary, and this is the one place that knows
 * its shape.
 */
export function getSettings(this: ITriggerFunctions): KafkaTriggerSettings {
	const options = this.getNodeParameter('options', {}) as KafkaTriggerV2Options;
	const { executionTimeout } = this.getWorkflowSettings();

	// A manual test run always resolves immediately, as in v1: the editor discards
	// the run once it has its sample, so waiting on an execution that nothing will
	// finish would hold the batch open until close.
	const isManualRun = this.getMode() === 'manual';
	const resolveOffsetMode = isManualRun
		? 'immediately'
		: // Falls back to the field's own default rather than v1's 'immediately', so
			// an absent value keeps the at-least-once behaviour.
			(this.getNodeParameter('resolveOffset', 'onCompletion') as ResolveOffsetMode);

	return {
		topic: this.getNodeParameter('topic') as string,
		consumer: toConsumerOptions(
			// Read Messages From Beginning defaults to on, and a manual run's group is
			// brand new, so honouring it would replay the whole topic into the editor.
			// On an activated workflow the setting is moot anyway, since the group
			// already has a committed offset to resume from.
			isManualRun ? { ...options, fromBeginning: false } : options,
			manualRunGroupId(this.getNodeParameter('groupId') as string, isManualRun),
			executionTimeout,
			this.logger,
		),
		emitter: toEmitterOptions(
			options,
			resolveOffsetMode,
			this.getNodeParameter('allowedStatuses', []) as string[],
			executionTimeout,
		),
		parser: options,
		batchSize: options.batchSize,
		// 0 means "all partitions sequentially", which the loop expresses by
		// leaving the key off and taking its own default of 1.
		partitionsConsumedConcurrently: options.partitionsConsumedConcurrently || undefined,
		errorRetryDelay: options.errorRetryDelay,
	};
}

/**
 * The consumer group a run joins. A manual run gets a throwaway one.
 *
 * Sharing the configured group with an activated workflow means Kafka splits the
 * partitions between the two, and a test run resolves offsets immediately, so
 * pressing "Listen for test event" would mark messages read that the activated
 * workflow never saw. A group of its own leaves production untouched. v1 has
 * this defect and needs its own fix.
 *
 * The throwaway group is left behind on the broker; Kafka expires an empty group
 * on its own once its retention window passes.
 * @param configured - The node's Group ID parameter
 * @param isManualRun - Whether this is an editor test run
 */
export function manualRunGroupId(configured: string, isManualRun: boolean): string {
	return isManualRun ? `${configured}-n8n-manual-${randomUUID()}` : configured;
}

/**
 * Maps the node's options onto the consumer factory.
 *
 * `rebalanceTimeout` is the one value not passed straight through. In this
 * library it also becomes `max.poll.interval.ms`, the deadline to finish one
 * batch before the consumer is dropped from its group, and the library doubles
 * whatever it is given (`_consumer.js:711`). So the workflow's own execution
 * timeout is the deadline we actually want, and it is halved here to survive
 * that doubling, then capped at {@link MAX_REBALANCE_TIMEOUT_MS}. An unbounded
 * workflow timeout (<= 0), or one that is not a usable number, has no deadline
 * to derive from, so the Rebalance Timeout option stands in.
 * @param options - The node's `options` collection
 * @param groupId - The node's consumer group id
 * @param executionTimeoutSeconds - `getWorkflowSettings().executionTimeout`, raw
 * @param logger - Warns when a supplied value could not be used as given
 */
export function toConsumerOptions(
	options: KafkaTriggerV2Options,
	groupId: string,
	executionTimeoutSeconds: number | undefined,
	logger?: Logger,
): KafkaConsumerOptions {
	// A workflow timeout arrives as a number, but Rebalance Timeout can come from
	// an expression, so neither is trusted to be a usable one.
	const fromWorkflow =
		typeof executionTimeoutSeconds === 'number' &&
		Number.isFinite(executionTimeoutSeconds) &&
		executionTimeoutSeconds > 0;
	const configured = options.rebalanceTimeout;
	const fallbackMs =
		typeof configured === 'number' && Number.isFinite(configured) && configured > 0
			? configured
			: DEFAULT_REBALANCE_TIMEOUT_MS;
	const deadlineMs = fromWorkflow ? executionTimeoutSeconds * 1000 : fallbackMs;

	const wanted = Math.ceil(deadlineMs / 2);
	const rebalanceTimeout = Math.min(wanted, MAX_REBALANCE_TIMEOUT_MS);
	if (rebalanceTimeout !== wanted) {
		logger?.warn('Kafka processing deadline capped at the largest the library accepts, 24 hours', {
			requestedMs: deadlineMs,
			appliedMs: rebalanceTimeout * 2,
		});
	}

	return {
		groupId,
		sessionTimeout: options.sessionTimeout ?? DEFAULT_SESSION_TIMEOUT_MS,
		heartbeatInterval: options.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
		rebalanceTimeout,
		maxBytesPerPartition: options.fetchMaxBytes,
		minBytes: options.fetchMinBytes,
		// v1 turns 0 into `null` to mean "no limit". The library has no such
		// sentinel, so leave the key off and let its own default stand.
		maxInFlightRequests: options.maxInFlightRequests || undefined,
		fromBeginning: options.fromBeginning,
		// 0 is a real setting here, not "unset", so it must not go through the
		// falsy-to-undefined treatment maxInFlightRequests gets.
		autoCommitInterval: millisecondsInRange(
			options.autoCommitInterval,
			MAX_AUTO_COMMIT_INTERVAL_MS,
			'Auto Commit Interval',
			logger,
		),
	};
}

/**
 * Maps the node's options and offset settings onto the emitter.
 *
 * `executionTimeoutSeconds` is passed through raw: n8n treats <= 0 as
 * explicitly unbounded, and the emitter handles that. Coercing it to a default
 * here would reintroduce a deadline the user switched off.
 * @param options - The node's `options` collection
 * @param resolveOffsetMode - Already resolved, including the manual-mode override
 * @param allowedStatuses - Only meaningful when the mode is `onStatus`
 * @param executionTimeoutSeconds - `getWorkflowSettings().executionTimeout`, raw
 */
export function toEmitterOptions(
	options: KafkaTriggerV2Options,
	resolveOffsetMode: ResolveOffsetMode,
	allowedStatuses: string[],
	executionTimeoutSeconds: number | undefined,
): DataEmitterOptions {
	return {
		resolveOffsetMode,
		allowedStatuses,
		executionTimeoutSeconds,
		errorRetryDelay: options.errorRetryDelay,
	};
}
