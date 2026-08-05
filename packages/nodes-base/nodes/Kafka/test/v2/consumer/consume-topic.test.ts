import type { INodeExecutionData } from 'n8n-workflow';

import type { KafkaCredentials } from '../../../utils';
import { consumeTopic, type KafkaBatchHandOff } from '../../../v2/consumer/consume-topic';
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

beforeEach(() => {
	resetConfluentKafkaRecordings();
	parseMessage.mockClear();
});

const newConsumer = async (groupId = 'n8n-kafka'): Promise<FakeConsumer> => {
	await createKafkaConsumer(credentials, { groupId });
	const consumer = getFakeConsumers().at(-1);
	if (!consumer) throw new Error('the fake recorded no consumer');
	return consumer;
};

describe('consumeTopic', () => {
	const start = async (
		onBatch: (handOff: KafkaBatchHandOff) => void,
		options: { partitionsConsumedConcurrently?: number; errorRetryDelay?: number } = {},
	) => {
		const consumer = await newConsumer();
		const handle = await consumeTopic(consumer as never, {
			topic: 'orders',
			parseMessage,
			onBatch,
			// Zero unless a test is specifically about the delay, so failure tests
			// assert propagation without waiting out the real retry pacing.
			errorRetryDelay: 0,
			...options,
		});
		return { consumer, handle };
	};

	it('connects, subscribes to the topic, and starts the loop', async () => {
		const { consumer } = await start(({ done }) => done());

		expect(consumer.connect).toHaveBeenCalledTimes(1);
		expect(consumer.subscribe).toHaveBeenCalledWith({ topics: ['orders'] });
		expect(consumer.run).toHaveBeenCalledTimes(1);
	});

	it('reads one partition at a time unless told otherwise', async () => {
		const { consumer } = await start(({ done }) => done());

		expect(consumer.runConfig?.partitionsConsumedConcurrently).toBe(1);
	});

	it('passes through a caller-chosen partition concurrency', async () => {
		const { consumer } = await start(({ done }) => done(), { partitionsConsumedConcurrently: 4 });

		expect(consumer.runConfig?.partitionsConsumedConcurrently).toBe(4);
	});

	it('leaves the automatic progress-saving at the library default', async () => {
		const { consumer } = await start(({ done }) => done());

		expect(consumer.runConfig).not.toHaveProperty('eachBatchAutoResolve');
	});

	it('hands over the parsed batch with its topic and partition', async () => {
		const handOffs: KafkaBatchHandOff[] = [];
		const { consumer } = await start((handOff) => {
			handOffs.push(handOff);
			handOff.done();
		});

		await consumer.deliverBatch({
			topic: 'orders',
			partition: 2,
			messages: [{ value: Buffer.from('first') }, { value: Buffer.from('second') }],
		});

		expect(handOffs).toHaveLength(1);
		expect(handOffs[0].topic).toBe('orders');
		expect(handOffs[0].partition).toBe(2);
		expect(handOffs[0].items).toStrictEqual([
			{ json: { message: 'first', topic: 'orders' } },
			{ json: { message: 'second', topic: 'orders' } },
		]);
	});

	it('parses every message in the batch with the batch topic', async () => {
		const { consumer } = await start(({ done }) => done());

		await consumer.deliverBatch({
			topic: 'orders',
			messages: [{ value: Buffer.from('a') }, { value: Buffer.from('b') }],
		});

		expect(parseMessage).toHaveBeenCalledTimes(2);
		expect(parseMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ value: Buffer.from('a') }),
			'orders',
		);
	});

	it('stays inside eachBatch until the completion callback fires', async () => {
		let release!: () => void;
		let handedOff!: () => void;
		const handOff = new Promise<void>((resolve) => (handedOff = resolve));

		const { consumer } = await start(({ done }) => {
			release = done;
			handedOff();
		});

		let settled = false;
		const delivery = consumer
			.deliverBatch({ messages: [{ value: Buffer.from('a') }] })
			.then(() => (settled = true));

		await handOff;
		expect(settled).toBe(false);

		release();
		await delivery;
		expect(settled).toBe(true);
	});

	it.each([
		['subscribe', (consumer: FakeConsumer) => consumer.subscribe],
		['run', (consumer: FakeConsumer) => consumer.run],
	])('disconnects when %s fails, leaving no open connection behind', async (_, pick) => {
		const consumer = await newConsumer();
		pick(consumer).mockRejectedValueOnce(new Error('start failed'));

		await expect(
			consumeTopic(consumer as never, {
				topic: 'orders',
				parseMessage,
				onBatch: ({ done }) => done(),
			}),
		).rejects.toThrow('start failed');
		expect(consumer.disconnect).toHaveBeenCalledTimes(1);
	});

	it('lets a parse failure propagate, so the batch is retried rather than skipped', async () => {
		// eachBatchAutoResolve is on: returning normally would mark the batch read.
		const { consumer } = await start(({ done }) => done());
		parseMessage.mockRejectedValueOnce(new Error('parse failed'));

		await expect(
			consumer.deliverBatch({ messages: [{ value: Buffer.from('a') }] }),
		).rejects.toThrow('parse failed');
	});

	it('waits the retry delay before letting a failed batch be re-delivered', async () => {
		vi.useFakeTimers();
		try {
			const { consumer } = await start(({ done }) => done(), { errorRetryDelay: 5000 });
			parseMessage.mockRejectedValueOnce(new Error('parse failed'));

			const delivery = consumer.deliverBatch({ messages: [{ value: Buffer.from('a') }] });
			const assertion = expect(delivery).rejects.toThrow('parse failed');

			await vi.advanceTimersByTimeAsync(4999);
			expect(parseMessage).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1);
			await assertion;
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not wait the retry delay when the failure is close itself', async () => {
		// Teardown must not be held up by retry pacing.
		const { consumer, handle } = await start(() => {
			// Never finishes, so close is what ends the batch.
		});

		const delivery = consumer.deliverBatch({ messages: [{ value: Buffer.from('a') }] });
		await handle.close();

		await expect(delivery).rejects.toThrow('closed before the batch was handed off');
	});

	it('lets a handler that throws synchronously propagate', async () => {
		const { consumer } = await start(() => {
			throw new Error('handler exploded');
		});

		await expect(
			consumer.deliverBatch({ messages: [{ value: Buffer.from('a') }] }),
		).rejects.toThrow('handler exploded');
	});

	it('disconnects the consumer on close', async () => {
		const { consumer, handle } = await start(({ done }) => done());

		await handle.close();

		expect(consumer.disconnect).toHaveBeenCalledTimes(1);
	});

	it('gives up on a disconnect that never settles, so teardown cannot hang', async () => {
		vi.useFakeTimers();
		try {
			const { consumer, handle } = await start(({ done }) => done());
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

	it('releases a batch still waiting on its completion callback when closing', async () => {
		const { consumer, handle } = await start(() => {
			// Never calls done(), as a workflow that has not finished yet.
		});

		const delivery = consumer.deliverBatch({ messages: [{ value: Buffer.from('a') }] });
		await handle.close();

		// Rejects rather than resolves: eachBatchAutoResolve is on, so returning
		// normally would mark messages read that no execution ever finished.
		await expect(delivery).rejects.toThrow('closed before the batch was handed off');
	});

	it('refuses a batch that arrives after close, leaving its offsets unread', async () => {
		const onBatch = vi.fn(({ done }: KafkaBatchHandOff) => done());
		const { consumer, handle } = await start(onBatch);

		await handle.close();

		await expect(
			consumer.deliverBatch({ messages: [{ value: Buffer.from('a') }] }),
		).rejects.toThrow('closed before the batch was handed off');
		expect(onBatch).not.toHaveBeenCalled();
	});
});
