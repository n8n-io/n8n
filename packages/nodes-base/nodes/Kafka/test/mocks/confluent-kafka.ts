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

/** The admin client `assertTopicExists` and the credential test use. */
export interface FakeAdmin {
	connect: Mock;
	fetchTopicMetadata: Mock;
	/** The metadata request the credential test relies on to prove the broker is reachable. */
	listTopics: Mock;
	disconnect: Mock;
}

/** librdkafka's code for a topic the broker does not know, as the real library exposes it. */
export const UNKNOWN_TOPIC_OR_PART = 3;

/** librdkafka's code for a topic name the broker rejects outright (also used for patterns). */
export const TOPIC_EXCEPTION = 17;

const consumers: FakeConsumer[] = [];
const admins: FakeAdmin[] = [];
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

/**
 * How the next call(s) to `fetchTopicMetadata` answer, one entry consumed per
 * call across every fake admin. A test that needs a missing topic (or an
 * inconclusive check) queues outcomes before acting; once the queue is empty,
 * calls resolve with a healthy topic.
 */
const metadataOutcomeQueue: Array<() => Promise<unknown>> = [];

/** How the next fake admin answers `disconnect()`. */
let nextDisconnectError: Error | undefined;

/**
 * Makes the next `fetchTopicMetadata` call reject with `error`. Queue it more
 * than once to fail several calls in a row, e.g. across a retry.
 */
export function failNextTopicMetadata(error: Error): void {
	metadataOutcomeQueue.push(async () => {
		throw error;
	});
}

/** Makes the next admin's `disconnect()` reject with `error`. */
export function failNextAdminDisconnect(error: Error): void {
	nextDisconnectError = error;
}

/** An error shaped like the library's rejection for a topic the broker does not know. */
export function unknownTopicError(): Error & { code: number } {
	return Object.assign(new Error('Broker: Unknown topic or partition'), {
		name: 'KafkaJSProtocolError',
		code: UNKNOWN_TOPIC_OR_PART,
	});
}

/** An error shaped like the library's rejection for a topic name the broker rejects outright. */
export function invalidTopicNameError(): Error & { code: number } {
	return Object.assign(new Error('Broker: Invalid topic'), {
		name: 'KafkaJSProtocolError',
		code: TOPIC_EXCEPTION,
	});
}

function createFakeAdmin(): FakeAdmin {
	const disconnectError = nextDisconnectError;
	nextDisconnectError = undefined;

	const admin: FakeAdmin = {
		connect: vi.fn(async () => {}),
		fetchTopicMetadata: vi.fn(async () => {
			const outcome = metadataOutcomeQueue.shift();
			return outcome ? await outcome() : [{ name: 'test-topic', partitions: [{ partitionId: 0 }] }];
		}),
		listTopics: vi.fn(async () => [] as string[]),
		disconnect: vi.fn(async () => {
			if (disconnectError) throw disconnectError;
		}),
	};

	admins.push(admin);
	return admin;
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
		admin: vi.fn(createFakeAdmin),
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
				ErrorCodes: {
					ERR_UNKNOWN_TOPIC_OR_PART: UNKNOWN_TOPIC_OR_PART,
					ERR_TOPIC_EXCEPTION: TOPIC_EXCEPTION,
				},
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

/** Admin clients created through the fake, in creation order. */
export function getFakeAdmins(): FakeAdmin[] {
	return admins;
}

/** Configs passed to the fake `Kafka` constructor, in creation order. */
export function getFakeClientConfigs(): KafkaJS.CommonConstructorConfig[] {
	return clientConfigs;
}

/** Clears the recorded consumers, admins and client configs (not the access count). */
export function resetConfluentKafkaRecordings(): void {
	consumers.length = 0;
	admins.length = 0;
	clientConfigs.length = 0;
	nextAssignment = joinedAssignment;
	metadataOutcomeQueue.length = 0;
	nextDisconnectError = undefined;
}
