import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_MAIN_RESOURCES,
	BENCHMARK_WORKER_RESOURCES,
} from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runThroughputTest } from '../harness/throughput-harness';

const envMessages = parseInt(process.env.BENCHMARK_MESSAGES ?? '0', 10);

test.use({ capability: { env: { TEST_ISOLATION: 'kafka-throughput' } } });

test.describe(
	'Kafka Throughput',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test('10 nodes, 10KB payload, 10KB output/node, 5000 msgs', async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 10, payloadSize: '10KB', nodeOutputSize: '10KB', partitions: 3 },
			});
			await runThroughputTest({
				handle,
				api,
				services,
				testInfo,
				messageCount: envMessages || 5_000,
				nodeCount: 10,
				nodeOutputSize: '10KB',
				timeoutMs: 300_000,
				plan: BENCHMARK_MAIN_RESOURCES,
				workerPlan: BENCHMARK_WORKER_RESOURCES,
			});
		});

		test('30 nodes, 10KB payload, 10KB output/node, 5000 msgs', async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 30, payloadSize: '10KB', nodeOutputSize: '10KB', partitions: 3 },
			});
			await runThroughputTest({
				handle,
				api,
				services,
				testInfo,
				messageCount: envMessages || 5_000,
				nodeCount: 30,
				nodeOutputSize: '10KB',
				timeoutMs: 300_000,
				plan: BENCHMARK_MAIN_RESOURCES,
				workerPlan: BENCHMARK_WORKER_RESOURCES,
			});
		});

		test('60 nodes, 10KB payload, 10KB output/node, 5000 msgs', async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 60, payloadSize: '10KB', nodeOutputSize: '10KB', partitions: 3 },
			});
			await runThroughputTest({
				handle,
				api,
				services,
				testInfo,
				messageCount: envMessages || 5_000,
				nodeCount: 60,
				nodeOutputSize: '10KB',
				timeoutMs: 600_000,
				plan: BENCHMARK_MAIN_RESOURCES,
				workerPlan: BENCHMARK_WORKER_RESOURCES,
			});
		});

		test('10 nodes, 1KB payload, 100KB output/node, 5000 msgs', async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: {
					nodeCount: 10,
					payloadSize: '1KB',
					nodeOutputSize: '100KB',
					partitions: 3,
				},
			});
			await runThroughputTest({
				handle,
				api,
				services,
				testInfo,
				messageCount: envMessages || 5_000,
				nodeCount: 10,
				nodeOutputSize: '100KB',
				timeoutMs: 600_000,
				plan: BENCHMARK_MAIN_RESOURCES,
				workerPlan: BENCHMARK_WORKER_RESOURCES,
			});
		});
	},
);
