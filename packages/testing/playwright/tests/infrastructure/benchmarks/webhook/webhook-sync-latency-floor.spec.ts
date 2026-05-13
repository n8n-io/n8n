import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from '../harness/webhook-throughput-harness';

// Sync webhook latency floor — paired sweep at 1 main + 1 worker (queue mode)
// to find the lowest achievable p95 round-trip for `responseMode: lastNode`.
//
// Differs from throughput specs in three ways:
//   - pipelining: 1   → measures pure round-trip, not overlapped requests.
//   - low conns     → keeps the BullMQ queue near-empty so p95 reflects
//                     request-path latency, not queue wait time.
//   - sweep         → reveals the concurrency inflection point where queue
//                     wait starts dominating. The sweet spot is just below it.
//
// Save-on-success is intentional: `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none` calls
// `deleteInFlightExecution` which still issues a write (UPDATE-with-deletedAt
// under pruning, or DELETE without), so the floor doesn't actually drop —
// see `packages/cli/src/executions/execution-persistence.ts`.

const MAINS = 1;
const WORKERS = 1;
const DURATION_SECONDS = 60;
const WARMUP_SECONDS = 15;
const CONNECTION_SWEEP = [1, 2, 4, 8] as const;

test.use({
	capability: benchConfig('webhook-sync-latency-floor', { mains: MAINS, workers: WORKERS }),
});

test.describe(
	'What is the sync webhook latency floor at 1 main + 1 worker?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'webhook-sync-latency-floor' },
		],
	},
	() => {
		for (const connections of CONNECTION_SWEEP) {
			test(`Sync webhook + 1 noop, 1KB payload, ${connections} connection${connections === 1 ? '' : 's'} × ${DURATION_SECONDS}s (${MAINS} main + ${WORKERS} worker)`, async ({
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
							responseMode: 'lastNode',
						},
					}),
					api,
					services,
					testInfo,
					baseUrl: backendUrl,
					connections,
					pipelining: 1,
					warmupSeconds: WARMUP_SECONDS,
					durationSeconds: DURATION_SECONDS,
					timeoutMs: (DURATION_SECONDS + WARMUP_SECONDS + 60) * 1000,
				});
			});
		}
	},
);
