import { nanoid } from 'nanoid';

import { expectPollTriggerFires } from './poll-trigger-helpers';
import { makePollTriggerWorkflow, makeCronPollTriggerWorkflow } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

// Durable scheduler path for POLL triggers. Both flags are required: with only
// `N8N_SCHEDULER_ENABLED` the poll job registrar's `isActive()` gate stays
// false and activation falls back to the legacy in-memory poll cron. With all
// three set the registrar intercepts and the poll node's cron fires as
// `scheduled_job` rows instead.
test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_ENABLE_FOR_POLL_TRIGGERS: 'true',
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
			// This only proves the seed poll that `activatePollTrigger` runs inline
			// on a fresh provision; it does not touch the scheduler's claim/dispatch
			// path. See "should dispatch a scheduled tick" below for that proof.
			const path = `/${nanoid()}`;
			await expectPollTriggerFires(api, services.proxy, path, makePollTriggerWorkflow(path));
		});

		test('should fire a poll trigger driven by a raw cron expression', async ({
			api,
			services,
		}) => {
			// Cron variant: exercises the `custom` mode provisioning branch.
			const path = `/${nanoid()}`;
			await expectPollTriggerFires(api, services.proxy, path, makeCronPollTriggerWorkflow(path));
		});

		test('should dispatch a scheduled tick through materialisation and execution', async ({
			api,
			services,
		}) => {
			// The seed poll above runs inline during activation, bypassing the
			// scheduler entirely. This test proves the actual durable path: the
			// scheduler claims the due job, materialises a task, and
			// `PollTriggerTaskHandler` runs poll() and hands off to a real
			// execution. `fireScheduledJobsNow` forces the job's `nextRunAt` to now
			// so the next 1s sweep claims it — the everyMinute cron's own interval
			// isn't itself under test here, so there's no reason to wait it out.
			const path = `/${nanoid()}`;
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				path,
				makePollTriggerWorkflow(path),
			);

			await services.proxy.createGetExpectation(path, { items: [{ id: 2 }] });
			await api.fireScheduledJobsNow(workflowId, nodeId);

			const scheduledExecution = await api.workflows.waitForExecution(
				workflowId,
				15_000,
				'trigger',
			);
			expect(scheduledExecution.status).toBe('success');
		});

		test('should remove the durable job when the workflow is deactivated', async ({
			api,
			services,
		}) => {
			const path = `/${nanoid()}`;
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				path,
				makePollTriggerWorkflow(path),
			);

			expect(await api.countScheduledJobs(workflowId, nodeId)).toBe(1);

			await api.workflows.deactivate(workflowId);

			// Deactivation removes the row synchronously as part of the request, so
			// this needs no wait: a stray row would be visible immediately.
			expect(await api.countScheduledJobs(workflowId, nodeId)).toBe(0);
		});
	},
);
