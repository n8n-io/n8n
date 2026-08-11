import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { INodeTypeBaseDescription, IRun, Logger } from 'n8n-workflow';
import { TriggerCloseError, UserError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { DEFAULT_EXECUTION_TIMEOUT_SECONDS } from '../../v2/consumer';
import { KafkaTriggerV2 } from '../../v2/KafkaTriggerV2.node';
import {
	explainManualRunGroupDenial,
	manualRunGroupId,
	toConsumerOptions,
	toEmitterOptions,
} from '../../v2/TriggerSettings';
import {
	confluentKafkaModuleMock,
	getFakeConsumers,
	resetConfluentKafkaRecordings,
	type FakeConsumer,
} from '../mocks/confluent-kafka';

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());
vi.mock('@kafkajs/confluent-schema-registry');

// Wraps the real consumeTopic in a spy rather than replacing it, so the actual
// loop still drives these tests. Only used for options that reach the loop but
// leave no trace on the fake consumer, such as errorRetryDelay.
const { consumeTopicSpy } = vi.hoisted(() => ({ consumeTopicSpy: vi.fn() }));
vi.mock('../../v2/consumer', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../v2/consumer')>();
	return {
		...actual,
		consumeTopic: vi.fn(async (...args: Parameters<typeof actual.consumeTopic>) => {
			consumeTopicSpy(...args);
			return await actual.consumeTopic(...args);
		}),
	};
});

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Kafka Trigger',
	name: 'kafkaTrigger',
	icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
	group: ['trigger'],
	defaultVersion: 1.3,
	description: 'Consume messages from a Kafka topic',
};

const credential = {
	brokers: 'localhost:9092',
	clientId: 'n8n-kafka',
	ssl: false,
	authentication: false,
};

async function lastFakeConsumer(): Promise<FakeConsumer> {
	const consumer = getFakeConsumers().at(-1);
	if (!consumer) throw new Error('the fake recorded no consumer');
	return consumer;
}

/**
 * Starts the trigger. Defaults to `immediately`, so the emitter does not wait on
 * an execution: tests about parsing and consumer settings can then deliver a
 * batch without also having to resolve a run.
 */
async function startTrigger(
	groupId: string,
	parameters: Record<string, unknown> = {},
	overrides: Parameters<typeof testTriggerNode>[1] = {},
) {
	return await testTriggerNode(new KafkaTriggerV2(baseDescription), {
		mode: 'trigger',
		node: {
			parameters: {
				topic: 'test-topic',
				groupId,
				useSchemaRegistry: false,
				resolveOffset: 'immediately',
				...parameters,
			},
		},
		credential,
		...overrides,
	});
}

