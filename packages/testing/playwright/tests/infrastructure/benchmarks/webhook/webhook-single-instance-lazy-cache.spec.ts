import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { VM_LAZY_CACHE_BENCHMARK_PROFILE } from '../../../../utils/benchmark';
import {
	runSingleInstanceWebhookBenchmark,
	SINGLE_INSTANCE_WEBHOOK_CONNECTIONS,
	SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS,
} from '../harness/single-instance-webhook-harness';

test.use({
	capability: benchConfig(
		`webhook-single-instance-${VM_LAZY_CACHE_BENCHMARK_PROFILE.isolationSuffix}`,
		{ env: VM_LAZY_CACHE_BENCHMARK_PROFILE.env },
	),
});

test.describe(
	'What is the single-instance webhook ingestion ceiling with lazy expression isolates?',
	{
		tag: '@bench:webhook',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-single-instance-vm-lazy-cache' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${SINGLE_INSTANCE_WEBHOOK_CONNECTIONS} connections × ${SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS}s (1 main, no workers, VM lazy + compile cache)`, async ({
			api,
			services,
			backendUrl,
		}, testInfo) => {
			await runSingleInstanceWebhookBenchmark({
				api,
				services,
				testInfo,
				baseUrl: backendUrl,
				dimensions: VM_LAZY_CACHE_BENCHMARK_PROFILE.dimensions,
			});
		});
	},
);
