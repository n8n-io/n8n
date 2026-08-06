import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { sleep } from '@n8n/utils/sleep';
import type { Logger } from 'n8n-workflow';

import type { DataEmitter } from './DataEmitter';
import type { KafkaMessageParser } from './MessageParser';
import { DEFAULT_ERROR_RETRY_DELAY_MS, withTimeout } from '../../utils';

/** Bounds teardown so a hung broker request cannot block deactivation, as in v1. */
const CLOSE_TIMEOUT_MS = 30_000;

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

/**
 * What to do with a chunk that can never be parsed. Left unhandled it stalls its
 * partition forever, which is what v1 does today.
 *
 * - `retryForever` keeps re-reading it. Never loses a message, but the partition
 *   stops progressing until someone intervenes. This is v1's behaviour.
 * - `pausePartition` stops consuming that partition. Other partitions keep going,
 *   and only a restart resumes it.
 * - `skipAfterAttempts` marks it read after {@link DEFAULT_POISON_MESSAGE_ATTEMPTS}
 *   tries and moves on. Deliberately loses the message, loudly.
 */
export type PoisonMessagePolicy = 'retryForever' | 'pausePartition' | 'skipAfterAttempts';

export const DEFAULT_POISON_MESSAGE_ATTEMPTS = 5;

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
	/** Defaults to `retryForever`, which is what v1 does. */
	poisonMessagePolicy?: PoisonMessagePolicy;
	/** Only used by `skipAfterAttempts`. Defaults to {@link DEFAULT_POISON_MESSAGE_ATTEMPTS}. */
	poisonMessageAttempts?: number;
}

export interface KafkaConsumerHandle {
	/** Disconnects the consumer. ENT-226 verifies this against a real broker. */
	close: () => Promise<void>;
}

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
	// Clamped: the loop steps by this, so a zero or negative value would never
	// advance and would re-emit the same chunk forever.
	const batchSize = Math.max(DEFAULT_BATCH_SIZE, Math.trunc(options.batchSize ?? 0));
	const errorRetryDelay = options.errorRetryDelay ?? DEFAULT_ERROR_RETRY_DELAY_MS;
	const poisonPolicy = options.poisonMessagePolicy ?? 'retryForever';
	const poisonAttempts = Math.max(
		1,
		Math.trunc(options.poisonMessageAttempts ?? DEFAULT_POISON_MESSAGE_ATTEMPTS),
	);
	/**
	 * Consecutive parse failures per stuck chunk, keyed by where it would resume
	 * from. Cleared once a chunk gets through or is skipped, so it only ever holds
	 * one entry per stuck partition. In memory only: a rebalance or a restart
	 * resets the count, which makes "after N attempts" best effort.
	 */
	const failedAttempts = new Map<string, number>();

	const closeController = new AbortController();
	const { signal } = closeController;

	// Resolves (never rejects) on close, so any wait below can be cut short
	// without risking an unhandled rejection.
	const closed = new Promise<void>((resolve) => {
		if (signal.aborted) return resolve();
		signal.addEventListener('abort', () => resolve(), { once: true });
	});

	/** Paces a re-delivery, unless teardown is already waiting. */
	const pauseBeforeRetry = async () => {
		if (signal.aborted) return;
		await Promise.race([sleep(errorRetryDelay), closed]);
	};

	try {
		await consumer.connect();
		await consumer.subscribe({ topics: [topic] });

		await consumer.run({
			partitionsConsumedConcurrently:
				options.partitionsConsumedConcurrently ?? DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY,
			// Off, as in v1: the loop below decides what counts as read. Leaving it on
			// would mark a whole batch done the moment the callback returns, including
			// messages no execution ever saw.
			eachBatchAutoResolve: false,
			eachBatch: async ({
				batch,
				resolveOffset,
				commitOffsetsIfNecessary,
				isRunning,
				isStale,
				pause,
			}) => {
				const { messages } = batch;

				for (let i = 0; i < messages.length; i += batchSize) {
					// Stop if the trigger is closing, the consumer stopped, or the partition
					// was revoked. Unresolved offsets are re-delivered, so stopping here
					// loses nothing.
					if (signal.aborted || !isRunning() || isStale()) {
						logger.debug('Kafka batch interrupted by close, rebalance or consumer stop');
						break;
					}

					const chunk = messages.slice(i, Math.min(i + batchSize, messages.length));
					const lastMessage = chunk[chunk.length - 1];
					const chunkKey = `${batch.topic}/${batch.partition}/${chunk[0]?.offset}`;

					const advance = async () => {
						if (!lastMessage) return;
						resolveOffset(lastMessage.offset);
						await commitOffsetsIfNecessary();
					};

					let items;
					try {
						items = await Promise.all(
							chunk.map(async (message) => await parseMessage(message, batch.topic)),
						);
					} catch (error) {
						const attempts = (failedAttempts.get(chunkKey) ?? 0) + 1;
						failedAttempts.set(chunkKey, attempts);
						logger.error('Kafka chunk could not be parsed, leaving it unresolved', {
							error,
							attempts,
							topic: batch.topic,
							partition: batch.partition,
						});

						if (poisonPolicy === 'skipAfterAttempts' && attempts >= poisonAttempts) {
							failedAttempts.delete(chunkKey);
							logger.warn(
								`Skipping ${chunk.length} Kafka message(s) that could not be parsed after ${attempts} attempts`,
								{ topic: batch.topic, partition: batch.partition, offset: chunk[0]?.offset },
							);
							await advance();
							continue;
						}

						if (poisonPolicy === 'pausePartition') {
							logger.warn('Pausing the Kafka partition after a message that could not be parsed', {
								topic: batch.topic,
								partition: batch.partition,
								offset: chunk[0]?.offset,
							});
							pause();
							break;
						}

						await pauseBeforeRetry();
						break;
					}

					const result = await emit(items);
					if (!result.success) {
						logger.warn('Kafka chunk was not processed, leaving it unresolved');
						break;
					}

					failedAttempts.delete(chunkKey);
					await advance();
				}
			},
		});
	} catch (error) {
		// Nothing else holds this consumer yet, so a failed start must not leave the
		// broker connection open. `connect()` is inside the try for symmetry rather
		// than because it leaks: the library marks a failed connect as disconnected
		// before rejecting, so disconnect() is a no-op on that path today.
		try {
			await consumer.disconnect();
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
