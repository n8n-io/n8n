import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Workers fixed, webhook procs doubled — isolates the ingestion-axis ceiling
// vs the baseline.

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
