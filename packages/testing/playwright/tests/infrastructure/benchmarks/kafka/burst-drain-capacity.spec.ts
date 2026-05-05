import { test } from '../../../../fixtures/base';
import { STANDARD_WORKER_COUNT, kafkaQueueConfig } from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: kafkaQueueConfig('burst-drain-capacity') });

test.describe(
	'How fast can we drain a backlog?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'burst-drain-capacity' },
		],
	},
	() => {
		test(`Kafka trigger + 1 noop, 1KB payload, drain 100k preloaded backlog (1 main + ${STANDARD_WORKER_COUNT} workers)`, async ({
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
