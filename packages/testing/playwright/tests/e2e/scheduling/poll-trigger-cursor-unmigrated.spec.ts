import {
	clearStaticDataAndPoll,
	expectNewTriggerExecution,
	expectPollTriggerFires,
	readNodeStaticData,
	fetchTriggerExecutionIds,
} from './poll-trigger-helpers';
import { makePollTriggerWorkflow, POLL_TRIGGER_NODE_NAME } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			N8N_SCHEDULER_MATERIALIZATION_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

test.describe(
	'Poll Trigger cursor (unmigrated) @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should advance the cursor in the workflow static data', async ({ api, services }) => {
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
				{ itemsAfterSeedPoll: [{ id: 1 }, { id: 2 }] },
			);

			await expect
				.poll(async () => await readNodeStaticData(api, workflowId, POLL_TRIGGER_NODE_NAME), {
					timeout: 15_000,
				})
				.toEqual({ lastItemId: 1 });
			expect(await api.getPollerCursor(workflowId, nodeId)).toBeNull();

			const afterSeedPoll = await fetchTriggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);
			await expectNewTriggerExecution(api, workflowId, afterSeedPoll);

			await expect
				.poll(async () => await readNodeStaticData(api, workflowId, POLL_TRIGGER_NODE_NAME), {
					timeout: 15_000,
				})
				.toEqual({ lastItemId: 2 });
			expect(await api.getPollerCursor(workflowId, nodeId)).toBeNull();
		});

		test('should restart from the first item when the workflow static data is cleared', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
			);

			const afterSeedPoll = await fetchTriggerExecutionIds(api, workflowId);
			await clearStaticDataAndPoll(api, workflowId, nodeId);

			await expectNewTriggerExecution(api, workflowId, afterSeedPoll);
			expect(await readNodeStaticData(api, workflowId, POLL_TRIGGER_NODE_NAME)).toEqual({
				lastItemId: 1,
			});
			expect(await api.getPollerCursor(workflowId, nodeId)).toBeNull();
		});
	},
);