describe('toConsumerOptions', () => {
	it("applies v1's consumer defaults when the user set nothing", () => {
		const result = toConsumerOptions({}, 'my-group', undefined);

		expect(result).toStrictEqual({
			groupId: 'my-group',
			sessionTimeout: 30000,
			// v1.3's default, not the 3000 v1 uses below 1.3
			heartbeatInterval: 10000,
			// No workflow timeout and no option, so the emitter's own default wait
			// stands in, halved because the library doubles it
			rebalanceTimeout: 1_800_000,
			maxBytesPerPartition: undefined,
			minBytes: undefined,
			maxInFlightRequests: undefined,
			fromBeginning: undefined,
			autoCommitInterval: undefined,
		});
	});

	it('passes the user-set consumer options through', () => {
		const result = toConsumerOptions(
			{
				sessionTimeout: 20000,
				heartbeatInterval: 2000,
				fetchMaxBytes: 2097152,
				fetchMinBytes: 1024,
				maxInFlightRequests: 5,
				fromBeginning: true,
			},
			'my-group',
			undefined,
		);

		expect(result).toMatchObject({
			sessionTimeout: 20000,
			heartbeatInterval: 2000,
			maxBytesPerPartition: 2097152,
			minBytes: 1024,
			maxInFlightRequests: 5,
			fromBeginning: true,
		});
	});

	it('halves the workflow execution timeout, since the library doubles it', () => {
		// 600s of workflow timeout must stay 600s of processing headroom, and the
		// library sets max.poll.interval.ms to twice whatever it is handed.
		const result = toConsumerOptions({}, 'my-group', 600);

		expect(result.rebalanceTimeout).toBe(300000);
	});

	it('falls back to the Rebalance Timeout option when the workflow timeout is unbounded', () => {
		// n8n treats <= 0 as explicitly unbounded, and there is no deadline to derive
		// from, so the node's own option decides.
		const result = toConsumerOptions({ rebalanceTimeout: 900000 }, 'my-group', -1);

		expect(result.rebalanceTimeout).toBe(450000);
	});

	describe('the processing deadline stays inside what the library accepts', () => {
		// librdkafka takes 1..86400000 for max.poll.interval.ms and the library
		// doubles what it is given, so anything past 12 hours here overflows the
		// 32-bit int it is stored in. Measured against a real broker with a 30 day
		// workflow timeout: "value -1702967296 is outside allowed range 1..86400000",
		// and the consumer refuses to connect.
		const LIBRDKAFKA_MAX_MS = 86_400_000;

		it.each([
			['30 days', 30 * 24 * 3600],
			['a year', 365 * 24 * 3600],
		])('caps a %s workflow timeout rather than overflowing', (_label, seconds) => {
			const logger = mock<Logger>();

			const { rebalanceTimeout } = toConsumerOptions({}, 'my-group', seconds, logger);

			expect(rebalanceTimeout).toBe(43_200_000);
			// What the library will actually hand librdkafka, after doubling. The
			// `| 0` is the 32-bit truncation that turned the old value negative.
			const doubled = (rebalanceTimeout ?? 0) * 2;
			expect(doubled).toBeLessThanOrEqual(LIBRDKAFKA_MAX_MS);
			expect(doubled | 0).toBeGreaterThan(0);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('capped'),
				expect.objectContaining({ appliedMs: LIBRDKAFKA_MAX_MS }),
			);
		});

		it('caps an oversized Rebalance Timeout option too', () => {
			const { rebalanceTimeout } = toConsumerOptions(
				{ rebalanceTimeout: 30 * 24 * 3600 * 1000 },
				'my-group',
				undefined,
			);

			expect((rebalanceTimeout ?? 0) * 2).toBeLessThanOrEqual(LIBRDKAFKA_MAX_MS);
		});

		it('leaves a deadline inside the range alone, and says nothing', () => {
			const logger = mock<Logger>();

			const { rebalanceTimeout } = toConsumerOptions({}, 'my-group', 600, logger);

			expect(rebalanceTimeout).toBe(300_000);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it.each([NaN, Infinity])(
			'falls back to the emitter default when Rebalance Timeout is %s',
			(rebalanceTimeout) => {
				// It can come from an expression, so it is not trusted to be usable.
				const result = toConsumerOptions({ rebalanceTimeout }, 'my-group', undefined);

				expect(result.rebalanceTimeout).toBe(1_800_000);
			},
		);

		it('gives the broker the same deadline the emitter is prepared to wait', () => {
			// These used to disagree: the broker got the Rebalance Timeout default of 10
			// minutes while the emitter waited an hour, so an execution in between was
			// fenced and its message redelivered while n8n believed the run owned it.
			const { rebalanceTimeout } = toConsumerOptions({}, 'my-group', undefined);

			// Doubled, because that is what the library hands librdkafka.
			expect((rebalanceTimeout ?? 0) * 2).toBe(DEFAULT_EXECUTION_TIMEOUT_SECONDS * 1000);
		});

		describe('and stays above the Session Timeout, which the library also requires', () => {
			// librdkafka refuses max.poll.interval.ms < session.timeout.ms on the classic
			// group protocol (rdkafka_conf.c:4257). Both values are individually legal, so
			// only the pair is wrong, and the consumer refuses to connect.
			it.each([
				['a 20s workflow timeout against the 30s session default', 20, undefined, 30_000],
				['a 5s workflow timeout', 5, undefined, 30_000],
			])('raises %s to the session timeout', (_label, seconds, session, expectedFloor) => {
				const logger = mock<Logger>();

				const { rebalanceTimeout } = toConsumerOptions(
					session === undefined ? {} : { sessionTimeout: session },
					'g',
					seconds,
					logger,
				);

				expect((rebalanceTimeout ?? 0) * 2).toBeGreaterThanOrEqual(expectedFloor);
				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('raised to the Session Timeout'),
					expect.objectContaining({ appliedMs: expectedFloor }),
				);
			});

			it('raises a too-small Rebalance Timeout option the same way', () => {
				const { rebalanceTimeout } = toConsumerOptions({ rebalanceTimeout: 2_000 }, 'g', undefined);

				expect((rebalanceTimeout ?? 0) * 2).toBeGreaterThanOrEqual(30_000);
			});

			it('respects a lowered Session Timeout instead of forcing the 30s default', () => {
				const logger = mock<Logger>();

				const { rebalanceTimeout, sessionTimeout } = toConsumerOptions(
					{ sessionTimeout: 8_000 },
					'g',
					5,
					logger,
				);

				// 5s of workflow timeout is below an 8s session, so 8s is the floor.
				expect((rebalanceTimeout ?? 0) * 2).toBeGreaterThanOrEqual(sessionTimeout ?? 0);
				expect((rebalanceTimeout ?? 0) * 2).toBe(8_000);
			});

			it('says nothing when the deadline already clears the session timeout', () => {
				const logger = mock<Logger>();

				toConsumerOptions({}, 'g', 600, logger);

				expect(logger.warn).not.toHaveBeenCalled();
			});
		});

		it('lets an explicitly set Rebalance Timeout win when there is no workflow timeout', () => {
			const { rebalanceTimeout } = toConsumerOptions(
				{ rebalanceTimeout: 120_000 },
				'my-group',
				undefined,
			);

			expect(rebalanceTimeout).toBe(60_000);
		});

		it('falls back to the option when the workflow timeout is not a usable number', () => {
			const result = toConsumerOptions({ rebalanceTimeout: 120_000 }, 'my-group', NaN);

			expect(result.rebalanceTimeout).toBe(60_000);
		});
	});

	describe('Auto Commit Interval', () => {
		// v1 honours this too, via getAutoCommitSettings. What differs is the range
		// check: librdkafka takes 0..86400000 and refuses the whole connection on
		// anything else, naming a number the user never typed, so an unusable value
		// is dropped with a warning here instead.
		it('passes a user-set interval through, overriding the pinned default', () => {
			expect(
				toConsumerOptions({ autoCommitInterval: 1_000 }, 'g', undefined).autoCommitInterval,
			).toBe(1_000);
		});

		it('keeps a zero, which turns interval commits off rather than meaning unset', () => {
			// The loop still commits per chunk, so 0 is a real choice and must not be
			// swallowed the way a falsy maxInFlightRequests is.
			expect(toConsumerOptions({ autoCommitInterval: 0 }, 'g', undefined).autoCommitInterval).toBe(
				0,
			);
		});

		it('leaves the key off when the user set nothing, so the pinned default stands', () => {
			expect(toConsumerOptions({}, 'g', undefined).autoCommitInterval).toBeUndefined();
		});

		it.each([NaN, -1, 86_400_001, Infinity])(
			'drops %s, which the library would reject',
			(value) => {
				const logger = mock<Logger>();

				const result = toConsumerOptions({ autoCommitInterval: value }, 'g', undefined, logger);

				expect(result.autoCommitInterval).toBeUndefined();
				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Auto Commit Interval'),
					expect.objectContaining({ supplied: value }),
				);
			},
		);
	});

	describe('Heartbeat Interval stays under a third of the Session Timeout', () => {
		// The two options are independent in the UI but not in Kafka, and pairing them
		// badly fails silently: the broker fences the consumer, the offset is never
		// committed, and the same message is redelivered forever. Measured against a
		// real broker with a 10s session and the 10s heartbeat default, a 5s workflow
		// re-ran one message every ~10s indefinitely.
		it('leaves the defaults alone, which already sit at the recommended ratio', () => {
			const result = toConsumerOptions({}, 'g', undefined);

			expect(result).toMatchObject({ sessionTimeout: 30_000, heartbeatInterval: 10_000 });
		});

		it('lowers the default heartbeat when the user shortens only the session timeout', () => {
			const logger = mock<Logger>();

			const result = toConsumerOptions({ sessionTimeout: 10_000 }, 'g', undefined, logger);

			expect(result.heartbeatInterval).toBe(3_333);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Heartbeat Interval'),
				expect.objectContaining({ supplied: 10_000, applied: 3_333, sessionTimeout: 10_000 }),
			);
		});

		it.each([
			[30_000, 10_000, 10_000],
			[30_000, 3_000, 3_000],
			[9_000, 3_000, 3_000],
		])('leaves %ims / %ims as set, since it is within the ratio', (session, beat, expected) => {
			const logger = mock<Logger>();

			const result = toConsumerOptions(
				{ sessionTimeout: session, heartbeatInterval: beat },
				'g',
				undefined,
				logger,
			);

			expect(result.heartbeatInterval).toBe(expected);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it.each([
			[10_000, 20_000, 3_333],
			[10_000, 10_000, 3_333],
			[6_000, 6_000, 2_000],
		])('clamps %ims / %ims down to %ims', (session, beat, expected) => {
			const result = toConsumerOptions(
				{ sessionTimeout: session, heartbeatInterval: beat },
				'g',
				undefined,
			);

			expect(result.heartbeatInterval).toBe(expected);
		});

		it.each([NaN, Infinity])('clamps a %s heartbeat rather than forwarding it', (beat) => {
			const result = toConsumerOptions({ heartbeatInterval: beat }, 'g', undefined);

			expect(result.heartbeatInterval).toBe(10_000);
		});

		it.each([0, -1, NaN])(
			'leaves the heartbeat alone when the session timeout is %s, so librdkafka names the bad value',
			(session) => {
				const logger = mock<Logger>();

				const result = toConsumerOptions(
					{ sessionTimeout: session, heartbeatInterval: 10_000 },
					'g',
					undefined,
					logger,
				);

				expect(result).toMatchObject({ sessionTimeout: session, heartbeatInterval: 10_000 });
				expect(logger.warn).not.toHaveBeenCalled();
			},
		);
	});

	it('drops a zero Max Number of Requests instead of forwarding it', () => {
		// v1 turns 0 into null to mean "no limit". The library has no such sentinel,
		// and a present-but-undefined key makes librdkafka fail.
		const result = toConsumerOptions({ maxInFlightRequests: 0 }, 'my-group', undefined);

		expect(result.maxInFlightRequests).toBeUndefined();
	});
});

