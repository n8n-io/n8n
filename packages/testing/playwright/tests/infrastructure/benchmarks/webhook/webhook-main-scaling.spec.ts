import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	BENCHMARK_MAIN_RESOURCES,
	BENCHMARK_WORKER_RESOURCES,
	STANDARD_QUEUE_ENV,
} from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Multi-main scaling can't be done as a single-test in-spec ramp because
// `mains` is part of `containerConfig`, which is worker-scoped and fixed at
// spec load. To gather a scaling curve, run this spec multiple times with
// different `WEBHOOK_MAINS` values and compare the resulting numbers:
//
//   WEBHOOK_MAINS=1 pnpm --filter=n8n-playwright test:benchmark --grep "main scaling"
//   WEBHOOK_MAINS=2 pnpm --filter=n8n-playwright test:benchmark --grep "main scaling"
//   WEBHOOK_MAINS=3 pnpm --filter=n8n-playwright test:benchmark --grep "main scaling"
//
// Multi-main HA requires N8N_MULTI_MAIN_SETUP_ENABLED and a license cert.
// The license is picked up from N8N_LICENSE_ACTIVATION_KEY / N8N_LICENSE_CERT
// in the host environment by the container fixture.

const MAINS = parseInt(process.env.WEBHOOK_MAINS ?? '3', 10);
const WORKERS = 2;
const CONNECTIONS = 200;
const DURATION_SECONDS = 180;

const queueConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	mains: MAINS,
	workers: WORKERS,
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_QUEUE_ENV,
		N8N_MULTI_MAIN_SETUP_ENABLED: MAINS > 1 ? 'true' : 'false',
		// TEST_ISOLATION includes mains so each value gets its own container.
		TEST_ISOLATION: `q-webhook-main-scaling-${MAINS}`,
	},
};

test.use({ capability: queueConfig });

test.describe(
	'Does webhook ingestion scale linearly with main count?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-main-scaling' },
		],
	},
	() => {
		// Async webhook so HTTP req/s = ingestion ACK rate (independent of worker drain).
		// At 1 main: baseline ingestion ceiling.
		// At N mains: should be N× baseline if load distributes evenly (per-main pod
		// is independently handling HTTP). Sub-linear means LB or shared resource
		// contention; super-linear is impossible (would indicate measurement bug).
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (${MAINS} main${MAINS === 1 ? '' : 's'} + ${WORKERS} workers)`, async ({
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
				plan: BENCHMARK_MAIN_RESOURCES,
				workerPlan: BENCHMARK_WORKER_RESOURCES,
			});

			console.log(
				`\n[MAIN SCALING] mains=${MAINS} | Compare HTTP req/s across runs with different WEBHOOK_MAINS values.\n` +
					'  Linear scaling = ingestion req/s grows ~N× with mains.\n' +
					'  Sub-linear = load balancer / shared resource bottleneck.',
			);
		});
	},
);
