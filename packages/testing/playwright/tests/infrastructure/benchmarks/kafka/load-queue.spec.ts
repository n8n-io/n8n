import { test } from '../../../../fixtures/base';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const WORKER_COUNT = parseInt(process.env.KAFKA_LOAD_WORKERS ?? '1', 10);
const RESOURCE_MEMORY = parseFloat(process.env.KAFKA_LOAD_MEMORY ?? '2');
const RESOURCE_CPU = parseFloat(process.env.KAFKA_LOAD_CPU ?? '2');

test.use({
	capability: {
		services: ['kafka', 'victoriaLogs', 'victoriaMetrics', 'vector'],
		postgres: true,
		workers: WORKER_COUNT,
		resourceQuota: { memory: RESOURCE_MEMORY, cpu: RESOURCE_CPU },
	},
});

test.describe(
	`Kafka Load Queue (${WORKER_COUNT}w) @mode:queue @capability:kafka @capability:observability @kafka-load-queue`,
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test('steady: 10 nodes, 1KB, 10 msg/s', async ({ api, services }, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 10, payloadSize: '1KB' },
			});
			await runLoadTest({
				handle,
				api,
				testInfo,
				load: { type: 'steady', ratePerSecond: 10, durationSeconds: 30 },
				timeoutMs: 120_000,
			});
		});

		test('steady: 30 nodes, 10KB, 100 msg/s', async ({ api, services }, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 30, payloadSize: '10KB' },
			});
			await runLoadTest({
				handle,
				api,
				testInfo,
				load: { type: 'steady', ratePerSecond: 100, durationSeconds: 30 },
				timeoutMs: 300_000,
			});
		});

		test('burst: 60 nodes, 1KB, drain 10k backlog', async ({ api, services }, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 60, payloadSize: '1KB', partitions: 3 },
			});
			await runLoadTest({
				handle,
				api,
				testInfo,
				load: { type: 'preloaded', count: 10_000 },
				timeoutMs: 600_000,
			});
		});

		test('steady: 10 nodes, 100KB, 10 msg/s', async ({ api, services }, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 10, payloadSize: '100KB' },
			});
			await runLoadTest({
				handle,
				api,
				testInfo,
				load: { type: 'steady', ratePerSecond: 10, durationSeconds: 30 },
				timeoutMs: 300_000,
			});
		});
	},
);