describe('manualRunGroupId', () => {
	it('uses the configured group for an activated workflow', () => {
		expect(manualRunGroupId('orders-consumer', false)).toBe('orders-consumer');
	});

	it('gives a manual run its own group, so it cannot take production offsets', () => {
		const first = manualRunGroupId('orders-consumer', true);
		const second = manualRunGroupId('orders-consumer', true);

		expect(first).toMatch(/^orders-consumer-n8n-manual-.+/);
		expect(first).not.toBe('orders-consumer');
		// Two editors testing at once must not land in the same group either.
		expect(second).not.toBe(first);
	});
});

describe('explainManualRunGroupDenial', () => {
	// A cluster with an authorizer usually grants group ACLs LITERAL on the exact
	// Group ID, so the throwaway group is a resource nobody authorized. Only test
	// runs break, and the broker's message names neither the group nor the fix.
	const denial = new Error('Broker: Group authorization failed');

	it('names the prefix to grant, so the fix does not need guessing', () => {
		const result = explainManualRunGroupDenial(denial, 'orders-consumer', true);

		expect(result).not.toBe(denial);
		expect(result).toBeInstanceOf(UserError);
		expect((result as UserError).description).toContain('orders-consumer-n8n-manual-');
		// The original stays reachable rather than being replaced outright.
		expect((result as UserError).cause).toBe(denial);
	});

	it('leaves an activated workflow alone, since its group is what the user typed', () => {
		expect(explainManualRunGroupDenial(denial, 'orders-consumer', false)).toBe(denial);
	});

	it.each([
		'Broker: Topic authorization failed',
		'Broker: Not authorized to access cluster',
		'SASL authentication failed',
		'Broker: Unknown topic or partition',
	])('leaves %s alone, since the group is not what was refused', (message) => {
		const other = new Error(message);

		expect(explainManualRunGroupDenial(other, 'orders-consumer', true)).toBe(other);
	});
});

