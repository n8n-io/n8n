import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Dedicated `n8n webhook` proc baseline at 1 main + 1 webhook proc + 1 worker.
// This is the production-canonical topology for queue-mode n8n: Caddy routes
// `/webhook/*` and `/form/*` to the dedicated webhook proc; everything else
// (UI, REST, `/webhook-test/*`, `/webhook-waiting/*`, `/form-test/*`) flows
// to main. Pair with `webhook-dedicated-proc-2wp-1w` and
// `webhook-dedicated-proc-2wp-2w` to read the proc-axis and worker-axis
// scaling factors independently.

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
