import type { KafkaJS } from '@confluentinc/kafka-javascript';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

let accessCount = 0;

type EachBatchHandler = NonNullable<KafkaJS.ConsumerRunConfig['eachBatch']>;

/** A batch as a test supplies it: just the messages, plus optional coordinates. */
export interface FakeBatch {
	messages: Array<Partial<KafkaJS.KafkaMessage>>;
	topic?: string;
	partition?: number;
	/** The partition was revoked mid-batch. Defaults to false. */
	isStale?: boolean;
	/** The consumer is still running. Defaults to true. */
	isRunning?: boolean;
}

export interface FakeConsumer {
	/** The `ConsumerConstructorConfig` the code under test passed to `kafka.consumer()`. */
	config: KafkaJS.ConsumerConstructorConfig;
	/** The `ConsumerRunConfig` passed to `run()`, once it has been called. */
	runConfig?: KafkaJS.ConsumerRunConfig;
	connect: Mock;
	subscribe: Mock;
	run: Mock;
	// No `stop`: the real consumer's `stop()` calls notImplemented() and throws, so
	// a fake that resolves would let code depend on something that cannot work.
	disconnect: Mock;
	/** Joined by default, so the startup join wait exits on its first check.
	 * Override via {@link setFakeConsumerAssignment}. */
	assignment: Mock;
	/** Feeds a batch through the handler `run()` registered. */
	deliverBatch: (batch: FakeBatch) => Promise<void>;
	/** Spies on the `EachBatchPayload` callbacks handed to that handler. */
	payloadSpies: {
		resolveOffset: Mock;
		heartbeat: Mock;
		commitOffsetsIfNecessary: Mock;
		pause: Mock;
	};
}

const consumers: FakeConsumer[] = [];
const clientConfigs: KafkaJS.CommonConstructorConfig[] = [];

/** Joined by default, so the startup join wait costs the suites nothing. */
const joinedAssignment = () => [{ topic: 'test-topic', partition: 0 }];
let nextAssignment: () => Array<{ topic: string; partition: number }> = joinedAssignment;

/**
 * Makes every fake consumer report this assignment, e.g. `() => []` for one
 * that never joins its group. Reset by {@link resetConfluentKafkaRecordings}.
 */
export function setFakeConsumerAssignment(
	assignment: () => Array<{ topic: string; partition: number }>,
): void {
	nextAssignment = assignment;
}

function createFakeConsumer(config: KafkaJS.ConsumerConstructorConfig): FakeConsumer {
	let eachBatch: EachBatchHandler | undefined;

	const payloadSpies = {
		resolveOffset: vi.fn(),
		heartbeat: vi.fn(async () => {}),
		commitOffsetsIfNecessary: vi.fn(async () => {}),
		pause: vi.fn(() => () => {}),
	};

	const consumer: FakeConsumer = {
		config,
		connect: vi.fn(async () => {}),
		subscribe: vi.fn(async () => {}),
		run: vi.fn(async (runConfig?: KafkaJS.ConsumerRunConfig) => {
			consumer.runConfig = runConfig;
			eachBatch = runConfig?.eachBatch;
		}),
		disconnect: vi.fn(async () => {}),
		assignment: vi.fn(() => nextAssignment()),
		payloadSpies,
		deliverBatch: async ({
			messages,
			topic = 'test-topic',
			partition = 0,
			isStale = false,
			isRunning = true,
		}) => {
			if (!eachBatch) throw new Error('deliverBatch called before run() registered a handler');

			const batchMessages = messages.map((message, index) => ({
				key: null,
				value: null,
				timestamp: '0',
				attributes: 0,
				offset: String(index),
				...message,
			})) as KafkaJS.KafkaMessage[];

			await eachBatch({
				batch: {
					topic,
					partition,
					highWatermark: String(batchMessages.length),
					messages: batchMessages,
					isEmpty: () => batchMessages.length === 0,
					firstOffset: () => batchMessages[0]?.offset ?? null,
					lastOffset: () => batchMessages[batchMessages.length - 1]?.offset ?? '0',
					offsetLag: () => '0',
					offsetLagLow: () => '0',
				},
				isRunning: () => isRunning,
				isStale: () => isStale,
				...payloadSpies,
			});
		},
	};

	consumers.push(consumer);
	return consumer;
}

// A function expression, not an arrow: the code under test calls `new Kafka(...)`,
// and an arrow implementation is not constructible.
function fakeKafkaClient(config?: KafkaJS.CommonConstructorConfig) {
	if (config) clientConfigs.push(config);
	return {
		config,
		connect: vi.fn(),
		disconnect: vi.fn(),
		producer: vi.fn(() => ({
			connect: vi.fn(),
			sendBatch: vi.fn(),
			disconnect: vi.fn(),
		})),
		consumer: vi.fn(createFakeConsumer),
		admin: vi.fn(),
	};
}

/** vi.mock factory for '@confluentinc/kafka-javascript'. */
export function confluentKafkaModuleMock(): { readonly KafkaJS: unknown } {
	return {
		get KafkaJS() {
			accessCount += 1;
			return {
				Kafka: vi.fn(fakeKafkaClient),
				logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 },
			};
		},
	};
}

export function getConfluentKafkaAccessCount(): number {
	return accessCount;
}

export function resetConfluentKafkaAccessCount(): void {
	accessCount = 0;
}

/** Consumers created through the fake, in creation order. */
export function getFakeConsumers(): FakeConsumer[] {
	return consumers;
}

/** Configs passed to the fake `Kafka` constructor, in creation order. */
export function getFakeClientConfigs(): KafkaJS.CommonConstructorConfig[] {
	return clientConfigs;
}

/** Clears the recorded consumers and client configs (not the access count). */
export function resetConfluentKafkaRecordings(): void {
	consumers.length = 0;
	clientConfigs.length = 0;
	nextAssignment = joinedAssignment;
}
