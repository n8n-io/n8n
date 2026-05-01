import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	STANDARD_QUEUE_ENV,
	STANDARD_WORKER_COUNT,
} from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const queueConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
	workers: STANDARD_WORKER_COUNT,
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_QUEUE_ENV,
		TEST_ISOLATION: 'q-burst-drain-capacity',
	},
};

test.use({ capability: queueConfig });

test.describe(
	'How fast can we drain a backlog?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'burst-drain-capacity' },
		],
	},
	() => {
		test(`Kafka trigger + 60 noop, 1KB payload, burst drain 100000 backlog (1 main + ${STANDARD_WORKER_COUNT} workers)`, async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: {
					nodeCount: 1,
					payloadSize: '1KB',
					nodeOutputSize: 'noop',
					partitions: 3,
				},
			});
			await runLoadTest({
				handle,
				api,
				services,
				testInfo,
				load: { type: 'preloaded', count: 100_000 },
				trigger: 'kafka',
				timeoutMs: 600_000,
			});
		});
	},
);
