import {
	expectNewTriggerExecution,
	expectPollTriggerFires,
	fetchTriggerExecutionIds,
} from './poll-trigger-helpers';
import { makePollTriggerWorkflow, makeCronPollTriggerWorkflow } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

// All three scheduler flags are required: with only `N8N_SCHEDULER_ENABLED` set,
// activation falls back to the legacy in-memory poll cron; with all three, the
// poll trigger runs as a `scheduled_job` row instead.
test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			N8N_SCHEDULER_SWEEP_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

test.describe(
	'Poll Trigger (durable scheduler) @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fire the activation-time seed poll and provision a durable job', async ({
			api,
			services,
		}) => {
			// Only proves the seed poll that runs inline on activation; the durable
			// claim/dispatch path is exercised separately below.
			await expectPollTriggerFires(api, services.proxy, makePollTriggerWorkflow);
		});

		test('should fire a poll trigger driven by a raw cron expression', async ({
			api,
			services,
		}) => {
			// Cron variant: exercises the `custom` mode provisioning branch.
			await expectPollTriggerFires(api, services.proxy, makeCronPollTriggerWorkflow);
		});

		test('should dispatch a scheduled tick through materialisation and execution', async ({
			api,
			services,
		}) => {
			// The seed poll above runs inline on activation, bypassing the scheduler.
			// `fireScheduledJobsNow` forces the job's `nextRunAt` to now so the 1s
			// sweep configured above claims it, instead of waiting out the real
			// cron interval.
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
				{ itemsAfterSeedPoll: [{ id: 1 }, { id: 2 }] },
			);

			const afterSeedPoll = await fetchTriggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);

			await expectNewTriggerExecution(api, workflowId, afterSeedPoll);
		});

		test('should remove the durable job when the workflow is deactivated', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
			);

			expect(await api.countScheduledJobs(workflowId, nodeId)).toBe(1);

			await api.workflows.deactivate(workflowId);

			// Deactivation removes the row synchronously as part of the request, so
			// this needs no wait: a stray row would be visible immediately.
			expect(await api.countScheduledJobs(workflowId, nodeId)).toBe(0);
		});
	},
);
