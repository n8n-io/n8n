/**
 * Worker shutdown — suspend-on-shutdown e2e.
 *
 * A queue-mode worker that gets SIGTERM while a production execution runs
 * parks it at the next node boundary (N8N_WORKER_SUSPEND_EXECUTIONS_ON_SHUTDOWN).
 * The execution is persisted as `waiting`, the WaitTracker on main re-enqueues
 * it, and the restarted worker finishes it. Every node runs exactly once.
 */

import flatted from 'flatted';
import { nanoid } from 'nanoid';

import type { N8NStack } from 'n8n-containers/stack';

import { expect, test } from '../../../fixtures/base';
import { TestError } from '../../../Types';

const SLOW_NODE_MS = 6_000;
/** Docker sends SIGTERM and waits this long before SIGKILL; the worker drains within it. */
const RESTART_GRACE_S = 30;
/** The WaitTracker polls every 60s, then the restarted worker needs to boot and run the rest. */
const RESUME_TIMEOUT_MS = 150_000;

test.use({
	capability: {
		workers: 1,
		env: {
			N8N_WORKER_SUSPEND_EXECUTIONS_ON_SHUTDOWN: 'true',
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(RESTART_GRACE_S),
			TEST_ISOLATION: 'worker-suspend-on-shutdown',
		},
	},
});

function workerContainer(stack: N8NStack) {
	const [worker] = stack.findContainers(/-n8n-worker-1$/);
	if (!worker) throw new TestError('Worker container not found');
	return worker;
}

const slowCode = `await new Promise((resolve) => setTimeout(resolve, ${SLOW_NODE_MS}));\nreturn $input.all();`;

test.describe(
	'Worker suspend on shutdown @mode:queue',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test.setTimeout(RESUME_TIMEOUT_MS + 60_000);

		test('parks a running execution at a node boundary and resumes it after the worker restarts', async ({
			api,
			n8nContainer,
		}) => {
			const path = `suspend-${nanoid()}`;
			const { workflowId, createdWorkflow, webhookPath } =
				await api.workflows.createWorkflowFromDefinition(
					{
						name: `Suspend on shutdown ${nanoid()}`,
						nodes: [
							{
								id: 'webhook',
								name: 'Webhook',
								type: 'n8n-nodes-base.webhook',
								typeVersion: 2,
								position: [0, 0],
								parameters: { httpMethod: 'POST', path, responseMode: 'onReceived', options: {} },
							},
							{
								id: 'slow1',
								name: 'Slow 1',
								type: 'n8n-nodes-base.code',
								typeVersion: 2,
								position: [200, 0],
								parameters: { jsCode: slowCode },
							},
							{
								id: 'mark1',
								name: 'Mark 1',
								type: 'n8n-nodes-base.noOp',
								typeVersion: 1,
								position: [400, 0],
								parameters: {},
							},
							{
								id: 'slow2',
								name: 'Slow 2',
								type: 'n8n-nodes-base.code',
								typeVersion: 2,
								position: [600, 0],
								parameters: { jsCode: slowCode },
							},
							{
								id: 'mark2',
								name: 'Mark 2',
								type: 'n8n-nodes-base.noOp',
								typeVersion: 1,
								position: [800, 0],
								parameters: {},
							},
						],
						connections: {
							Webhook: { main: [[{ node: 'Slow 1', type: 'main', index: 0 }]] },
							'Slow 1': { main: [[{ node: 'Mark 1', type: 'main', index: 0 }]] },
							'Mark 1': { main: [[{ node: 'Slow 2', type: 'main', index: 0 }]] },
							'Slow 2': { main: [[{ node: 'Mark 2', type: 'main', index: 0 }]] },
						},
					},
					{ webhookPrefix: 'suspend' },
				);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, { method: 'POST' });
			expect(response.ok()).toBe(true);

			// The worker is inside "Slow 1" once the execution is running.
			const running = await api.workflows.waitForWorkflowStatus(workflowId, 'running', 30_000);

			// SIGTERM mid-node: the worker finishes "Slow 1", parks the run before "Mark 1" and exits.
			await workerContainer(n8nContainer).restart({ timeout: RESTART_GRACE_S });

			const parked = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 60_000);
			expect(parked.id).toBe(running.id);

			const finished = await api.workflows.waitForWorkflowStatus(
				workflowId,
				'success',
				RESUME_TIMEOUT_MS,
			);
			expect(finished.id).toBe(running.id);

			const execution = await api.workflows.getExecution(running.id);
			const { resultData } = flatted.parse(execution.data);
			const runs = Object.fromEntries(
				Object.entries(resultData.runData).map(([node, data]) => [
					node,
					(data as unknown[]).length,
				]),
			);
			expect(runs).toEqual({ Webhook: 1, 'Slow 1': 1, 'Mark 1': 1, 'Slow 2': 1, 'Mark 2': 1 });
		});
	},
);
