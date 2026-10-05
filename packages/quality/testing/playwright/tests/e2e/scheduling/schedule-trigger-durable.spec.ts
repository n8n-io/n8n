import { sleep } from '@n8n/utils/sleep';

import { expectScheduleTriggerFires } from './schedule-trigger-helpers';
import {
	makeScheduleTriggerWorkflow,
	makeCronScheduleTriggerWorkflow,
} from './schedule-trigger-workflow';
import { durableScheduleTestConfig } from './scheduler-test-config';
import { test, expect } from '../../../fixtures/base';

// Durable scheduler path. Both flags are required: with only
// `N8N_SCHEDULER_ENABLED` the job registrar early-returns and activation falls
// back to the legacy in-memory timer. With both set the registrar intercepts and
// the in-memory schedule is discarded.
//
// A successful trigger-mode execution does not by itself prove durable-vs-legacy
// (both emit `mode:trigger`); the restart-continuity spec distinguishes them.
test.use(durableScheduleTestConfig);

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

		test('should execute each scheduled tick once', async ({ api }) => {
			// The claim and fire-time guards must prevent duplicate executions.
			const workflowId = await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());

			// The delta excludes executions created during initial detection.
			const countBefore = (await api.workflows.getExecutions(workflowId, 100)).length;
			await sleep(10_000);
			const countAfter = (await api.workflows.getExecutions(workflowId, 100)).length;
			const fired = countAfter - countBefore;

			// This range allows for scheduling jitter around five expected executions.
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
