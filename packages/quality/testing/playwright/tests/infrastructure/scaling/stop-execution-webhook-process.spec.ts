import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { readProcessInternals } from '../../../utils/process-internals';

// A dedicated webhook process enqueues the job, so the main holds no Bull job handle for it.
// The stop request then reaches the worker only through the `stop-execution` broadcast. The
// worker must free the job it tracks for that execution, which is what the workers panel lists.
test.use({ capability: { webhooks: 1, workers: 1 } });

// Long enough to outlast the stop and the assertion, short enough to bound a failing run.
const CODE_NODE_RUN_SECONDS = 60;

const slowWebhookWorkflow = (path: string): Partial<IWorkflowBase> => ({
	name: `Stop from main ${nanoid()}`,
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
			id: 'code',
			name: 'Sleep',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [220, 0],
			parameters: {
				jsCode: [
					`const end = Date.now() + ${CODE_NODE_RUN_SECONDS * 1000};`,
					'while (Date.now() < end) {',
					'\tawait new Promise((resolve) => setTimeout(resolve, 200));',
					'}',
					'return $input.all();',
				].join('\n'),
			},
		},
	],
	connections: { Webhook: { main: [[{ node: 'Sleep', type: 'main', index: 0 }]] } },
});

test.describe(
	'Stop execution enqueued by a webhook process @mode:queue',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should free the running job on the worker', async ({ api, processUrls }) => {
			const worker = processUrls.find(({ role }) => role === 'worker');
			const webhookProcess = processUrls.find(({ role }) => role === 'webhook');
			expect(worker, 'a worker process should be part of the stack').toBeDefined();
			expect(webhookProcess, 'a webhook process should be part of the stack').toBeDefined();
			const readWorkerRunningJobs = async () => {
				const [reading] = await readProcessInternals([worker!]);
				return reading.internals.collections['scaling.runningJobs'];
			};

			const { workflowId, createdWorkflow, webhookPath } =
				await api.workflows.createWorkflowFromDefinition(slowWebhookWorkflow(`stop-${nanoid()}`), {
					webhookPrefix: 'stop',
				});
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// The webhook process enqueues the job, so the main never holds a handle to it.
			const response = await api.webhooks.trigger(`${webhookProcess!.url}/webhook/${webhookPath}`, {
				method: 'POST',
				maxNotFoundRetries: 20,
			});
			expect(response.ok()).toBe(true);

			await expect.poll(readWorkerRunningJobs, { timeout: 30_000 }).toBe(1);

			const [execution] = await api.workflows.getExecutions(workflowId);
			expect(execution.status).toBe('running');

			const stopped = await api.workflows.stopExecution(execution.id);
			expect(stopped.status).toBe('canceled');

			await expect.poll(readWorkerRunningJobs, { timeout: 15_000 }).toBe(0);

			const after = await api.workflows.getExecution(execution.id);
			expect(after.status).toBe('canceled');
		});
	},
);
