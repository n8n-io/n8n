import type { KafkaJS } from '@confluentinc/kafka-javascript';
import type { INodeExecutionData } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { sleep } from '@n8n/utils/sleep';

import type { KafkaMessageParser } from './message-parser';
import { DEFAULT_ERROR_RETRY_DELAY_MS, withTimeout } from '../../utils';

/** Bounds teardown so a hung broker request cannot block deactivation, as in v1. */
const CLOSE_TIMEOUT_MS = 30_000;

/**
 * Ends a batch that close interrupted. It has to throw rather than return:
 * `eachBatchAutoResolve` is on, so returning normally would mark the batch read
 * even though nothing processed it, and a workflow being updated would lose
 * those messages. Throwing makes the library seek back, so the consumer that
 * replaces this one re-reads them.
 */
const closedDuringBatch = () =>
	new OperationalError('Kafka consumer closed before the batch was handed off');

/**
 * Partitions processed in parallel. Belongs to `run()`, not the constructor
 * config, so it lives here rather than with the factory in `transport/consumer`.
 *
 * The library defaults this to 1 when the key is absent, but it checks with
 * `Object.hasOwn`, so passing the key with an explicit `undefined` skips that
 * default and later fails in `Math.min(undefined, …)`. Never forward a
 * possibly-undefined user value straight through; resolve it to a number first.
 */
export const DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY = 1;

/** One parsed batch, handed to the caller together with its completion callback. */
export interface KafkaBatchHandOff {
	/** The parsed batch, in the item shape v1 produces. */
	items: INodeExecutionData[];
	topic: string;
	partition: number;
	/**
	 * Called once the caller is finished with the batch; the loop then returns
	 * from `eachBatch` and the library saves the read position.
	 */
	done: () => void;
}

/**
 * Receives a parsed batch. Provisional: ENT-225 owns when an offset is recorded
 * as done, and reshapes the completion callback accordingly.
 */
export type KafkaBatchHandler = (handOff: KafkaBatchHandOff) => void;

export interface ConsumeTopicOptions {
	topic: string;
	parseMessage: KafkaMessageParser;
	onBatch: KafkaBatchHandler;
	/** Defaults to {@link DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY}. */
	partitionsConsumedConcurrently?: number;
	/**
	 * How long to wait before letting a failed batch be re-delivered. The node
	 * maps v1's existing "Retry Delay on Error" option onto this; v1 applies it
	 * only to failed offset resolution, so the parse path was unpaced.
	 * Defaults to `DEFAULT_ERROR_RETRY_DELAY_MS`.
	 */
	errorRetryDelay?: number;
}

export interface KafkaConsumerHandle {
	/** Disconnects the consumer. ENT-226 owns making this clean under load. */
	close: () => Promise<void>;
}

/**
 * Connects, subscribes, and runs the consume loop, handing each parsed batch to
 * `onBatch`. Automatic progress-saving stays on (`eachBatchAutoResolve` is left
 * at the library default), so the read position advances once the loop returns
 * from a batch.
 * @param consumer - An unconnected consumer from `transport/consumer`
 * @param options - Topic, parser, and the batch hand-off
 */
export async function consumeTopic(
	consumer: KafkaJS.Consumer,
	options: ConsumeTopicOptions,
): Promise<KafkaConsumerHandle> {
	const { topic, parseMessage, onBatch } = options;
	const errorRetryDelay = options.errorRetryDelay ?? DEFAULT_ERROR_RETRY_DELAY_MS;
	// Unblocks a batch still waiting on its completion callback when the caller
	// closes, so teardown is not held up by an execution that never finishes.
	const closeController = new AbortController();
	const { signal } = closeController;

	// Resolves (never rejects) on close, so any wait below can be cut short
	// without risking an unhandled rejection.
	const closed = new Promise<void>((resolve) => {
		if (signal.aborted) return resolve();
		signal.addEventListener('abort', () => resolve(), { once: true });
	});

	/** Resolves when the caller signals the batch is done, rejects if close wins. */
	const handOff = async (batch: KafkaJS.Batch, items: INodeExecutionData[]) =>
		await new Promise<void>((resolve, reject) => {
			// Re-checked here, not just at the top of the batch: parsing is async, so a
			// close can land between the two points and would otherwise miss this listener.
			if (signal.aborted) return reject(closedDuringBatch());

			const onAbort = () => reject(closedDuringBatch());
			signal.addEventListener('abort', onAbort, { once: true });
			const detach = () => signal.removeEventListener('abort', onAbort);

			try {
				onBatch({
					items,
					topic: batch.topic,
					partition: batch.partition,
					done: () => {
						detach();
						resolve();
					},
				});
			} catch (error) {
				// A handler that throws synchronously would otherwise leave the abort
				// listener attached for the life of the consumer.
				detach();
				reject(error);
			}
		});

	try {
		await consumer.connect();
		await consumer.subscribe({ topics: [topic] });

		await consumer.run({
			partitionsConsumedConcurrently:
				options.partitionsConsumedConcurrently ?? DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY,
			eachBatch: async ({ batch }) => {
				// A batch delivered after close means a superseded consumer is still
				// being fed. Refuse it, and leave its offsets unread for its successor.
				if (signal.aborted) throw closedDuringBatch();

				// Errors are deliberately left to propagate. `eachBatchAutoResolve` is on,
				// so returning normally marks the batch read: swallowing a parse or
				// hand-off failure would skip those messages instead of retrying them.
				// The library logs and seeks back, keeping at-least-once.
				try {
					const items = await Promise.all(
						batch.messages.map(async (message) => await parseMessage(message, batch.topic)),
					);

					await handOff(batch, items);
				} catch (error) {
					// Pace the re-delivery. Without this the only thing spacing out retries
					// of a message that can never be parsed is the fetch cadence, which is
					// a tuning setting rather than a deliberate retry policy. Teardown is
					// never delayed. Deciding when to give up on such a message is ENT-226.
					if (!signal.aborted) {
						await Promise.race([sleep(errorRetryDelay), closed]);
					}
					throw error;
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
