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
			N8N_SCHEDULER_SWEEP_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

test.describe(
	'Poll Trigger cursor (durable) @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should emit an item the cursor has not reached yet', async ({ api, services }) => {
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
				{ itemsAfterSeedPoll: [{ id: 1 }, { id: 2 }] },
			);

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);

			await expectNewTriggerExecution(api, workflowId, afterSeedPoll);
		});

		test('should not re-emit an item the committed cursor already covers', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
			);

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);

			await expectNoNewTriggerExecution(api, workflowId, afterSeedPoll);
		});

		test('should keep the cursor when the workflow static data is cleared', async ({
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

			await expectNoNewTriggerExecution(api, workflowId, afterSeedPoll);
			expect(await readNodeStaticData(api, workflowId, POLL_TRIGGER_NODE_NAME)).toBeNull();
		});
	},
);
