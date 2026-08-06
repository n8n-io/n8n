import type { INodeExecutionData, Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { KafkaCredentials } from '../../../utils';
import { consumeTopic } from '../../../v2/consumer/consume-topic';
import type { EmitResult } from '../../../v2/consumer/data-emitter';
import { createKafkaConsumer } from '../../../v2/transport/consumer';
import {
	confluentKafkaModuleMock,
	getFakeConsumers,
	resetConfluentKafkaRecordings,
	type FakeConsumer,
} from '../../mocks/confluent-kafka';

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

const credentials: KafkaCredentials = {
	clientId: 'n8n-test',
	brokers: 'localhost:9092',
	ssl: false,
	authentication: false,
};

/** Echoes just enough for the loop tests to tell items apart. */
const parseMessage = vi.fn(
	async (message: { value: Buffer | null }, topic: string): Promise<INodeExecutionData> => ({
		json: { message: message.value?.toString(), topic },
	}),
);

const emit = vi.fn(async (): Promise<EmitResult> => ({ success: true }));

let logger: Logger;

beforeEach(() => {
	resetConfluentKafkaRecordings();
	parseMessage.mockClear();
	emit.mockClear();
	logger = mock<Logger>();
});

const newConsumer = async (): Promise<FakeConsumer> => {
	await createKafkaConsumer(credentials, { groupId: 'n8n-kafka' });
	const consumer = getFakeConsumers().at(-1);
	if (!consumer) throw new Error('the fake recorded no consumer');
	return consumer;
};

type StartOverrides = {
	batchSize?: number;
	partitionsConsumedConcurrently?: number;
	errorRetryDelay?: number;
};

const start = async (overrides: StartOverrides = {}) => {
	const consumer = await newConsumer();
	const handle = await consumeTopic(consumer as never, {
		topic: 'orders',
		parseMessage,
		emit,
		logger,
		// Zero unless a test is specifically about the delay, so failure tests
		// assert behaviour without waiting out the real retry pacing.
		errorRetryDelay: 0,
		...overrides,
	});
	return { consumer, handle };
};

const messages = (...values: string[]) => values.map((value) => ({ value: Buffer.from(value) }));

describe('consumeTopic', () => {
	describe('startup', () => {
		it('connects, subscribes to the topic, and starts the loop', async () => {
			const { consumer } = await start();

			expect(consumer.connect).toHaveBeenCalledTimes(1);
			expect(consumer.subscribe).toHaveBeenCalledWith({ topics: ['orders'] });
			expect(consumer.run).toHaveBeenCalledTimes(1);
		});

		it('reads one partition at a time unless told otherwise', async () => {
			const { consumer } = await start();

			expect(consumer.runConfig?.partitionsConsumedConcurrently).toBe(1);
		});

		it('passes through a caller-chosen partition concurrency', async () => {
			const { consumer } = await start({ partitionsConsumedConcurrently: 4 });

			expect(consumer.runConfig?.partitionsConsumedConcurrently).toBe(4);
		});

		it('turns the library automatic offset resolution off, as v1 does', async () => {
			const { consumer } = await start();

			expect(consumer.runConfig?.eachBatchAutoResolve).toBe(false);
		});

		it.each([
			['connect', (consumer: FakeConsumer) => consumer.connect],
			['subscribe', (consumer: FakeConsumer) => consumer.subscribe],
			['run', (consumer: FakeConsumer) => consumer.run],
		])('disconnects when %s fails, leaving no open connection behind', async (_, pick) => {
			const consumer = await newConsumer();
			pick(consumer).mockRejectedValueOnce(new Error('start failed'));

			await expect(
				consumeTopic(consumer as never, { topic: 'orders', parseMessage, emit, logger }),
			).rejects.toThrow('start failed');
			expect(consumer.disconnect).toHaveBeenCalledTimes(1);
		});
	});

	describe('chunking', () => {
		it('emits one execution per message by default', async () => {
			const { consumer } = await start();

			await consumer.deliverBatch({ topic: 'orders', messages: messages('a', 'b', 'c') });

			expect(emit).toHaveBeenCalledTimes(3);
			expect(emit).toHaveBeenNthCalledWith(1, [{ json: { message: 'a', topic: 'orders' } }]);
			expect(emit).toHaveBeenNthCalledWith(3, [{ json: { message: 'c', topic: 'orders' } }]);
		});

		it('groups messages into executions of the chosen batch size', async () => {
			const { consumer } = await start({ batchSize: 2 });

			await consumer.deliverBatch({ topic: 'orders', messages: messages('a', 'b', 'c') });

			expect(emit).toHaveBeenCalledTimes(2);
			expect(emit).toHaveBeenNthCalledWith(1, [
				{ json: { message: 'a', topic: 'orders' } },
				{ json: { message: 'b', topic: 'orders' } },
			]);
			// The trailing chunk is short rather than padded.
			expect(emit).toHaveBeenNthCalledWith(2, [{ json: { message: 'c', topic: 'orders' } }]);
		});

		it('parses every message with the batch topic', async () => {
			const { consumer } = await start();

			await consumer.deliverBatch({ topic: 'orders', messages: messages('a', 'b') });

			expect(parseMessage).toHaveBeenCalledTimes(2);
			expect(parseMessage).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ value: Buffer.from('a') }),
				'orders',
			);
		});
	});

	describe('offset resolution', () => {
		it('resolves the last offset of each chunk and commits', async () => {
			const { consumer } = await start();

			await consumer.deliverBatch({ messages: messages('a', 'b') });

			expect(consumer.payloadSpies.resolveOffset.mock.calls).toStrictEqual([['0'], ['1']]);
			expect(consumer.payloadSpies.commitOffsetsIfNecessary).toHaveBeenCalledTimes(2);
		});

		it('resolves once per chunk, not once per message', async () => {
			const { consumer } = await start({ batchSize: 2 });

			await consumer.deliverBatch({ messages: messages('a', 'b', 'c', 'd') });

			expect(consumer.payloadSpies.resolveOffset.mock.calls).toStrictEqual([['1'], ['3']]);
		});

		it('keeps earlier chunks resolved when a later one fails to parse', async () => {
			const { consumer } = await start();
			parseMessage.mockImplementationOnce(async (message, topic) => ({
				json: { message: message.value?.toString(), topic },
			}));
			parseMessage.mockRejectedValueOnce(new Error('parse failed'));

			await consumer.deliverBatch({ messages: messages('a', 'poison', 'c') });

			// 'a' stays done; the poison message and everything after it are re-delivered.
			expect(consumer.payloadSpies.resolveOffset.mock.calls).toStrictEqual([['0']]);
			expect(emit).toHaveBeenCalledTimes(1);
		});

		it('stops without resolving when an execution does not permit it', async () => {
			const { consumer } = await start();
			emit.mockResolvedValueOnce({ success: true });
			emit.mockResolvedValueOnce({ success: false });

			await consumer.deliverBatch({ messages: messages('a', 'b', 'c') });

			expect(consumer.payloadSpies.resolveOffset.mock.calls).toStrictEqual([['0']]);
			// Stops at the failure rather than carrying on to 'c'.
			expect(emit).toHaveBeenCalledTimes(2);
		});
	});

	describe('interruptions', () => {
		it.each([
			['the partition was revoked', { isStale: true }],
			['the consumer stopped', { isRunning: false }],
		])('stops the batch when %s', async (_, state) => {
			const { consumer } = await start();

			await consumer.deliverBatch({ messages: messages('a', 'b'), ...state });

			expect(emit).not.toHaveBeenCalled();
			expect(consumer.payloadSpies.resolveOffset).not.toHaveBeenCalled();
		});

		it('stops the batch after close, leaving offsets unresolved', async () => {
			const { consumer, handle } = await start();

			await handle.close();
			await consumer.deliverBatch({ messages: messages('a') });

			expect(emit).not.toHaveBeenCalled();
			expect(consumer.payloadSpies.resolveOffset).not.toHaveBeenCalled();
		});

		it('does not hold teardown behind the retry delay', async () => {
			const { consumer, handle } = await start({ errorRetryDelay: 60_000 });
			parseMessage.mockRejectedValueOnce(new Error('parse failed'));

			const delivery = consumer.deliverBatch({ messages: messages('a') });
			// Real timers: if close did not cut the wait short this would take a minute.
			await handle.close();

			await expect(delivery).resolves.toBeUndefined();
			expect(consumer.payloadSpies.resolveOffset).not.toHaveBeenCalled();
		});

		it('lets an emit rejection propagate, leaving the chunk unresolved', async () => {
			const { consumer } = await start();
			emit.mockRejectedValueOnce(new Error('emit exploded'));

			await expect(consumer.deliverBatch({ messages: messages('a') })).rejects.toThrow(
				'emit exploded',
			);
			expect(consumer.payloadSpies.resolveOffset).not.toHaveBeenCalled();
		});

		it.each([0, -3])(
			'treats a batch size of %s as one, rather than looping forever',
			async (batchSize) => {
				const { consumer } = await start({ batchSize });

				await consumer.deliverBatch({ messages: messages('a', 'b') });

				expect(emit).toHaveBeenCalledTimes(2);
			},
		);

		it('waits the retry delay before a failed chunk is re-delivered', async () => {
			vi.useFakeTimers();
			try {
				const { consumer } = await start({ errorRetryDelay: 5000 });
				parseMessage.mockRejectedValueOnce(new Error('parse failed'));

				let settled = false;
				const delivery = consumer
					.deliverBatch({ messages: messages('a') })
					.then(() => (settled = true));

				await vi.advanceTimersByTimeAsync(4999);
				expect(settled).toBe(false);

				await vi.advanceTimersByTimeAsync(1);
				await delivery;
				expect(settled).toBe(true);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('close', () => {
		it('disconnects the consumer', async () => {
			const { consumer, handle } = await start();

			await handle.close();

			expect(consumer.disconnect).toHaveBeenCalledTimes(1);
		});

		it('gives up on a disconnect that never settles, so teardown cannot hang', async () => {
			vi.useFakeTimers();
			try {
				const { consumer, handle } = await start();
				consumer.disconnect.mockReturnValueOnce(new Promise(() => {}));

				const closing = expect(handle.close()).rejects.toThrow(
					'Kafka consumer did not disconnect in time',
				);
				await vi.advanceTimersByTimeAsync(30_000);
				await closing;
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
