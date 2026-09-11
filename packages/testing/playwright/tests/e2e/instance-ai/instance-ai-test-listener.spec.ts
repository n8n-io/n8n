import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

// Pinned so the recorded model calls keep pointing at the workflow the replay creates.
const TEST_LISTENER_WORKFLOW_ID = 'LstnWebhookTest1';

function webhookWorkflow(name: string, path: string): Partial<IWorkflowBase> {
	return {
		id: TEST_LISTENER_WORKFLOW_ID,
		name,
		active: false,
		nodes: [
			{
				id: 'webhook',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: path,
				parameters: { httpMethod: 'POST', path, options: {} },
			},
			{
				id: 'format',
				name: 'Format',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [240, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'greeting',
								name: 'greeting',
								value: '={{ "hello " + $json.body.name }}',
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Format', type: 'main', index: 0 }]] },
		},
		settings: {},
	};
}

test.describe(
	'Instance AI test listener @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('arms the webhook test URL, receives a real request, and reads back the execution', async ({
			n8n,
		}) => {
			const workflowName = 'Test Listener Webhook Workflow';
			const workflow = await n8n.api.workflows.createWorkflow(
				webhookWorkflow(workflowName, 'test-listener-intake'),
			);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				`Listen on the test URL of the existing workflow named "${workflowName}" (ID: ${workflow.id}) so I can send it one real request. Do not publish it, do not inject sample trigger data, and do not create a new workflow. When the request arrives, tell me the exact value of the "greeting" field the Format node produced.`,
			);

			// Listening goes through the same permission gate as a manual run.
			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmApproveButton().click();

			// The card carries the exact URL the listener answers on; the workflow stays unpublished.
			await expect(n8n.instanceAi.getTestListenerCard()).toBeVisible({ timeout: 120_000 });
			const url = (await n8n.instanceAi.getTestListenerUrl().innerText()).trim();
			expect(url).toContain('/webhook-test/');
			expect(url).toContain('test-listener-intake');

			const response = await n8n.api.webhooks.trigger(new URL(url).pathname, {
				method: 'POST',
				data: { name: 'Ada' },
			});
			expect(response.ok()).toBe(true);

			// The push event settles the card on its own. If it has not yet, the button does the
			// same thing the event does, so the test never depends on push timing.
			await n8n.instanceAi.confirmTestRequestSent();

			await n8n.instanceAi.waitForRunComplete(120_000);
			// The answer can quote the value more than once (prose and code), so match the first one.
			await expect(n8n.instanceAi.getAssistantMessageText(/hello Ada/).first()).toBeVisible();

			// The listener ran the workflow on the test URL, so it must still be unpublished.
			const after = await n8n.api.workflows.getWorkflow(workflow.id);
			expect(after.active).toBe(false);
		});
	},
);
