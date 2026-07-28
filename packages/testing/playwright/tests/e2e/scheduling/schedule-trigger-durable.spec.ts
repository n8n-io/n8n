import { expectScheduleTriggerFires } from './schedule-trigger-helpers';
import {
	makeScheduleTriggerWorkflow,
	makeCronScheduleTriggerWorkflow,
} from './schedule-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

const sleep = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

// Durable scheduler path. Both flags are required: with only
// `N8N_SCHEDULER_ENABLED` the job registrar early-returns and activation falls
// back to the legacy in-memory timer. With both set the registrar intercepts and
// the in-memory schedule is discarded.
//
// A successful trigger-mode execution does not by itself prove durable-vs-legacy
// (both emit `mode:trigger`); the restart-continuity spec distinguishes them.
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
			await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());
		});

		test('should not fire once per sweep when the tick is slower than the sweep', async ({
			api,
		}) => {
			// Sweep and executor run every 1s but the schedule ticks every 2s. The
			// dedupe guards (row claim + guarded fire-time write) must collapse the
			// intervening sweeps so a single tick yields a single execution, not one
			// per second.
			const workflowId = await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());

			// Count the delta over a fixed window rather than the absolute total:
			// expectScheduleTriggerFires already polled for up to 60s, so ticks
			// accrued during detection must not count against the window's budget.
			const countBefore = (await api.workflows.getExecutions(workflowId, 100)).length;
			await sleep(10_000);
			const countAfter = (await api.workflows.getExecutions(workflowId, 100)).length;
			const fired = countAfter - countBefore;

			// ~5 expected over 10s at a 2s tick. A per-sweep double-fire (once every
			// 1s) would land near ~10. Tolerant band absorbs scheduling jitter.
			expect(fired).toBeGreaterThanOrEqual(2);
			expect(fired).toBeLessThanOrEqual(8);
		});

		test('should stop firing after the workflow is deactivated', async ({ api }) => {
			const workflowId = await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());

			await api.workflows.deactivate(workflowId);

			// Let any in-flight tick settle, then snapshot and hold across several
			// intervals. Deactivation removes the scheduled job (no read path exists,
			// so this is proven indirectly by the count staying flat).
			await sleep(2_000);
			const countAfterDeactivate = (await api.workflows.getExecutions(workflowId, 50)).length;

			await sleep(6_000);
			const countAtEnd = (await api.workflows.getExecutions(workflowId, 50)).length;

			expect(countAtEnd).toBe(countAfterDeactivate);
		});

		test('should fire a Schedule Trigger driven by a raw cron expression', async ({ api }) => {
			// Cron variant: exercises the `cronExpression` provisioning branch.
			await expectScheduleTriggerFires(api, makeCronScheduleTriggerWorkflow());
		});
	},
);
