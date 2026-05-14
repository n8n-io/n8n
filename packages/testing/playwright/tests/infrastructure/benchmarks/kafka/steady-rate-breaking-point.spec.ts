import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
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

// Direct mode — no workers — so the breaking point measures a single-instance
// ingestion + execution ceiling, not a worker-drain ceiling. Adding a worker
// conflates "main fell behind" with "Bull dispatch / worker drain fell behind"
// and the measured rate becomes ambiguous.
test.use({ capability: benchConfig('steady-rate-breaking-point', { kafka: true }) });

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

		test(`Kafka trigger + 30 noop, 10KB payload, ramp ${minRate}→${maxRate} msg/s × ${totalDuration}s (1 main, no workers)`, async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 30, payloadSize: '10KB', nodeOutputSize: 'noop', partitions: 3 },
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
