import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	STANDARD_QUEUE_ENV,
	STANDARD_WORKER_COUNT,
} from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import type { PublishStage } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const STAGES: PublishStage[] = [
	{ ratePerSecond: 100, durationSeconds: 60 },
	{ ratePerSecond: 200, durationSeconds: 60 },
	{ ratePerSecond: 300, durationSeconds: 60 },
	{ ratePerSecond: 500, durationSeconds: 60 },
	{ ratePerSecond: 700, durationSeconds: 60 },
];

const queueConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
	workers: STANDARD_WORKER_COUNT,
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_QUEUE_ENV,
		TEST_ISOLATION: 'q-steady-rate-breaking-point',
	},
};

test.use({ capability: queueConfig });

test.describe(
	'At what input rate does the system fall behind?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'steady-rate-breaking-point' },
		],
	},
	() => {
		const totalDuration = STAGES.reduce((sum, s) => sum + s.durationSeconds, 0);
		const minRate = Math.min(...STAGES.map((s) => s.ratePerSecond));
		const maxRate = Math.max(...STAGES.map((s) => s.ratePerSecond));

		test(`Kafka trigger + 30 noop, 10KB payload, ramp ${minRate}→${maxRate} msg/s × ${totalDuration}s (1 main + ${STANDARD_WORKER_COUNT} workers)`, async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: {
					nodeCount: 30,
					payloadSize: '10KB',
					nodeOutputSize: 'noop',
					partitions: 3,
				},
			});
			await runLoadTest({
				handle,
				api,
				services,
				testInfo,
				load: { type: 'staged', stages: STAGES },
				trigger: 'kafka',
				timeoutMs: 1_200_000,
			});
		});
	},
);
