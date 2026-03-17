import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_MAIN_RESOURCES,
	BENCHMARK_WORKER_RESOURCES,
} from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

test.use({ capability: { env: { TEST_ISOLATION: 'webhook-tp-async' } } });

test.describe(
	'Webhook Throughput: async',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('async: 10 nodes, 10KB payload, 10KB output/node, 50 connections, 60s', async ({
			api,
			services,
			backendUrl,
		}, testInfo) => {
			const handle = setupWebhook({
				scenario: {
					nodeCount: 10,
					payloadSize: '10KB',
					nodeOutputSize: '10KB',
					responseMode: 'onReceived',
				},
			});
			await runWebhookThroughputTest({
				handle,
				api,
				services,
				testInfo,
				baseUrl: backendUrl,
				nodeCount: 10,
				nodeOutputSize: '10KB',
				connections: 50,
				durationSeconds: 60,
				timeoutMs: 120_000,
				plan: BENCHMARK_MAIN_RESOURCES,
				workerPlan: BENCHMARK_WORKER_RESOURCES,
			});
		});
	},
);
