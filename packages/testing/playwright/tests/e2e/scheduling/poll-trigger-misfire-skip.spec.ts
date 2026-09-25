import { expectPollTriggerFires } from './poll-trigger-helpers';
import { makeCronPollTriggerWorkflow } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			N8N_SCHEDULER_MATERIALIZATION_INTERVAL: '1',
			N8N_SCHEDULER_MATERIALIZATION_WINDOW: '2',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
			N8N_SCHEDULER_MISFIRE_GRACE: '3',
		},
	},
});

test.describe(
	'Poll Trigger misfire policy: skip',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('drops a missed backlog instead of firing a stale poll', async ({ api, services }) => {
			// Six hours between ticks: whatever fires in this test's short observation
			// window can only be the backdated backlog, never the schedule's own next tick.
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				(path) => makeCronPollTriggerWorkflow(path, '0 0 */6 * * *'),
				{ itemsAfterSeedPoll: [{ id: 1 }, { id: 2 }] },
			);

			// A day of backlog, all past the 3s grace: a materializer walking the plain
			// schedule (no misfire policy) would record and fire it.
			await api.backdateScheduledJob(workflowId, nodeId, 86_400);

			const idsBeforeSweep = new Set(
				(await api.workflows.getExecutions(workflowId, 50)).map((execution) => execution.id),
			);

			// Long enough for several materializer/executor ticks to have run.
			await new Promise((resolve) => setTimeout(resolve, 8_000));

			const firedSince = (await api.workflows.getExecutions(workflowId, 50)).filter(
				(execution) => !idsBeforeSweep.has(execution.id) && execution.mode === 'trigger',
			);

			expect(firedSince).toHaveLength(0);
		});
	},
);
