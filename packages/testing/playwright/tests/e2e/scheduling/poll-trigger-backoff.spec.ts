import {
	expectNewTriggerExecution,
	expectNoNewTriggerExecution,
	expectPollTriggerFires,
	programPollResponse,
	fetchTriggerExecutionIds,
} from './poll-trigger-helpers';
import { makePollTriggerWorkflow } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

const SKIP_CHECK_WINDOW_MS = 1_000;

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
	'Poll Trigger error backoff @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should skip the tick that falls inside the backoff window, then recover once it elapses', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId, path } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
				{ errorAfterSeedPoll: { statusCode: 500 } },
			);

			const afterSeedPoll = await fetchTriggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);
			await expectNewTriggerExecution(api, workflowId, afterSeedPoll, { expectedStatus: 'error' });

			const failureState = await api.getPollerFailureState(workflowId, nodeId);
			expect(failureState.consecutiveErrors).toBe(1);
			expect(failureState.backoffUntil).not.toBeNull();
			expect(new Date(failureState.backoffUntil as string).getTime()).toBeGreaterThan(Date.now());

			const afterFailedPoll = await fetchTriggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);
			await expectNoNewTriggerExecution(api, workflowId, afterFailedPoll, SKIP_CHECK_WINDOW_MS);
			expect(await services.proxy.wasRequestMade({ method: 'GET', path }, 2)).toBe(true);

			await programPollResponse(services.proxy, path, [{ id: 2 }]);
			await api.workflows.deactivate(workflowId);
			const { versionId } = await api.workflows.getWorkflow(workflowId);
			await api.workflows.activate(workflowId, versionId!);

			// Publication is processed asynchronously through an outbox, so the
			// registrar's reset doesn't land the instant activate() resolves.
			await expect
				.poll(async () => await api.getPollerFailureState(workflowId, nodeId), { timeout: 10_000 })
				.toMatchObject({ consecutiveErrors: 0, backoffUntil: null });

			await api.fireScheduledJobsNow(workflowId, nodeId);
			await expectNewTriggerExecution(api, workflowId, afterFailedPoll);

			expect(await api.getPollerCursor(workflowId, nodeId)).toEqual({ lastItemId: 2 });
		});
	},
);
