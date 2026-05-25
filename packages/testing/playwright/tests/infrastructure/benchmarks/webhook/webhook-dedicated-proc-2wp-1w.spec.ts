import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Isolates webhook-ingestion scaling. Pair with `webhook-dedicated-proc-baseline`
// (1 main + 1 webhook + 1 worker). Doubling the webhook procs while holding
// workers fixed surfaces whether ingestion or execution is the binding ceiling
// at this hardware. If exec/s climbs proportionally → ingestion was the limit.
// If exec/s flattens → worker is now the limit and the next scaling step is
// worker count, not webhook procs.

const MAINS = 1;
const WEBHOOKS = 2;
const WORKERS = 1;
const CONNECTIONS = 200;
const DURATION_SECONDS = 180;

test.use({
	capability: benchConfig('webhook-dedicated-proc-2wp-1w', {
		mains: MAINS,
		webhooks: WEBHOOKS,
		workers: WORKERS,
	}),
});

test.describe(
	'Does doubling webhook procs (workers fixed) increase ingestion throughput?',
	{
		tag: '@bench:webhook',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-dedicated-proc-2wp-1w' },
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
