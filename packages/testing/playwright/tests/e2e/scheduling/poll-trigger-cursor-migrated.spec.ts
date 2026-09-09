import {
	clearStaticDataAndPoll,
	expectNewTriggerExecution,
	expectNoNewTriggerExecution,
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

			const afterSeedPoll = await fetchTriggerExecutionIds(api, workflowId);
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

			const afterSeedPoll = await fetchTriggerExecutionIds(api, workflowId);
			await clearStaticDataAndPoll(api, workflowId, nodeId);

			await expectNoNewTriggerExecution(api, workflowId, afterSeedPoll);
			expect(await readNodeStaticData(api, workflowId, POLL_TRIGGER_NODE_NAME)).toBeNull();
			expect(await api.getPollerCursor(workflowId, nodeId)).toEqual({ lastItemId: 1 });
		});

		// `fireScheduledJobsNow` backdates the job's `nextRunAt` without waiting for the
		// poll to run, so firing it twice back-to-back is the closest this gets to racing
		// two cursor commits; the scheduler still serializes which pass claims the job, so
		// the two `advanceCursor` writes never actually interleave. What it proves: neither
		// tick's item is dropped, and the cursor lands on the higher id, not an
		// intermediate value.
		test('should not lose either poll when two ticks are fired back-to-back', async ({
			api,
			services,
		}) => {
			// The item both ticks below will race to report as new: registered as the one
			// unlimited wave after the seed, since MockServer expectations only stay ordered
			// while the earlier one is one-shot.
			const { workflowId, nodeId } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
				{ itemsAfterSeedPoll: [{ id: 2 }] },
			);

			await expect
				.poll(async () => await api.getPollerCursor(workflowId, nodeId), { timeout: 15_000 })
				.toEqual({ lastItemId: 1 });

			const afterSeedPoll = await fetchTriggerExecutionIds(api, workflowId);

			await Promise.all([
				api.fireScheduledJobsNow(workflowId, nodeId),
				api.fireScheduledJobsNow(workflowId, nodeId),
			]);

			await expect
				.poll(async () => await api.getPollerCursor(workflowId, nodeId), { timeout: 20_000 })
				.toEqual({ lastItemId: 2 });

			// Only one of the two concurrent ticks should have found item 2 new; the other
			// must see it already reflected in the cursor and emit nothing.
			await expect
				.poll(async () => (await fetchTriggerExecutionIds(api, workflowId)).size, {
					timeout: 20_000,
				})
				.toBe(afterSeedPoll.size + 1);
		});
	},
);
