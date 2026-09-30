import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Production-canonical queue-mode baseline: 1m + 1wp + 1w. Pair with the
// 2wp-1w and 2wp-2w specs to factor proc-axis and worker-axis scaling.

const MAINS = 1;
const WEBHOOKS = 1;
const WORKERS = 1;
const CONNECTIONS = 200;
const DURATION_SECONDS = 180;

test.use({
	capability: benchConfig('webhook-dedicated-proc-baseline', {
		mains: MAINS,
		webhooks: WEBHOOKS,
		workers: WORKERS,
	}),
});

test.describe(
	'What is the webhook ingestion ceiling with a dedicated webhook proc?',
	{
		tag: '@bench:webhook',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-dedicated-proc-baseline' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (${MAINS} main + ${WEBHOOKS} webhook + ${WORKERS} worker)`, async ({
			api,
			services,
			backendUrl,
		}, testInfo) => {
			const handle = setupWebhook({
				scenario: {
					nodeCount: 1,
					payloadSize: '1KB',
					nodeOutputSize: 'noop',
					responseMode: 'onReceived',
				},
			});
			await runWebhookThroughputTest({
				handle,
				api,
				services,
				testInfo,
				baseUrl: backendUrl,
				connections: CONNECTIONS,
				durationSeconds: DURATION_SECONDS,
				timeoutMs: (DURATION_SECONDS + 60) * 1000,
			});
		});
	},
);
