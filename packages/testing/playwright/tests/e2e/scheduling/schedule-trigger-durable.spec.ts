import type { IWorkflowBase } from 'n8n-workflow';

import {
	makeScheduleTriggerWorkflow,
	makeCronScheduleTriggerWorkflow,
} from './schedule-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

const sleep = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

// Durable scheduler path. Both flags are required: N8N_SCHEDULER_ENABLED alone
// leaves activation on the legacy in-memory timer, so without
// N8N_USE_WORKFLOW_PUBLICATION_SERVICE the schedule-trigger job registrar
// early-returns and activation falls back to the legacy path. With both set the
// registrar intercepts and the in-memory schedule is discarded, so these tests
// exercise the durable path. Note: a successful trigger-mode execution does not
// by itself prove durable-vs-legacy (both emit mode:trigger); the restart-
// continuity spec is what actually distinguishes the two engines.
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
	'Schedule Trigger (durable scheduler)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fire an activated Schedule Trigger through the durable scheduler', async ({
			api,
		}) => {
			const wf = makeScheduleTriggerWorkflow();
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Generous budget: depends on sweep + executor cadence plus the interval.
			const execution = await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');
			expect(execution.status).toBe('success');
		});

		test('should not fire once per sweep when the tick is slower than the sweep', async ({
			api,
		}) => {
			// Sweep and executor run every 1s but the schedule ticks every 5s. The
			// dedupe guards (row claim + guarded fire-time write) must collapse the
			// intervening sweeps so a single 5s tick yields a single execution, not
			// one per second.
			const wf = makeScheduleTriggerWorkflow(5);
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
			await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');

			// Observe a fixed window of roughly four 5s ticks.
			await sleep(22_000);
			const executions = await api.workflows.getExecutions(workflowId, 50);

			// ~4 expected over 22s at a 5s tick. A per-sweep double-fire would land
			// near ~20. Tolerant band absorbs scheduling jitter either side.
			expect(executions.length).toBeGreaterThanOrEqual(2);
			expect(executions.length).toBeLessThanOrEqual(8);
		});

		test('should stop firing after the workflow is deactivated', async ({ api }) => {
			const wf = makeScheduleTriggerWorkflow(5);
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
			await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');

			await api.workflows.deactivate(workflowId);

			// Let any in-flight tick settle, then snapshot and hold across several
			// intervals. Deactivation removes the scheduled job (no read path exists,
			// so this is proven indirectly by the count staying flat).
			await sleep(3_000);
			const countAfterDeactivate = (await api.workflows.getExecutions(workflowId, 50)).length;

			await sleep(12_000);
			const countAtEnd = (await api.workflows.getExecutions(workflowId, 50)).length;

			expect(countAtEnd).toBe(countAfterDeactivate);
		});

		test('should fire a Schedule Trigger driven by a raw cron expression', async ({ api }) => {
			const wf = makeCronScheduleTriggerWorkflow('*/5 * * * * *');
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const execution = await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');
			expect(execution.status).toBe('success');
		});
	},
);
