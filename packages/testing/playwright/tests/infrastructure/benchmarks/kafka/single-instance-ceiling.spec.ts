import { test } from '../../../../fixtures/base';
import { BENCHMARK_MAIN_RESOURCES, benchConfig } from '../../../../playwright-projects';
import { runKafkaBacklogTest } from '../harness/kafka-backlog-harness';

const MESSAGE_COUNT = 2_000;

test.use({ capability: benchConfig('single-instance-ceiling', { kafka: true }) });

test.describe(
	'How much can we process on a single instance?',
	{
		tag: '@bench:kafka',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'single-instance-throughput-ceiling' },
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, 2k msgs', async ({ api, services }, testInfo) => {
			await runKafkaBacklogTest({
				api,
				services,
				testInfo,
				messageCount: MESSAGE_COUNT,
				timeoutMs: 180_000,
				resourceSummary: { plan: BENCHMARK_MAIN_RESOURCES },
				requireComplete: true,
			});
		});
	},
);
