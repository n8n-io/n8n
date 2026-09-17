import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { ENGINE_V2_BENCHMARK_PROFILE } from '../../../../utils/benchmark';
import {
	runSingleInstanceWebhookBenchmark,
	SINGLE_INSTANCE_WEBHOOK_CONNECTIONS,
	SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS,
} from '../harness/single-instance-webhook-harness';

test.use({
	capability: benchConfig(
		`webhook-single-instance-${ENGINE_V2_BENCHMARK_PROFILE.isolationSuffix}`,
		{
			engine: ENGINE_V2_BENCHMARK_PROFILE.engineDatabase,
			env: ENGINE_V2_BENCHMARK_PROFILE.env,
		},
	),
});

test.describe(
	'What is the single-instance webhook ingestion ceiling with execution engine v2?',
	{
		tag: '@bench:webhook',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-single-instance-engine-v2' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${SINGLE_INSTANCE_WEBHOOK_CONNECTIONS} connections × ${SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS}s (1 main, no workers, engine v2)`, async ({
			api,
			services,
			backendUrl,
		}, testInfo) => {
			await runSingleInstanceWebhookBenchmark({
				api,
				services,
				testInfo,
				baseUrl: backendUrl,
				dimensions: ENGINE_V2_BENCHMARK_PROFILE.dimensions,
				engineType: ENGINE_V2_BENCHMARK_PROFILE.engineType,
				allowIncompleteDrain: true,
				drainTimeoutSeconds: 0,
			});
		});
	},
);
