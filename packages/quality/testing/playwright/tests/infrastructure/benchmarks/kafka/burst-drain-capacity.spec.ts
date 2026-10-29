import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { runKafkaBacklogTest } from '../harness/kafka-backlog-harness';

test.use({ capability: benchConfig('burst-drain-capacity', { kafka: true, workers: 1 }) });

test.describe(
	'How fast can we drain a backlog?',
	{
		tag: '@bench:kafka',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'burst-drain-capacity' },
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, drain 2k preloaded backlog (1 main + 1 worker)', async ({
			api,
			services,
		}, testInfo) => {
			await runKafkaBacklogTest({
				api,
				services,
				testInfo,
				messageCount: 2_000,
				timeoutMs: 180_000,
				minimumCompletionRatio: 1,
			});
		});
	},
);
