import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

const CONNECTIONS = 250;
const DURATION_SECONDS = 120;

// Direct mode: no Bull, no workers. Webhook receives → workflow runs inline on
// the same Node.js process → respond. Async (`onReceived`) returns the 200
// before execution completes; the workflow runs as a detached promise on the
// same event loop. This is the canonical single-instance direct-mode ceiling.
// For multi-main scaling comparisons, use `webhook-queue-baseline.spec.ts`
// (1m + 1w queue mode) — comparing direct mode to queue mode mixes
// architecture changes with main-count scaling.
test.use({ capability: benchConfig('webhook-single-instance') });

test.describe(
	'What is the single-instance webhook ingestion ceiling?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-single-instance' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (1 main, no workers)`, async ({
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
