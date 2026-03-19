import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_MAIN_RESOURCES,
	BENCHMARK_WORKER_RESOURCES,
} from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runThroughputTest } from '../harness/throughput-harness';

const envMessages = parseInt(process.env.BENCHMARK_MESSAGES ?? '0', 10);

test.use({ capability: { env: { TEST_ISOLATION: 'kafka-tp-30n-10kb' } } });

test.describe(
	'Kafka Throughput: 30n/10KB',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
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
				trigger: 'kafka',
				timeoutMs: 300_000,
				plan: BENCHMARK_MAIN_RESOURCES,
				workerPlan: BENCHMARK_WORKER_RESOURCES,
			});
		});
	},
);
