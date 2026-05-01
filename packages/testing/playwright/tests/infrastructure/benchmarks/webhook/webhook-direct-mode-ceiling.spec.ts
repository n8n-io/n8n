import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	BENCHMARK_MAIN_RESOURCES,
	STANDARD_DIRECT_ENV,
} from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

const CONNECTIONS = 250;
const DURATION_SECONDS = 120;

// Direct mode: no Bull, no workers. Webhook receives → workflow runs inline on
// the same Node.js process → respond. Async (`onReceived`) returns the 200
// before execution completes; the workflow runs as a detached promise on the
// same event loop. Comparison spec to webhook-ingestion-ceiling (queue mode):
// isolates whether queue dispatch is the throughput bottleneck or whether the
// HTTP path itself caps throughput regardless of architecture.
const directConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_DIRECT_ENV,
		TEST_ISOLATION: 'q-webhook-direct-mode-ceiling',
	},
};

test.use({ capability: directConfig });

test.describe(
	'What is the maximum webhook ingestion rate in direct mode?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-direct-mode-ceiling' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (single instance, no workers)`, async ({
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
			});
		});
	},
);
