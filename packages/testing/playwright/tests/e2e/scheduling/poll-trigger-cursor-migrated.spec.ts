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

		// `fireScheduledJobsNow` only backdates the job's `nextRunAt`
		// (packages/cli/src/controllers/e2e.controller.ts) - it doesn't wait for the
		// resulting poll to run - so firing it twice back-to-back is the closest this
		// harness gets to racing two commits of the same node's cursor. The scheduler's
		// `claimDue` (SKIP LOCKED / BEGIN IMMEDIATE, see
		// packages/@n8n/db/src/repositories/scheduled-job.repository.ts) still serializes
		// which pass actually claims and runs the job, so this doesn't force the two
		// `advanceCursor` transactions to interleave - that would need a lower-level test
		// against the repository/service directly. What it does prove end-to-end: neither
		// tick's item is silently dropped, and the cursor lands on the higher of the two
		// item ids rather than an intermediate or corrupted value.
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

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);

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
				.poll(async () => (await triggerExecutionIds(api, workflowId)).size, { timeout: 20_000 })
				.toBe(afterSeedPoll.size + 1);
		});
	},
);
