import { expectScheduleTriggerFires } from './schedule-trigger-helpers';
import { makeScheduleTriggerWorkflow } from './schedule-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

const sleep = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

// Durable scheduler under a multi-main cluster. The scheduler has no leader: the
// sweep, executor and reaper loops run on every main, and correctness comes from
// the DB claim (`FOR UPDATE SKIP LOCKED` plus a `claimedBy`/`leaseEpoch` fence)
// rather than electing one main to fire. These tests prove the two properties the
// legacy in-memory timer cannot offer across a cluster: a tick fires exactly once
// (not once per main), and firing survives losing a main (lease-expiry reclaim).
//
// Topology is inherited from the running project, not pinned here. Pinning
// `mains: 2` in `test.use` would force a licensed 2-main stack under the sqlite
// project too, which throws at startup without a license; instead the tests skip
// via `mainUrls.length < 2` on single-main projects. Only the scheduler env is
// added here, merged with the project's container config.
test.use({
	capability: {
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_SWEEP_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

test.describe(
	'Schedule Trigger multi-main (durable scheduler) @mode:multi-main',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fire an activated Schedule Trigger exactly once across the cluster', async ({
			api,
			mainUrls,
		}) => {
			// Only meaningful with more than one main competing for the same tick.
			// eslint-disable-next-line playwright/no-skipped-test -- runtime topology guard, not a disabled test
			test.skip(mainUrls.length < 2, 'requires a multi-main cluster (2+ mains)');

			const workflowId = await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());

			// Count the delta over a fixed window of roughly five 2s ticks. Both mains
			// run the sweep + executor every 1s, so a broken claim would let each main
			// fire the same tick, doubling the count towards ~10. A correct atomic
			// claim keeps it to one execution per tick (~5). Measuring the delta (not
			// the absolute total) keeps ticks accrued during the up-to-60s detection
			// in expectScheduleTriggerFires out of the window's budget.
			const countBefore = (await api.workflows.getExecutions(workflowId, 100)).length;
			await sleep(10_000);
			const countAfter = (await api.workflows.getExecutions(workflowId, 100)).length;
			const fired = countAfter - countBefore;

			expect(fired).toBeGreaterThanOrEqual(2);
			expect(fired).toBeLessThanOrEqual(8);
		});

		test('should keep firing after one main is stopped', async ({
			api,
			mainUrls,
			n8nContainer,
			createApiForMain,
		}) => {
			// eslint-disable-next-line playwright/no-skipped-test -- runtime topology guard, not a disabled test
			test.skip(mainUrls.length < 2, 'requires a multi-main cluster (2+ mains)');
			// Needs real containers to stop one; skipped against a local instance.
			// eslint-disable-next-line playwright/no-skipped-test -- container-only guard, not a disabled test
			test.skip(!n8nContainer, 'container-only: requires stoppable n8n containers');

			const workflowId = await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());

			// Snapshot what fired before the stop. Continuity is only proven by an
			// execution whose id is not in this set appearing afterwards.
			const idsBeforeStop = new Set(
				(await api.workflows.getExecutions(workflowId, 50)).map((execution) => execution.id),
			);

			// Stop main-1. There is no leader, so the survivor (main-2) is already
			// competing for the same ticks and its sweep/executor keep going; any tick
			// main-1 had claimed but not completed is reclaimed once its lease expires.
			const [stopped] = n8nContainer.findContainers(/-n8n-main-1$/);
			expect(stopped, 'main-1 container should be found').toBeDefined();
			await n8nContainer.stopContainer(/-n8n-main-1$/);

			// Query the survivor directly rather than via the load balancer, which
			// keeps routing a share of requests to the stopped main until it drops it.
			const survivor = await createApiForMain(1);

			// A brand-new trigger execution (not in the pre-stop set) fires without
			// re-activation and succeeds. Generous budget: covers, worst case, a
			// lease-expiry reclaim. Transient errors while the survivor settles are
			// swallowed so the poll keeps trying.
			await expect
				.poll(
					async () => {
						try {
							const fresh = (await survivor.workflows.getExecutions(workflowId, 50)).find(
								(execution) => !idsBeforeStop.has(execution.id) && execution.mode === 'trigger',
							);
							return fresh?.status ?? null;
						} catch {
							return null;
						}
					},
					{ timeout: 90_000, intervals: [2_000] },
				)
				.toBe('success');
		});
	},
);
