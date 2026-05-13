import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

const MAINS = 1;
const WORKERS = 1;
const CONNECTIONS = 200;
const DURATION_SECONDS = 180;

// Same scenario as `webhook-queue-baseline.spec.ts` but with execution data
// persisted on success. Compare this run's `exec/s` and `p50` against the
// queue-baseline from the same CI run to read the cost of saving execution
// data — the typical production default the rest of the bench suite suppresses
// for clean ceiling numbers.
test.use({
	capability: benchConfig('webhook-save-data-overhead', {
		mains: MAINS,
		workers: WORKERS,
		env: { EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'all' },
	}),
});

test.describe(
	'What is the runtime cost of saving execution data on success?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-save-data-overhead' },
		],
	},
	() => {
		test(`Async webhook + 1 noop, 1KB payload, ${CONNECTIONS} connections × ${DURATION_SECONDS}s (${MAINS} main + ${WORKERS} worker, save-on-success)`, async ({
			api,
			services,
			backendUrl,
		}, testInfo) => {
			await runWebhookThroughputTest({
				handle: setupWebhook({
					scenario: {
						nodeCount: 1,
						payloadSize: '1KB',
						nodeOutputSize: 'noop',
						responseMode: 'onReceived',
					},
				}),
				api,
				services,
				testInfo,
				baseUrl: backendUrl,
				connections: CONNECTIONS,
				durationSeconds: DURATION_SECONDS,
				timeoutMs: (DURATION_SECONDS + 60) * 1000,
			});

			console.log(
				"\n[SAVE-DATA OVERHEAD] Compare this spec's exec/s and p50 against " +
					'webhook-queue-baseline from the same run for the save-execution-data cost delta.\n',
			);
		});
	},
);
