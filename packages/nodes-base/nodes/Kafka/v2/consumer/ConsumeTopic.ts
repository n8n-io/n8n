import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { sleep } from '@n8n/utils/sleep';
import type { Logger } from 'n8n-workflow';

import type { DataEmitter } from './DataEmitter';
import type { KafkaMessageParser } from './MessageParser';
import { resolveRetryDelay, withTimeout } from '../../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsumeTopicOptions {
	topic: string;
	parseMessage: KafkaMessageParser;
	/** Starts an execution and reports whether its offsets may advance. */
	emit: DataEmitter;
	logger: Logger;
	/** Messages per execution. Defaults to {@link DEFAULT_BATCH_SIZE}. */
	batchSize?: number;
	/** Defaults to {@link DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY}. */
	partitionsConsumedConcurrently?: number;
	/**
	 * How long to wait before letting a failed chunk be re-delivered. The node
	 * maps v1's existing "Retry Delay on Error" option onto this; v1 applies it
	 * only to failed offset resolution, so the parse path was unpaced.
	 */
	errorRetryDelay?: number;
	/**
	 * Rejects when the transport reports a non-recoverable error, so a consumer
	 * that can never join its group fails startup instead of failing silently
	 * after a nominal start (ENT-340).
	 */
	startupFailure?: Promise<never>;
	/**
	 * The trigger's own close signal. Folded into the internal one so a cancel
	 * during startup ends the join wait, instead of the caller waiting out the
	 * grace period before teardown can begin.
	 */
	closeSignal?: AbortSignal;
}

export interface KafkaConsumerHandle {
	/** Disconnects the consumer. ENT-226 verifies this against a real broker. */
	close: () => Promise<void>;
}

/**
 * `ConsumeTopicOptions` with every optional resolved, so the loop never has to
 * reason about a missing or unusable value. Defaulting stays in this module
 * rather than moving to the node: the counts guard a loop increment and a
 * library config key, so every caller has to be covered, not just the node.
 */
interface ConsumeSettings {
	batchSize: number;
	partitionsConsumedConcurrently: number;
	errorRetryDelay: number;
}

