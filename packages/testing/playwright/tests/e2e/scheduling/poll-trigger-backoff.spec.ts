import {
	expectNewTriggerExecution,
	expectNewTriggerExecutionFails,
	expectNoNewTriggerExecution,
	expectPollTriggerFires,
	programPollResponse,
	triggerExecutionIds,
} from './poll-trigger-helpers';
import { makePollTriggerWorkflow } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

const TRANSIENT_BACKOFF_FLOOR_MS = 5_000;
const RECOVERY_SAFETY_MARGIN_MS = 1_500;
const SKIP_CHECK_SAFETY_MARGIN_MS = 500;
const MIN_SKIP_CHECK_WINDOW_MS = 1_000;

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
		test('should skip the tick due while backing off, then recover once the window elapses', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId, path } = await expectPollTriggerFires(
				api,
				services.proxy,
				makePollTriggerWorkflow,
				{ errorAfterSeedPoll: { statusCode: 500 } },
			);

			const afterSeedPoll = await triggerExecutionIds(api, workflowId);
			const failureIssuedAt = Date.now();
			await api.fireScheduledJobsNow(workflowId, nodeId);
			await expectNewTriggerExecutionFails(api, workflowId, afterSeedPoll);

			const failureState = await api.getPollerFailureState(workflowId, nodeId);
			expect(failureState.consecutiveErrors).toBe(1);
			expect(failureState.backoffUntil).not.toBeNull();
			expect(new Date(failureState.backoffUntil as string).getTime()).toBeGreaterThan(Date.now());

			const afterFailedPoll = await triggerExecutionIds(api, workflowId);
			await api.fireScheduledJobsNow(workflowId, nodeId);

			const elapsedSinceFailure = Date.now() - failureIssuedAt;
			const skipCheckWindowMs = Math.max(
				MIN_SKIP_CHECK_WINDOW_MS,
				TRANSIENT_BACKOFF_FLOOR_MS - elapsedSinceFailure - SKIP_CHECK_SAFETY_MARGIN_MS,
			);
			await expectNoNewTriggerExecution(api, workflowId, afterFailedPoll, skipCheckWindowMs);
			expect(await services.proxy.wasRequestMade({ method: 'GET', path }, 2)).toBe(true);

			const elapsedSinceSkipCheck = Date.now() - failureIssuedAt;
			const remainingUntilRecovery = Math.max(
				0,
				TRANSIENT_BACKOFF_FLOOR_MS + RECOVERY_SAFETY_MARGIN_MS - elapsedSinceSkipCheck,
			);
			await new Promise((resolve) => setTimeout(resolve, remainingUntilRecovery));

			await programPollResponse(services.proxy, path, [{ id: 2 }]);
			await api.fireScheduledJobsNow(workflowId, nodeId);
			await expectNewTriggerExecution(api, workflowId, afterFailedPoll);

			expect(await api.getPollerCursor(workflowId, nodeId)).toEqual({ lastItemId: 2 });

			const recoveredState = await api.getPollerFailureState(workflowId, nodeId);
			expect(recoveredState.consecutiveErrors).toBe(0);
			expect(recoveredState.backoffUntil).toBeNull();
		});
	},
);
