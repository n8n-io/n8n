import { randomUUID } from 'node:crypto';
import type { ITriggerFunctions, Logger } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { DEFAULT_EXECUTION_TIMEOUT_SECONDS } from './consumer';
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
	/** Whether this is an editor test run, which gets a throwaway consumer group. */
	isManualRun: boolean;
	/** The Group ID as typed, before a manual run's suffix. For error messages. */
	configuredGroupId: string;
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
 * Kafka's own guidance, and the ratio both defaults already sit at: a heartbeat
 * every 10s against a 30s session. Three beats fit inside one session, so two
 * can be lost before the broker gives up on the consumer.
 */
const HEARTBEATS_PER_SESSION = 3;

/**
 * Keeps the heartbeat frequent enough for the session timeout it is paired with.
 *
 * The two options are independent in the UI but not in Kafka, and getting them
 * wrong fails silently rather than loudly. Lower Session Timeout to 10s and
 * leave the 10s heartbeat default alone, and the first beat lands exactly on the
 * deadline: the broker fences the consumer, the uncommitted offset is lost, and
 * the same message is redelivered forever with no error anywhere. Measured
 * against a real broker: a workflow that takes 5s re-ran the same message every
 * ~10s indefinitely.
 *
 * v1 has the same trap. Clamping is a deliberate improvement over it, and the
 * safe direction is unambiguous, so it is applied rather than only warned about.
 * @param heartbeatInterval - Resolved Heartbeat Interval, in milliseconds
 * @param sessionTimeout - Resolved Session Timeout, in milliseconds
 * @param logger - Warns when the supplied heartbeat had to be lowered
 */
function heartbeatWithinSession(
	heartbeatInterval: number,
	sessionTimeout: number,
	logger?: Logger,
): number {
	// An unusable session timeout is left to the broker, which refuses the join;
	// `transport/LibraryLogger` matches that refusal as non-recoverable.
	if (!Number.isFinite(sessionTimeout) || sessionTimeout <= 0) return heartbeatInterval;

	const largest = Math.floor(sessionTimeout / HEARTBEATS_PER_SESSION);
	if (Number.isFinite(heartbeatInterval) && heartbeatInterval <= largest) {
		return heartbeatInterval;
	}

	logger?.warn(
		'Kafka Heartbeat Interval lowered to stay under a third of the Session Timeout, so the consumer is not dropped from its group',
		{ supplied: heartbeatInterval, applied: largest, sessionTimeout },
	);
	return largest;
}

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

	const configuredGroupId = this.getNodeParameter('groupId') as string;

	return {
		topic: this.getNodeParameter('topic') as string,
		isManualRun,
		configuredGroupId,
		consumer: toConsumerOptions(
			// Read Messages From Beginning defaults to on, and a manual run's group is
			// brand new, so honouring it would replay the whole topic into the editor.
			// On an activated workflow the setting is moot anyway, since the group
			// already has a committed offset to resume from.
			isManualRun ? { ...options, fromBeginning: false } : options,
			manualRunGroupId(configuredGroupId, isManualRun),
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
	return isManualRun ? `${MANUAL_RUN_PREFIX(configured)}${randomUUID()}` : configured;
}

/** The part of a manual run's group id that is stable, and so grantable in an ACL. */
const MANUAL_RUN_PREFIX = (configured: string) => `${configured}-n8n-manual-`;

/** Broker rejections that mean the group itself was refused, not the credential. */
const GROUP_AUTHORIZATION_FAILED = /group authorization failed/i;

/**
 * Explains a group authorization failure on a manual run, where the group the
 * broker refused is one the user never chose and cannot see.
 *
 * On a cluster with an authorizer, group ACLs are usually granted `LITERAL` on
 * the exact Group ID. The throwaway group is a different resource name, so the
 * join is denied while the activated workflow keeps working: "Listen for test
 * event" fails on its own, and the raw broker message names neither the group
 * nor the fix. A `PREFIXED` ACL on the stable part covers every future test run.
 *
 * Only manual runs are rewritten. On an activated workflow the group is exactly
 * what the user typed, so the broker's own message is already actionable.
 * @param error - The error raised from the library's log stream
 * @param configuredGroupId - The node's Group ID parameter, before the suffix
 * @param isManualRun - Whether this is an editor test run
 */
export function explainManualRunGroupDenial(
	error: Error,
	configuredGroupId: string,
	isManualRun: boolean,
): Error {
	if (!isManualRun || !GROUP_AUTHORIZATION_FAILED.test(error.message)) return error;

	return new UserError('Kafka refused the consumer group used for a test run', {
		description: `A test run uses a throwaway consumer group so it cannot mark messages read for the activated workflow, and this cluster has not authorized it. Grant a prefixed group ACL for "${MANUAL_RUN_PREFIX(configuredGroupId)}", or run the workflow activated instead of testing it.`,
		cause: error,
	});
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
	const usableOption =
		typeof configured === 'number' && Number.isFinite(configured) && configured > 0;

	// Three sources, most specific first.
	//
	// The last one used to be the Rebalance Timeout default, which handed the broker
	// a 10 minute deadline while the emitter was still prepared to wait an hour for
	// the same execution. Anything in between was fenced and redelivered while n8n
	// believed the run still owned it: two of our own defaults disagreeing about one
	// deadline, so they are now the same value by construction.
	let deadlineMs: number;
	if (fromWorkflow) {
		deadlineMs = executionTimeoutSeconds * 1000;
	} else if (usableOption) {
		// No usable workflow timeout, but the user set this deliberately.
		deadlineMs = configured;
	} else {
		// Nothing set anywhere, so match how long the emitter will actually wait.
		deadlineMs = DEFAULT_EXECUTION_TIMEOUT_SECONDS * 1000;
	}

	const sessionTimeout = options.sessionTimeout ?? DEFAULT_SESSION_TIMEOUT_MS;

	// librdkafka refuses a `max.poll.interval.ms` below `session.timeout.ms`
	// (`rdkafka_conf.c:4257`, on the classic group protocol we use), and the
	// deadline becomes exactly that. A range check cannot catch it because both
	// values are individually legal. Left alone, a workflow timeout under the 30s
	// session default made the consumer refuse to connect, complaining about two
	// numbers where the user only chose one.
	// An unusable session timeout is left for librdkafka to reject by name, as the
	// heartbeat clamp does. Flooring against it would turn the deadline into NaN
	// and hide the value actually at fault behind a second complaint.
	const sessionUsable = Number.isFinite(sessionTimeout) && sessionTimeout > 0;
	const floored = sessionUsable ? Math.max(deadlineMs, sessionTimeout) : deadlineMs;
	if (floored !== deadlineMs) {
		logger?.warn(
			'Kafka processing deadline raised to the Session Timeout, the shortest the library allows',
			{ requestedMs: deadlineMs, appliedMs: floored, sessionTimeout },
		);
	}

	const wanted = Math.ceil(floored / 2);
	// Capped last: the ceiling exists to stop the doubled value overflowing a
	// 32-bit int, which outranks the floor above. They cannot both bite, since a
	// session timeout large enough to collide is one librdkafka already rejects.
	const rebalanceTimeout = Math.min(wanted, MAX_REBALANCE_TIMEOUT_MS);
	if (rebalanceTimeout !== wanted) {
		logger?.warn('Kafka processing deadline capped at the largest the library accepts, 24 hours', {
			requestedMs: deadlineMs,
			appliedMs: rebalanceTimeout * 2,
		});
	}

	return {
		groupId,
		sessionTimeout,
		heartbeatInterval: heartbeatWithinSession(
			options.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
			sessionTimeout,
			logger,
		),
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
