import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { VM_EAGER_BENCHMARK_PROFILE } from '../../../../utils/benchmark';
import {
	runSingleInstanceWebhookBenchmark,
	SINGLE_INSTANCE_WEBHOOK_CONNECTIONS,
	SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS,
} from '../harness/single-instance-webhook-harness';

// Direct mode: no Bull, no workers. Webhook receives → workflow runs inline on
// the same Node.js process → respond. Async (`onReceived`) returns the 200
// before execution completes; the workflow runs as a detached promise on the
// same event loop. This is the canonical single-instance direct-mode ceiling
// — the community-edition / single-container deployment shape. For queue-mode
// shapes, see the `webhook-dedicated-proc-*` specs.
test.use({
	capability: benchConfig(`webhook-single-instance-${VM_EAGER_BENCHMARK_PROFILE.isolationSuffix}`, {
		env: VM_EAGER_BENCHMARK_PROFILE.env,
	}),
});

test.describe(
	'What is the single-instance webhook ingestion ceiling?',
	{
		tag: '@bench:webhook',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-single-instance' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${SINGLE_INSTANCE_WEBHOOK_CONNECTIONS} connections × ${SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS}s (1 main, no workers)`, async ({
			api,
			services,
			backendUrl,
		}, testInfo) => {
			await runSingleInstanceWebhookBenchmark({
				api,
				services,
				testInfo,
				baseUrl: backendUrl,
				dimensions: VM_EAGER_BENCHMARK_PROFILE.dimensions,
			});
		});
	},
);