/** What the batch loop needs, separated from how the consumer was started. */
interface BatchContext extends ConsumeSettings {
	parseMessage: KafkaMessageParser;
	emit: DataEmitter;
	logger: Logger;
	/** Aborted on teardown. */
	signal: AbortSignal;
	/** Paces a re-delivery, unless teardown is already waiting. */
	pauseBeforeRetry: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Bounds teardown so a hung broker request cannot block deactivation, as in v1. */
const CLOSE_TIMEOUT_MS = 30_000;

/** How often the startup join wait re-checks the consumer's assignment. */
const JOIN_POLL_INTERVAL_MS = 250;

/** How long startup waits for the group join outcome before proceeding anyway. */
const JOIN_GRACE_PERIOD_MS = 3000;

/**
 * Messages handed to one execution. v1's Batch Size default, and the reason the
 * library's batch is chunked rather than emitted whole: at 1 each message starts
 * its own execution.
 */
export const DEFAULT_BATCH_SIZE = 1;

/**
 * Partitions processed in parallel.
 *
 * The library defaults this to 1 when the key is absent, but it checks with
 * `Object.hasOwn`, so passing the key with an explicit `undefined` skips that
 * default and later fails in `Math.min(undefined, …)`. Never forward a
 * possibly-undefined user value straight through; resolve it to a number first.
 */
export const DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY = 1;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Connects, subscribes, and runs the consume loop.
 *
 * Automatic progress-saving is off, matching v1: the loop resolves offsets chunk
 * by chunk, and anything it does not resolve is re-delivered. So a failure part
 * way through a batch leaves the earlier chunks done rather than replaying them.
 * @param consumer - An unconnected consumer from `transport/consumer`
 * @param options - Topic, parser, emitter, and the chunking settings
 */
export async function consumeTopic(
	consumer: KafkaJS.Consumer,
	options: ConsumeTopicOptions,
): Promise<KafkaConsumerHandle> {
	const { topic, parseMessage, emit, logger } = options;
	const settings = resolveSettings(options);

	const closeController = new AbortController();

	const signal = options.closeSignal
		? AbortSignal.any([closeController.signal, options.closeSignal])
		: closeController.signal;

	// Turns "we are closing" into something a wait can race against, since you can
	// race a promise but not a signal. It only ever resolves: the loser of a race
	// is abandoned, and an abandoned rejection gets reported as unhandled.
	const closed = new Promise<void>((resolve) => {
		// The abort event fires once. If it already fired, no listener would run.
		if (signal.aborted) return resolve();
		signal.addEventListener('abort', () => resolve(), { once: true });
	});

	/** Paces a re-delivery, unless teardown is already waiting. */
	const pauseBeforeRetry = async () => {
		if (signal.aborted) return;
		await Promise.race([sleep(settings.errorRetryDelay), closed]);
	};

	const context: BatchContext = {
		...settings,
		parseMessage,
		emit,
		logger,
		signal,
		pauseBeforeRetry,
	};

	try {
		await consumer.connect();
		await consumer.subscribe({ topics: [topic] });

		await consumer.run({
			partitionsConsumedConcurrently: settings.partitionsConsumedConcurrently,
			// Off, as in v1: processBatch decides what counts as read. Leaving it on
			// would mark a whole batch done the moment the callback returns, including
			// messages no execution ever saw.
			eachBatchAutoResolve: false,
			eachBatch: async (payload) => await processBatch(payload, context),
		});

		await waitForGroupJoin(consumer, signal, closed, options.startupFailure);
	} catch (error) {
		// Nothing else holds this consumer yet, so a failed start must not leave the
		// broker connection open. `connect()` is inside the try for symmetry rather
		// than because it leaks: the library marks a failed connect as disconnected
		// before rejecting, so disconnect() is a no-op on that path today.
		try {
			closeController.abort();
			await withTimeout(
				consumer.disconnect(),
				CLOSE_TIMEOUT_MS,
				'Kafka consumer did not disconnect in time',
			);
		} catch {
			// The start failure is the useful one; a failing disconnect must not mask it.
		}
		throw error;
	}

	return {
		close: async () => {
			closeController.abort();
			// The library's `stop()` is not implemented, so disconnect is the only lever.
			// Bounded, so a hung broker cannot keep a superseded consumer in the group.
			await withTimeout(
				consumer.disconnect(),
				CLOSE_TIMEOUT_MS,
				'Kafka consumer did not disconnect in time',
			);
		},
	};
}

/**
 * Holds startup until the consumer joins its group, a non-recoverable error
 * surfaces, or the grace period elapses. The library resolves connect,
 * subscribe and run before the join settles, so without this wait a group the
 * consumer can never join still reported a successful start (ENT-340).
 *
 * Expiry is deliberately success: zero partitions can be legitimate (more
 * members than partitions, a slow rebalance), so only an observed fatal error
 * may fail startup, never the clock. A close ends the wait the same way, so the
 * caller reaches its teardown rather than paying out the grace period first.
 */
async function waitForGroupJoin(
	consumer: KafkaJS.Consumer,
	signal: AbortSignal,
	closed: Promise<void>,
	startupFailure?: Promise<never>,
): Promise<void> {
	const pollUntilJoined = async () => {
		const deadline = Date.now() + JOIN_GRACE_PERIOD_MS;
		while (Date.now() < deadline && !signal.aborted) {
			try {
				if (consumer.assignment().length > 0) return;
			} catch {
				// assignment() throws ERR__STATE while not connected; means "not joined".
			}
			await Promise.race([sleep(JOIN_POLL_INTERVAL_MS), closed]);
		}
	};
	// Race the whole poll, not each pause: a fatal that fired first must win
	// even if a later poll would see a joined group.
	await (startupFailure ? Promise.race([pollUntilJoined(), startupFailure]) : pollUntilJoined());
}

// ---------------------------------------------------------------------------
// The batch loop
// ---------------------------------------------------------------------------

/**
 * Walks one library batch in chunks, handing each to a workflow and advancing
 * the read position only once that workflow permits it.
 *
 * Stopping early is always safe: whatever is left unresolved is re-delivered.
 * That is how a close, a rebalance and a failure all end up doing the right
 * thing without any of them needing to undo work.
 */
async function processBatch(
	{ batch, resolveOffset, commitOffsetsIfNecessary, isRunning, isStale }: KafkaJS.EachBatchPayload,
	context: BatchContext,
): Promise<void> {
	const { batchSize, parseMessage, emit, logger, signal, pauseBeforeRetry } = context;
	const { messages } = batch;

	for (let i = 0; i < messages.length; i += batchSize) {
		// Stop if the trigger is closing, the consumer stopped, or the partition
		// was revoked. Unresolved offsets are re-delivered, so stopping here
		// loses nothing.
		if (signal.aborted || !isRunning() || isStale()) {
			logger.debug('Kafka batch interrupted by close, rebalance or consumer stop');
			return;
		}

		const chunk = messages.slice(i, Math.min(i + batchSize, messages.length));

		let items;
		try {
			items = await Promise.all(
				chunk.map(async (message) => await parseMessage(message, batch.topic)),
			);
		} catch (error) {
			// Coordinates included: this message is now re-read indefinitely, and
			// the log is the only way to find which one it is.
			logger.error('Kafka chunk could not be parsed, leaving it unresolved', {
				error,
				topic: batch.topic,
				partition: batch.partition,
				offset: chunk[0]?.offset,
			});
			await pauseBeforeRetry();
			return;
		}

		if (!(await emit(items)).mayAdvance) {
			logger.warn('Kafka chunk was not processed, leaving it unresolved');
			return;
		}

		const lastMessage = chunk[chunk.length - 1];
		if (lastMessage) {
			resolveOffset(lastMessage.offset);
			await commitOffsetsIfNecessary();
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fills in every optional, so the loop only ever sees usable values. */
function resolveSettings(options: ConsumeTopicOptions): ConsumeSettings {
	const { logger } = options;
	return {
		batchSize: positiveCount(options.batchSize, DEFAULT_BATCH_SIZE, 'Batch Size', logger),
		partitionsConsumedConcurrently: positiveCount(
			options.partitionsConsumedConcurrently,
			DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY,
			'Parallel Processing',
			logger,
		),
		errorRetryDelay: resolveRetryDelay(options.errorRetryDelay, logger),
	};
}

/**
 * A whole number of at least one, or the fallback when the value cannot be used
 * as a count. Anything unusable takes the same path: not a number, not finite,
 * or below one.
 *
 * Both callers feed either a loop increment or a library config key, where `NaN`
 * does more damage than a merely wrong number. It slips past `??` because it is
 * not `undefined`, and past `Math.max` because every comparison with `NaN` is
 * false, and then quietly produces empty chunks or a broken worker count. A node
 * option can arrive as `NaN` from an expression that did not evaluate to a
 * number.
 * @param name - The option's user-facing name, for the warning
 * @param logger - Warns when a supplied value had to be replaced. A missing
 * value is not a misconfiguration, so it falls back quietly. A fractional one
 * is truncated rather than replaced, which needs no warning either.
 */
function positiveCount(
	value: number | undefined,
	fallback: number,
	name: string,
	logger: Logger,
): number {
	if (value === undefined) return fallback;

	const whole = typeof value === 'number' ? Math.trunc(value) : Number.NaN;
	if (!Number.isFinite(whole) || whole < 1) {
		logger.warn(`Kafka "${name}" of ${String(value)} cannot be used, falling back to ${fallback}`);
		return fallback;
	}
	return whole;
}
