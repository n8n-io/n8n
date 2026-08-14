import { expectScheduleTriggerFires } from './schedule-trigger-helpers';
import { makeScheduleTriggerWorkflow } from './schedule-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

// The durable job is DB state, written on activation and independent of process
// lifetime. After a main restart the sweep reclaims it and keeps firing with no
// re-activation. This is the property the legacy in-memory timer cannot offer,
// and it is only observable in container mode (needs a real process restart).
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
	'Schedule Trigger restart continuity (durable scheduler)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should keep firing after a main restart without re-activation', async ({
			api,
			mainUrls,
			n8nContainer,
		}) => {
			// Single-main only. Under a cluster a surviving main keeps ticking while
			// one restarts, so the fresh execution would appear regardless of whether
			// restart recovery works, making the test pass vacuously. Cluster
			// crash-continuity is covered by the multi-main spec instead.
			// eslint-disable-next-line playwright/no-skipped-test -- runtime topology guard, not a disabled test
			test.skip(mainUrls.length >= 2, 'single-main only: cluster continuity is covered elsewhere');
			// Needs a real container to restart; skipped when running against a
			// pre-started local instance (n8nContainer is null there).
			// eslint-disable-next-line playwright/no-skipped-test -- runtime guard, not a disabled test
			test.skip(!n8nContainer, 'container-only: requires a restartable n8n container');

			const workflowId = await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());

			// Snapshot the executions that exist BEFORE the restart. Continuity is
			// only proven by an execution whose id is not in this set firing after
			// the restart; `waitForExecution`'s recency fallback would otherwise
			// re-match a pre-restart execution when recovery takes under 5s.
			const idsBeforeRestart = new Set(
				(await api.workflows.getExecutions(workflowId, 50)).map((execution) => execution.id),
			);

			// Restart the main container in place (same writable layer + DB).
			const [main] = n8nContainer.findContainers(/-n8n(-main-\d+)?$/);
			expect(main, 'main n8n container should be found').toBeDefined();
			await main.restart();

			// Wait until the API is serving again after the restart.
			await expect
				.poll(
					async () => {
						try {
							return await api.isHealthy('readiness');
						} catch {
							return false;
						}
					},
					{ timeout: 60_000, intervals: [1_000] },
				)
				.toBe(true);

			// A brand-new trigger execution (not in the pre-restart set) appears
			// without re-activating the workflow, and it succeeds.
			await expect
				.poll(
					async () => {
						const fresh = (await api.workflows.getExecutions(workflowId, 50)).find(
							(execution) => !idsBeforeRestart.has(execution.id) && execution.mode === 'trigger',
						);
						return fresh?.status ?? null;
					},
					{ timeout: 60_000, intervals: [1_000] },
				)
				.toBe('success');
		});
	},
);
