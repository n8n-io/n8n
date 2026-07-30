import {
	clearStaticDataAndReactivate,
	expectNewTriggerExecution,
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
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			N8N_SCHEDULER_SWEEP_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

test.describe(
	'Poll Trigger cursor (workflow static data) @capability:proxy',
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

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);
			await expectNewTriggerExecution(api, workflowId, afterSeedPoll);

			await expect
				.poll(async () => await readNodeStaticData(api, workflowId, POLL_TRIGGER_NODE_NAME), {
					timeout: 15_000,
				})
				.toEqual({ lastItemId: 2 });
		});

		test('should restart from the first item when the workflow static data is cleared', async ({
			api,
			services,
		}) => {
			const { workflowId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
			);

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);
			await clearStaticDataAndReactivate(api, workflowId);

			await expectNewTriggerExecution(api, workflowId, afterSeedPoll);
		});
	},
);
