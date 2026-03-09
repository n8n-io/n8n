import { test } from '../../../../fixtures/base';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load' } } });

test.describe('Kafka Load', { annotation: [{ type: 'owner', description: 'Catalysts' }] }, () => {
	test('10 nodes, 1KB payload, steady 10 msg/s', async ({ api, services }, testInfo) => {
		const handle = await kafkaDriver.setup({
			api,
			services,
			scenario: { nodeCount: 10, payloadSize: '1KB' },
		});
		await runLoadTest({
			handle,
			api,
			services,
			testInfo,
			load: { type: 'steady', ratePerSecond: 10, durationSeconds: 30 },
			timeoutMs: 120_000,
		});
	});

	test('30 nodes, 10KB payload, steady 100 msg/s', async ({ api, services }, testInfo) => {
		const handle = await kafkaDriver.setup({
			api,
			services,
			scenario: { nodeCount: 30, payloadSize: '10KB' },
		});
		await runLoadTest({
			handle,
			api,
			services,
			testInfo,
			load: { type: 'steady', ratePerSecond: 100, durationSeconds: 30 },
			timeoutMs: 300_000,
		});
	});

	test('60 nodes, 1KB payload, burst drain 10000 backlog', async ({ api, services }, testInfo) => {
		const handle = await kafkaDriver.setup({
			api,
			services,
			scenario: { nodeCount: 60, payloadSize: '1KB', partitions: 3 },
		});
		await runLoadTest({
			handle,
			api,
			services,
			testInfo,
			load: { type: 'preloaded', count: 10_000 },
			timeoutMs: 600_000,
		});
	});

	test('10 nodes, 100KB payload, steady 10 msg/s', async ({ api, services }, testInfo) => {
		const handle = await kafkaDriver.setup({
			api,
			services,
			scenario: { nodeCount: 10, payloadSize: '100KB' },
		});
		await runLoadTest({
			handle,
			api,
			services,
			testInfo,
			load: { type: 'steady', ratePerSecond: 10, durationSeconds: 30 },
			timeoutMs: 300_000,
		});
	});
});
