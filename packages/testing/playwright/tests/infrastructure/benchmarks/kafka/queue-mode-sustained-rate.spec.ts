import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: benchConfig('queue-mode-sustained-rate', { kafka: true, workers: 1 }) });

test.describe(
	'Can queue mode sustain 250 msg/s steady?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'queue-mode-sustained-rate' },
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, 250 msg/s × 240s (1 main + 1 worker)', async ({
			api,
			services,
		}, testInfo) => {
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
				load: { type: 'steady', ratePerSecond: 250, durationSeconds: 240 },
				trigger: 'kafka',
				timeoutMs: 600_000,
			});
		});
	},
);
