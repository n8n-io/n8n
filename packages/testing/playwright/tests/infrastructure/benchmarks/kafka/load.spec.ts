import { test } from '../../../../fixtures/base';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const annotation = [{ type: 'owner', description: 'Catalysts' }];

test.describe('Kafka Load: steady 10n/1KB', { annotation }, () => {
	test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load-10n-1kb-steady' } } });

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
});

test.describe('Kafka Load: steady 30n/10KB', { annotation }, () => {
	test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load-30n-10kb-steady' } } });

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
});

test.describe('Kafka Load: burst 60n/1KB', { annotation }, () => {
	test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load-60n-1kb-burst' } } });

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
});

test.describe('Kafka Load: steady 10n/100KB', { annotation }, () => {
	test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load-10n-100kb-steady' } } });

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
