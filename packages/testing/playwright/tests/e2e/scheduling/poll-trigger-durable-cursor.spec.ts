import type { ProxyServer } from 'n8n-containers/services/proxy';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { makeCursorPollTriggerWorkflow } from './poll-trigger-workflow';
import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// `N8N_SCHEDULER_DURABLE_POLL_CURSORS_ENABLED` is the setting under test; it needs
// the scheduler and its poll-trigger handling on as well, since only a
// scheduler-dispatched poll reads a cursor.
test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			N8N_SCHEDULER_DURABLE_POLL_CURSORS_ENABLED: 'true',
			N8N_SCHEDULER_SWEEP_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

// One expectation for the whole test, programmed before activation so the inline
// seed poll is the first poll under test. The response never changes: what the
// node emits changes only because it resumes from its cursor. Re-programming the
// same path would register a second expectation rather than replace the first.
async function activateCursorPollTrigger(
	api: ApiHelpers,
	proxy: ProxyServer,
	items: Array<{ id: number }>,
) {
	const path = `/${nanoid()}`;
	await proxy.createGetExpectation(path, { items });

	const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
		makeCursorPollTriggerWorkflow(path).toJSON() as IWorkflowBase,
	);

	await api.workflows.activate(workflowId, createdWorkflow.versionId!);

	const execution = await api.workflows.waitForExecution(workflowId, 90_000, 'trigger');
	expect(execution.status).toBe('success');

	const triggerNode = createdWorkflow.nodes.find(
		(node) => node.type === 'n8n-nodes-base.e2eTestPollingTrigger',
	);
	if (!triggerNode) throw new Error('Poll trigger node not found in created workflow');

	return { workflowId, nodeId: triggerNode.id };
}

test.describe(
	'Poll Trigger durable cursors @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should store the cursor the poll staged, alongside the execution it produced', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId } = await activateCursorPollTrigger(api, services.proxy, [
				{ id: 1 },
				{ id: 2 },
			]);

			expect(await api.getPollerCursor(workflowId, nodeId)).toEqual({
				lastItemId: '2',
				polls: 1,
			});
		});

		test('should resume from the stored cursor rather than re-emitting the same window', async ({
			api,
			services,
		}) => {
			const { workflowId, nodeId } = await activateCursorPollTrigger(api, services.proxy, [
				{ id: 1 },
				{ id: 2 },
			]);

			const executionsAfterSeedPoll = (await api.workflows.getExecutions(workflowId, 50)).length;

			// Forces the job due now so the 1s sweep claims it, instead of waiting out
			// the real cron interval.
			await api.fireScheduledJobsNow(workflowId, nodeId);

			// A poll that resumed from the cursor finds nothing after item 2 and
			// produces no execution; one that lost it would re-emit both items. The
			// poll count advancing proves the poll ran rather than never firing.
			await expect
				.poll(async () => await api.getPollerCursor(workflowId, nodeId), { timeout: 30_000 })
				.toEqual({ lastItemId: '2', polls: 2 });

			expect((await api.workflows.getExecutions(workflowId, 50)).length).toBe(
				executionsAfterSeedPoll,
			);
		});
	},
);
