import { test } from '../../../../fixtures/base';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load-10n-1kb-steady' } } });

test.describe(
	'Kafka Load: steady 10n/1KB',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('10 nodes, 1KB payload, steady 10 msg/s', async ({ api, services }, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 10, payloadSize: '1KB' },
			});
			await runLoadTest({
				handle,
				api,
				services,
				testInfo,
				load: { type: 'steady', ratePerSecond: 10, durationSeconds: 30 },
				timeoutMs: 120_000,
			});
		});
	},
);
