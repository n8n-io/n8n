import { expectScheduleTriggerFires } from './schedule-trigger-helpers';
import { makeScheduleTriggerWorkflow } from './schedule-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

const SCHEDULE_INTERVAL_SECONDS = 2;

// Grace comfortably above the executor interval and materialization window
// (both required by `warnOnMisfireGrace`), but well under the backlog this test
// backdates past it.
test.use({
	capability: {
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_MATERIALIZATION_INTERVAL: '1',
			N8N_SCHEDULER_MATERIALIZATION_WINDOW: '2',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
			N8N_SCHEDULER_MISFIRE_GRACE: '3',
		},
	},
});

test.describe(
	'Schedule Trigger misfire policy: coalesce',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('collapses a backlog into a single catch-up run instead of firing every missed tick', async ({
			api,
		}) => {
			const workflow = makeScheduleTriggerWorkflow(SCHEDULE_INTERVAL_SECONDS);
			const workflowId = await expectScheduleTriggerFires(api, workflow);

			const createdWorkflow = await api.workflows.getWorkflow(workflowId);
			const triggerNode = createdWorkflow.nodes.find(
				(node) => node.type === 'n8n-nodes-base.scheduleTrigger',
			);
			expect(
				triggerNode,
				'schedule trigger node should exist on the created workflow',
			).toBeDefined();

			// Ten missed ticks, all past the 3s grace: a materializer walking the plain
			// schedule (no misfire policy) would fire all ten back to back.
			await api.backdateScheduledJob(workflowId, triggerNode!.id, 20);

			const idsBeforeCatchUp = new Set(
				(await api.workflows.getExecutions(workflowId, 50)).map((execution) => execution.id),
			);

			// Long enough for the catch-up run plus a couple of the schedule's own
			// on-time ticks to land, short enough that ten missed ticks firing
			// individually would clearly exceed it.
			await new Promise((resolve) => setTimeout(resolve, 8_000));

			const firedSince = (await api.workflows.getExecutions(workflowId, 50)).filter(
				(execution) => !idsBeforeCatchUp.has(execution.id) && execution.mode === 'trigger',
			);

			// At least one: the catch-up run was not silently dropped.
			expect(firedSince.length).toBeGreaterThanOrEqual(1);
			// Far fewer than the ten missed instants: the backlog was collapsed, not replayed.
			expect(firedSince.length).toBeLessThanOrEqual(5);
		});
	},
);
