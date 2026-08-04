import {
	clearStaticDataAndReactivate,
	expectNewTriggerExecution,
	expectNoNewTriggerExecution,
	expectPollTriggerFires,
	readNodeStaticData,
	triggerExecutionIds,
} from './poll-trigger-helpers';
import { makePollTriggerWorkflow, POLL_TRIGGER_NODE_NAME } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_POLLER_DURABLE_CURSORS_ENABLED: 'true',
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			N8N_SCHEDULER_MATERIALIZATION_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

test.describe(
	'Poll Trigger cursor (migrated) @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should emit an item past the cursor and advance it in poller_state', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
				{ itemsAfterSeedPoll: [{ id: 1 }, { id: 2 }] },
			);

			await expect
				.poll(async () => await api.getPollerCursor(workflowId, nodeId), { timeout: 15_000 })
				.toEqual({ lastItemId: 1 });

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);

			await expectNewTriggerExecution(api, workflowId, afterSeedPoll);

			await expect
				.poll(async () => await api.getPollerCursor(workflowId, nodeId), { timeout: 15_000 })
				.toEqual({ lastItemId: 2 });
		});

		test('should keep the cursor when the workflow static data is cleared', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
			);

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);
			await clearStaticDataAndReactivate(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);

			// Covers both polls that run with the static data gone: the reactivation
			// seed poll and the scheduled tick forced above.
			await expectNoNewTriggerExecution(api, workflowId, afterSeedPoll);
			expect(await readNodeStaticData(api, workflowId, POLL_TRIGGER_NODE_NAME)).toBeNull();
			expect(await api.getPollerCursor(workflowId, nodeId)).toEqual({ lastItemId: 1 });
		});
	},
);
