import type { IWorkflowBase } from 'n8n-workflow';

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
			n8nContainer,
		}) => {
			// Needs a real container to restart; skipped when running against a
			// pre-started local instance (n8nContainer is null there).
			// eslint-disable-next-line playwright/no-skipped-test -- runtime guard, not a disabled test
			test.skip(!n8nContainer, 'container-only: requires a restartable n8n container');

			const wf = makeScheduleTriggerWorkflow(5);
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
			await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');

			// Snapshot the executions that exist BEFORE the restart. Continuity is
			// only proven by an execution whose id is not in this set firing after
			// the restart — waitForExecution's recency fallback would otherwise
			// re-match a pre-restart execution when recovery takes under 5s.
			const idsBeforeRestart = new Set(
				(await api.workflows.getExecutions(workflowId, 50)).map((execution) => execution.id),
			);

			// Restart the single main container in place (same writable layer + DB).
			const [main] = n8nContainer.findContainers(/-n8n$/);
			expect(main, 'main n8n container should be found').toBeDefined();
			await main.restart();

			// Wait until the API is serving again after the restart.
			await expect
				.poll(
					async () => {
						try {
							const response = await api.request.get('/healthz/readiness');
							return response.status();
						} catch {
							return 0;
						}
					},
					{ timeout: 60_000, intervals: [1_000] },
				)
				.toBe(200);

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