describe('toEmitterOptions', () => {
	it('passes the execution timeout through raw, so unbounded stays unbounded', () => {
		expect(toEmitterOptions({}, 'onCompletion', [], 0).executionTimeoutSeconds).toBe(0);
		expect(
			toEmitterOptions({}, 'onCompletion', [], undefined).executionTimeoutSeconds,
		).toBeUndefined();
		expect(toEmitterOptions({}, 'onCompletion', [], 120).executionTimeoutSeconds).toBe(120);
	});

	it('carries the mode, allowed statuses and retry delay', () => {
		const result = toEmitterOptions({ errorRetryDelay: 1234 }, 'onStatus', ['success'], 60);

		expect(result).toStrictEqual({
			resolveOffsetMode: 'onStatus',
			allowedStatuses: ['success'],
			executionTimeoutSeconds: 60,
			errorRetryDelay: 1234,
		});
	});
});

describe('KafkaTriggerV2 Node', () => {
	beforeEach(() => {
		resetConfluentKafkaRecordings();
		consumeTopicSpy.mockClear();
	});

	it('connects, subscribes to the topic, and emits a received message', async () => {
		const { emit, close } = await startTrigger('v2-basic');

		const consumer = await lastFakeConsumer();
		expect(consumer.connect).toHaveBeenCalledTimes(1);
		expect(consumer.subscribe).toHaveBeenCalledWith({ topics: ['test-topic'] });
		expect(consumer.run).toHaveBeenCalledTimes(1);

		await consumer.deliverBatch({
			topic: 'test-topic',
			messages: [{ value: Buffer.from('message') }],
		});

		expect(emit).toHaveBeenCalledWith([[{ json: { message: 'message', topic: 'test-topic' } }]]);

		await close();
		expect(consumer.disconnect).toHaveBeenCalled();
	});

	describe('Batch Size', () => {
		it('starts one execution per message by default, as v1 does', async () => {
			const { emit } = await startTrigger('v2-batch-default');
			const consumer = await lastFakeConsumer();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [
					{ value: Buffer.from('message1') },
					{ value: Buffer.from('message2') },
					{ value: Buffer.from('message3') },
				],
			});

			// A 3-message library batch must not collapse into one 3-item execution.
			expect(emit).toHaveBeenCalledTimes(3);
			expect(emit).toHaveBeenNthCalledWith(1, [
				[{ json: { message: 'message1', topic: 'test-topic' } }],
			]);
			expect(emit).toHaveBeenNthCalledWith(3, [
				[{ json: { message: 'message3', topic: 'test-topic' } }],
			]);
		});

		it('chunks into executions of Batch Size items when set above 1', async () => {
			const { emit } = await startTrigger('v2-batch-2', { options: { batchSize: 2 } });
			const consumer = await lastFakeConsumer();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [
					{ value: Buffer.from('message1') },
					{ value: Buffer.from('message2') },
					{ value: Buffer.from('message3') },
				],
			});

			expect(emit).toHaveBeenCalledTimes(2);
			expect(emit).toHaveBeenNthCalledWith(1, [
				[
					{ json: { message: 'message1', topic: 'test-topic' } },
					{ json: { message: 'message2', topic: 'test-topic' } },
				],
			]);
			expect(emit).toHaveBeenNthCalledWith(2, [
				[{ json: { message: 'message3', topic: 'test-topic' } }],
			]);
		});
	});

	describe('consumer options reach the library', () => {
		it('hands the user-set consumer options to the factory', async () => {
			await startTrigger('v2-consumer-options', {
				options: {
					sessionTimeout: 20000,
					heartbeatInterval: 2000,
					fetchMaxBytes: 2097152,
					fetchMinBytes: 1024,
					maxInFlightRequests: 5,
					fromBeginning: true,
				},
			});

			const consumer = await lastFakeConsumer();
			expect(consumer.config.kafkaJS).toMatchObject({
				groupId: 'v2-consumer-options',
				sessionTimeout: 20000,
				heartbeatInterval: 2000,
				maxBytesPerPartition: 2097152,
				minBytes: 1024,
				maxInFlightRequests: 5,
				fromBeginning: true,
			});
		});

		it('passes a caller-chosen partition concurrency to the loop', async () => {
			await startTrigger('v2-concurrency', {
				options: { partitionsConsumedConcurrently: 4 },
			});

			const consumer = await lastFakeConsumer();
			expect(consumer.runConfig?.partitionsConsumedConcurrently).toBe(4);
		});

		it('passes Retry Delay on Error to the loop', async () => {
			await startTrigger('v2-retry-delay', { options: { errorRetryDelay: 12345 } });

			expect(consumeTopicSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ errorRetryDelay: 12345 }),
			);
		});
	});

	describe('fatal consumer errors', () => {
		/** The logger the node handed the library, which is where fatal errors surface. */
		function libraryLogger(consumer: FakeConsumer) {
			const logger = consumer.config.kafkaJS?.logger;
			if (!logger) throw new Error('the node gave the library no logger');
			return logger;
		}

		it('surfaces a non-recoverable consumer error through emitError, as v1 does', async () => {
			const { emitError } = await startTrigger('v2-fatal');
			const consumer = await lastFakeConsumer();

			libraryLogger(consumer).error('Broker: Group authorization failed');

			expect(emitError).toHaveBeenCalledTimes(1);
			expect(emitError.mock.calls[0][0].message).toMatch(/authorization failed/i);
		});

		it('stays quiet for an error the library can recover from', async () => {
			const { emitError } = await startTrigger('v2-recoverable');
			const consumer = await lastFakeConsumer();

			libraryLogger(consumer).error('Broker transport failure');

			expect(emitError).not.toHaveBeenCalled();
		});

		it('stays quiet for an error caused by our own teardown', async () => {
			const { emitError, close } = await startTrigger('v2-fatal-on-close');
			const consumer = await lastFakeConsumer();

			await close();
			libraryLogger(consumer).error('Broker: Group authorization failed');

			expect(emitError).not.toHaveBeenCalled();
		});
	});

	describe('message shape options', () => {
		it('parses JSON and returns only the message when both are set', async () => {
			const jsonData = { foo: 'bar' };
			const { emit } = await startTrigger('v2-json', {
				options: { jsonParseMessage: true, onlyMessage: true },
			});
			const consumer = await lastFakeConsumer();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from(JSON.stringify(jsonData)) }],
			});

			expect(emit).toHaveBeenCalledWith([[{ json: jsonData }]]);
		});

		it('includes headers when returnHeaders is true', async () => {
			const { emit } = await startTrigger('v2-headers', { options: { returnHeaders: true } });
			const consumer = await lastFakeConsumer();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [
					{
						value: Buffer.from('test-message'),
						headers: { 'content-type': Buffer.from('application/json') },
					},
				],
			});

			expect(emit).toHaveBeenCalledWith([
				[
					{
						json: {
							message: 'test-message',
							topic: 'test-topic',
							headers: { 'content-type': 'application/json' },
						},
					},
				],
			]);
		});

		it('keeps binary data when keepBinaryData is enabled', async () => {
			const { emit } = await startTrigger('v2-binary', { options: { keepBinaryData: true } });
			const consumer = await lastFakeConsumer();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from('binary-data') }],
			});

			const emittedItem = emit.mock.calls[0][0][0][0];
			expect(emittedItem).toHaveProperty('binary');
			expect(emittedItem.json.message).toBe('binary-data');
		});
	});

	describe('Schema Registry', () => {
		it('decodes through the registry when enabled', async () => {
			const mockDecode = vi.fn().mockResolvedValue({ data: 'decoded-data' });
			(SchemaRegistry as unknown as Mock).mockImplementation(function () {
				return { decode: mockDecode } as unknown as Mocked<SchemaRegistry>;
			});

			const { emit } = await startTrigger('v2-registry', {
				useSchemaRegistry: true,
				schemaRegistryUrl: 'http://localhost:8081',
			});
			const consumer = await lastFakeConsumer();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from('avro-encoded') }],
			});

			expect(SchemaRegistry).toHaveBeenCalledWith({ host: 'http://localhost:8081' });
			expect(mockDecode).toHaveBeenCalledWith(Buffer.from('avro-encoded'));
			expect(emit).toHaveBeenCalledWith([
				[{ json: { message: { data: 'decoded-data' }, topic: 'test-topic' } }],
			]);
		});

		it('activates anyway and warns when the registry is unreachable, same as v1', async () => {
			(SchemaRegistry as unknown as Mock).mockImplementationOnce(function () {
				throw Object.assign(new Error('connect ECONNREFUSED'), { status: 503 });
			});

			const { emit, logger } = await startTrigger('v2-registry-down', {
				useSchemaRegistry: true,
				schemaRegistryUrl: 'http://localhost:8081',
			});

			expect(logger.warn).toHaveBeenCalledWith('Could not connect to Schema Registry', {
				message: 'connect ECONNREFUSED',
				status: 503,
			});

			const consumer = await lastFakeConsumer();
			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from('raw-message') }],
			});

			// No registry to decode with, so the raw message is emitted, as v1 does.
			expect(emit).toHaveBeenCalledWith([
				[{ json: { message: 'raw-message', topic: 'test-topic' } }],
			]);
		});

		it('fails activation when the registry credential is misconfigured, same as v1', async () => {
			await expect(
				testTriggerNode(new KafkaTriggerV2(baseDescription), {
					mode: 'trigger',
					node: {
						credentials: {
							kafka: { id: '1', name: 'Kafka account' },
							schemaRegistryApi: { id: '2', name: 'Schema Registry account' },
						},
						parameters: {
							topic: 'test-topic',
							groupId: 'v2-registry-misconfigured',
							useSchemaRegistry: true,
							schemaRegistryUrl: '',
							resolveOffset: 'immediately',
						},
					},
					credentials: {
						kafka: credential,
						schemaRegistryApi: {
							url: 'https://schema-registry.local:8081',
							authentication: 'basicAuth',
							username: 'registry-user',
							password: '',
						},
					},
				}),
			).rejects.toThrow('Username and password are required for Schema Registry Basic Auth');
		});
	});

	describe('offset resolution', () => {
		it('waits for the execution before resolving the offset on onCompletion', async () => {
			const { emit } = await startTrigger('v2-on-completion', { resolveOffset: 'onCompletion' });
			const consumer = await lastFakeConsumer();

			const delivered = consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from('message') }],
			});
			await new Promise((resolve) => setImmediate(resolve));

			// The offset must not advance while the execution is still running.
			expect(emit).toHaveBeenCalled();
			expect(consumer.payloadSpies.resolveOffset).not.toHaveBeenCalled();

			const deferred = emit.mock.calls[0][2];
			expect(deferred).toBeDefined();
			deferred?.resolve(mock<IRun>({ status: 'success' }));
			await delivered;

			expect(consumer.payloadSpies.resolveOffset).toHaveBeenCalledTimes(1);
		});

		it('does not wait for the execution on immediately', async () => {
			const { emit } = await startTrigger('v2-immediately');
			const consumer = await lastFakeConsumer();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from('message') }],
			});

			// No deferred promise means nothing to wait on.
			expect(emit.mock.calls[0][2]).toBeUndefined();
			expect(consumer.payloadSpies.resolveOffset).toHaveBeenCalledTimes(1);
		});

		it('leaves the offset unresolved when the execution status is not allowed', async () => {
			const { emit } = await startTrigger('v2-on-status', {
				resolveOffset: 'onStatus',
				allowedStatuses: ['success'],
				// A rejected status paces the re-delivery before reporting failure;
				// the default 5s would outlast the test.
				options: { errorRetryDelay: 1 },
			});
			const consumer = await lastFakeConsumer();

			const delivered = consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from('message') }],
			});
			await new Promise((resolve) => setImmediate(resolve));

			emit.mock.calls[0][2]?.resolve(mock<IRun>({ status: 'error' }));
			await delivered;

			expect(consumer.payloadSpies.resolveOffset).not.toHaveBeenCalled();
		});
	});

	describe('manual test run isolation from production', () => {
		async function startManualRun(parameters: Record<string, unknown> = {}) {
			const started = await testTriggerNode(new KafkaTriggerV2(baseDescription), {
				mode: 'manual',
				node: {
					parameters: {
						topic: 'test-topic',
						groupId: 'orders-consumer',
						useSchemaRegistry: false,
						...parameters,
					},
				},
				credential,
			});
			await started.manualTriggerFunction?.();
			return started;
		}

		it('tells the user which group ACL prefix to grant when the broker refuses it', async () => {
			// On a cluster with an authorizer, group ACLs are usually granted LITERAL on
			// the exact Group ID, so the throwaway group is a resource nobody authorized
			// and only test runs break. The broker names neither the group nor the fix.
			const { emitError } = await startManualRun();
			const consumer = await lastFakeConsumer();
			const logger = consumer.config.kafkaJS?.logger;
			if (!logger) throw new Error('the node gave the library no logger');

			logger.error('Broker: Group authorization failed');

			expect(emitError).toHaveBeenCalledTimes(1);
			expect((emitError.mock.calls[0][0] as UserError).description).toContain(
				'orders-consumer-n8n-manual-',
			);
		});

		it('closes a consumer that finished starting while the run was being cancelled', async () => {
			// Only manual runs can reach this: an activated workflow awaits the start
			// before n8n has a close function to call. Here the start is handed over as
			// manualTriggerFunction, so cancelling mid-start used to find no handle yet
			// and leave a connected consumer behind with nothing holding it.
			const started = await testTriggerNode(new KafkaTriggerV2(baseDescription), {
				mode: 'manual',
				node: {
					parameters: { topic: 'test-topic', groupId: 'orders-consumer', useSchemaRegistry: false },
				},
				credential,
			});

			// Deliberately not awaited, so close lands while connect/subscribe/run are
			// still in flight.
			const starting = started.manualTriggerFunction?.();
			await started.close?.();
			await starting;

			const consumer = await lastFakeConsumer();
			expect(consumer.disconnect).toHaveBeenCalled();
		});

		it('joins a throwaway group, never the one the activated workflow uses', async () => {
			await startManualRun();

			const consumer = await lastFakeConsumer();
			const { groupId } = consumer.config.kafkaJS ?? {};
			// Sharing the group would let this run commit offsets for messages the
			// activated workflow never received.
			expect(groupId).not.toBe('orders-consumer');
			expect(groupId).toMatch(/^orders-consumer-n8n-manual-.+/);
		});

		it('waits for the next message rather than replaying the topic', async () => {
			// Read Messages From Beginning defaults to on, and the throwaway group has
			// no committed offset, so honouring it would replay everything.
			await startManualRun({ options: { fromBeginning: true } });

			const consumer = await lastFakeConsumer();
			expect(consumer.config.kafkaJS?.fromBeginning).toBe(false);
		});

		it('still honours Read Messages From Beginning for an activated workflow', async () => {
			await startTrigger('v2-from-beginning', { options: { fromBeginning: true } });

			const consumer = await lastFakeConsumer();
			expect(consumer.config.kafkaJS?.fromBeginning).toBe(true);
		});
	});

	describe('manual test run', () => {
		it('starts the loop only when the test event is requested, and never waits', async () => {
			// v1 forces `immediately` in manual mode. The editor discards the run once
			// it has its sample, so a wait would hold the batch open until close.
			const { emit, manualTriggerFunction } = await testTriggerNode(
				new KafkaTriggerV2(baseDescription),
				{
					mode: 'manual',
					node: {
						parameters: {
							topic: 'test-topic',
							groupId: 'v2-manual',
							useSchemaRegistry: false,
							resolveOffset: 'onCompletion',
						},
					},
					credential,
				},
			);

			expect(getFakeConsumers()).toHaveLength(0);

			await manualTriggerFunction?.();

			const consumer = await lastFakeConsumer();
			expect(consumer.connect).toHaveBeenCalledTimes(1);
			expect(emit).not.toHaveBeenCalled();

			await consumer.deliverBatch({
				topic: 'test-topic',
				messages: [{ value: Buffer.from('test') }],
			});

			expect(emit).toHaveBeenCalledWith([[{ json: { message: 'test', topic: 'test-topic' } }]]);
			// Forced to immediately despite the node asking for onCompletion.
			expect(emit.mock.calls[0][2]).toBeUndefined();
		});
	});

	describe('close', () => {
		it('disconnects the consumer', async () => {
			const { close } = await startTrigger('v2-close');
			const consumer = await lastFakeConsumer();

			await close();

			expect(consumer.disconnect).toHaveBeenCalled();
		});

		it('reports a failed teardown as a TriggerCloseError, as v1 does', async () => {
			const { close } = await startTrigger('v2-close-fails');
			const consumer = await lastFakeConsumer();
			const teardownError = new Error('The coordinator is not aware of this member');
			consumer.disconnect.mockRejectedValueOnce(teardownError);

			const error = await close().then(
				() => null,
				(e: unknown) => e,
			);

			expect(error).toBeInstanceOf(TriggerCloseError);
			expect((error as TriggerCloseError).cause).toBe(teardownError);
			expect((error as TriggerCloseError).level).toBe('warning');
		});
	});
});
