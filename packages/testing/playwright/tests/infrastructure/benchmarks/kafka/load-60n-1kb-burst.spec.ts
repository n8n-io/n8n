import { test } from '../../../../fixtures/base';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load-60n-1kb-burst' } } });

test.describe(
	'Kafka Load: burst 60n/1KB',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('60 nodes, 1KB payload, burst drain 10000 backlog', async ({
			api,
			services,
		}, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 60, payloadSize: '1KB', partitions: 3 },
			});
			await runLoadTest({
				handle,
				api,
				services,
				testInfo,
				load: { type: 'preloaded', count: 10_000 },
				trigger: 'kafka',
				nodeCount: 60,
				timeoutMs: 600_000,
			});
		});
	},
);
