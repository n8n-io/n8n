import { test } from '../../../../fixtures/base';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

test.use({ capability: { env: { TEST_ISOLATION: 'kafka-load-30n-10kb-steady-200' } } });

test.describe(
	'Kafka Load: steady 30n/10KB/200msg',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('30 nodes, 10KB payload, steady 200 msg/s', async ({ api, services }, testInfo) => {
			const handle = await kafkaDriver.setup({
				api,
				services,
				scenario: { nodeCount: 30, payloadSize: '10KB' },
			});
			await runLoadTest({
				handle,
				api,
				services,
				testInfo,
				load: { type: 'steady', ratePerSecond: 200, durationSeconds: 30 },
				trigger: 'kafka',
				nodeCount: 30,
				nodeOutputSize: '10KB',
				timeoutMs: 300_000,
			});
		});
	},
);
