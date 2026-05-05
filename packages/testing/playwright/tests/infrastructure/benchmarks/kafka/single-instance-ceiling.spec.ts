import { test } from '../../../../fixtures/base';
import { BENCHMARK_MAIN_RESOURCES, benchConfig } from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: benchConfig('single-instance-ceiling', { kafka: true }) });

test.describe(
	'How much can we process on a single instance?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'single-instance-throughput-ceiling' },
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, 150k msgs', async ({ api, services }, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 1, payloadSize: '1KB', nodeOutputSize: 'noop', partitions: 3 },
			});
			await runLoadTest({
				handle,
				api,
				services,
				testInfo,
				load: { type: 'preloaded', count: 150_000 },
				trigger: 'kafka',
				timeoutMs: 1_800_000,
				resourceSummary: { plan: BENCHMARK_MAIN_RESOURCES },
			});
		});
	},
);
