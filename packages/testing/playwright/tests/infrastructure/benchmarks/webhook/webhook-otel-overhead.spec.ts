import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

const CONNECTIONS = 250;
const DURATION_SECONDS = 120;

// Same scenario as `webhook-single-instance.spec.ts` but with OTEL turned on.
// Compare this run's `exec/s` against the single-instance baseline from the
// same CI run to read the OTEL cost. The harness auto-attaches Jaeger traces
// (jaeger-traces.json) for replay/flamegraph inspection.
test.use({
	capability: benchConfig('webhook-otel-overhead', { tracing: true }),
});

test.describe(
	'What is the runtime cost of enabling OTEL?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-otel-overhead' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (1 main, no workers, OTEL on)`, async ({
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

			console.log(
				"\n[OTEL OVERHEAD] Compare this spec's exec/s and p50 against " +
					'webhook-single-instance from the same run for the OTEL cost delta.\n' +
					'  Jaeger traces attached as jaeger-traces.json for flamegraph inspection.',
			);
		});
	},
);
