import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Joint scale-up of webhook procs and workers. Pair with the 1wp+1w baseline
// and the 2wp+1w (workers-fixed) variant to factor the scaling contribution:
//
//   1wp+1w → baseline                          → exec/s = E1
//   2wp+1w → ingestion doubled, exec fixed     → exec/s = E2
//   2wp+2w → both doubled                      → exec/s = E3
//
//   (E3 − E2) ≈ marginal gain from adding the second worker.
//   (E2 − E1) ≈ marginal gain from adding the second webhook proc.
//   (E3 − E1) ≈ total scaling factor at this hardware.
//
// At green headroom, the matrix's "next scale tier" recommendation is the
// configuration where neither knob is yet saturated.

const MAINS = 1;
const WEBHOOKS = 2;
const WORKERS = 2;
const CONNECTIONS = 200;
const DURATION_SECONDS = 180;

test.use({
	capability: benchConfig('webhook-dedicated-proc-2wp-2w', {
		mains: MAINS,
		webhooks: WEBHOOKS,
		workers: WORKERS,
	}),
});

test.describe(
	'What is the joint scale-up of doubling both webhook procs and workers?',
	{
		tag: '@bench:webhook',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-dedicated-proc-2wp-2w' },
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
