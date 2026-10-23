import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { runKafkaLoadTest } from '../harness/kafka-backlog-harness';

test.use({ capability: benchConfig('queue-mode-sustained-rate', { kafka: true, workers: 1 }) });

test.describe(
	'Can queue mode sustain 15 msg/s steady?',
	{
		tag: '@bench:kafka',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'queue-mode-sustained-rate' },
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, 15 msg/s × 120s (1 main + 1 worker)', async ({
			api,
			services,
		}, testInfo) => {
			await runKafkaLoadTest({
				api,
				services,
				scenario: { nodeCount: 1, payloadSize: '1KB', nodeOutputSize: 'noop', partitions: 3 },
				testInfo,
				load: { type: 'steady', ratePerSecond: 15, durationSeconds: 120 },
				timeoutMs: 240_000,
				minimumCompletionRatio: 1,
				minTailRateEfficiency: 0.95,
			});
		});
	},
);
