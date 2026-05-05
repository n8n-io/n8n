import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: benchConfig('burst-drain-capacity', { kafka: true, workers: 1 }) });

test.describe(
	'How fast can we drain a backlog?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'burst-drain-capacity' },
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, drain 100k preloaded backlog (1 main + 1 worker)', async ({
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
				load: { type: 'preloaded', count: 100_000 },
				trigger: 'kafka',
				timeoutMs: 600_000,
			});
		});
	},
);
