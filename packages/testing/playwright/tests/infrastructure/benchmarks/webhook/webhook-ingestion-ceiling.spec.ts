import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	BENCHMARK_MAIN_RESOURCES,
	BENCHMARK_WORKER_RESOURCES,
	STANDARD_QUEUE_ENV,
	STANDARD_WORKER_COUNT,
} from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

const CONNECTIONS = 250;
const DURATION_SECONDS = 120;

const queueConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	workers: STANDARD_WORKER_COUNT,
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_QUEUE_ENV,
		TEST_ISOLATION: 'q-webhook-ingestion-ceiling',
	},
};

test.use({ capability: queueConfig });

test.describe(
	'What is the maximum webhook ingestion rate?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-ingestion-ceiling' },
		],
	},
	() => {
		// Async (`onReceived`) means n8n responds 200 as soon as the request is
		// validated and the job is enqueued — caller doesn't wait for execution.
		// This isolates the webhook ingestion path from worker execution capacity.
		// HTTP req/s = ACK rate ceiling; n8n exec/s = worker drain rate (separate).
		// Backlog growth = (req/s − exec/s).
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (1 main + ${STANDARD_WORKER_COUNT} workers)`, async ({
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
		});
	},
);
