import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_MAIN_RESOURCES,
	BENCHMARK_WORKER_RESOURCES,
	webhookQueueConfig,
} from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Defaults are 2 mains + 2 workers — fits within the CI runner's CPU budget
// while still exercising multi-main HA. Pair with `webhook-single-instance.spec.ts`
// (1 main, no workers) to read the scaling factor: 2m+2w should hit ~2× the
// single-instance ingestion rate if HA distribution is clean.
//
// To gather a wider scaling curve locally, override mains via env:
//   WEBHOOK_MAINS=1 pnpm --filter=n8n-playwright test:benchmark --grep "main scaling"
//   WEBHOOK_MAINS=3 pnpm --filter=n8n-playwright test:benchmark --grep "main scaling"
//
// Multi-main HA requires N8N_MULTI_MAIN_SETUP_ENABLED and a license cert
// (picked up from N8N_LICENSE_ACTIVATION_KEY / N8N_LICENSE_CERT in the host env).

const MAINS = parseInt(process.env.WEBHOOK_MAINS ?? '2', 10);
const WORKERS = 2;
const CONNECTIONS = 200;
const DURATION_SECONDS = 180;

// TEST_ISOLATION includes mains so each value gets its own container.
const baseConfig = webhookQueueConfig(`webhook-main-scaling-${MAINS}`);
const config: N8NConfig = {
	...baseConfig,
	mains: MAINS,
	workers: WORKERS,
	env: { ...baseConfig.env, N8N_MULTI_MAIN_SETUP_ENABLED: MAINS > 1 ? 'true' : 'false' },
};

test.use({ capability: config });

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
		// At N mains: should be N× baseline if load distributes evenly. Sub-linear
		// means LB or shared resource contention; super-linear is impossible.
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
