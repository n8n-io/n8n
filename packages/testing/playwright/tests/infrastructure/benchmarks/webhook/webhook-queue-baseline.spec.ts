import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Queue-mode baseline at 1 main + 1 worker. Pair with `webhook-main-scaling`
// (2 mains + 2 workers) to read the multi-main scaling factor isolated from
// the direct→queue architecture change. Without this baseline, comparing
// `webhook-single-instance` (1m, 0w direct) to `webhook-main-scaling` would
// conflate "adding mains" with "switching to queue mode".
//
// Parameters intentionally match `webhook-main-scaling.spec.ts` (200 × 180s)
// so the comparison is apples-to-apples.

const MAINS = 1;
const WORKERS = 1;
const CONNECTIONS = 200;
const DURATION_SECONDS = 180;

test.use({ capability: benchConfig('webhook-queue-baseline', { mains: MAINS, workers: WORKERS }) });

test.describe(
	'What is the webhook ingestion ceiling in queue mode at 1 main + 1 worker?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-queue-baseline' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (${MAINS} main + ${WORKERS} worker)`, async ({
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
