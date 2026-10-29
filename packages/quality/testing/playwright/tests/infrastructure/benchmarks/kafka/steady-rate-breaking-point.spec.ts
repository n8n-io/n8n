import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import type { PublishStage } from '../../../../utils/benchmark';
import { runKafkaLoadTest } from '../harness/kafka-backlog-harness';

const STAGES: PublishStage[] = [
	{ ratePerSecond: 10, durationSeconds: 60 },
	{ ratePerSecond: 20, durationSeconds: 60 },
	{ ratePerSecond: 30, durationSeconds: 60 },
	{ ratePerSecond: 40, durationSeconds: 60 },
	{ ratePerSecond: 50, durationSeconds: 60 },
];

// Direct mode — no workers — so the breaking point measures a single-instance
// ingestion + execution ceiling, not a worker-drain ceiling. Adding a worker
// conflates "main fell behind" with "Bull dispatch / worker drain fell behind"
// and the measured rate becomes ambiguous.
test.use({ capability: benchConfig('steady-rate-breaking-point', { kafka: true }) });

test.describe(
	'At what input rate does the system fall behind?',
	{
		tag: '@bench:kafka',
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
			await runKafkaLoadTest({
				api,
				services,
				scenario: { nodeCount: 30, payloadSize: '10KB', nodeOutputSize: 'noop', partitions: 3 },
				testInfo,
				load: { type: 'staged', stages: STAGES },
				timeoutMs: 600_000,
				requireKeptUpStage: true,
			});
		});
	},
);
