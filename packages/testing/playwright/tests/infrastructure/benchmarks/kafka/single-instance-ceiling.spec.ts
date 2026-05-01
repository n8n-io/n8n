import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	BENCHMARK_MAIN_RESOURCES,
	STANDARD_DIRECT_ENV,
} from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runThroughputTest } from '../harness/throughput-harness';

const directConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_DIRECT_ENV,
		TEST_ISOLATION: 'q-single-instance-ceiling',
	},
};

test.use({ capability: directConfig });

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
			await runThroughputTest({
				handle,
				api,
				services,
				testInfo,
				messageCount: 150_000,
				trigger: 'kafka',
				timeoutMs: 1_800_000,
				plan: BENCHMARK_MAIN_RESOURCES,
			});
		});
	},
);
