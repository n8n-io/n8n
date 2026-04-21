import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

const chatTriggerNodes = [
	{
		parameters: { options: {} },
		id: 'chat-trigger-1',
		name: 'When chat message received',
		type: '@n8n/n8n-nodes-langchain.chatTrigger',
		typeVersion: 1.1,
		position: [0, 0] as [number, number],
	},
	{
		parameters: {
			assignments: {
				assignments: [
					{
						id: 'assign-1',
						name: 'text',
						value: '=Got: {{ $json.chatInput }}',
						type: 'string',
					},
				],
			},
			options: {},
		},
		id: 'set-1',
		name: 'Edit Fields',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [220, 0] as [number, number],
	},
];

const chatTriggerConnections = {
	'When chat message received': {
		main: [[{ node: 'Edit Fields', type: 'main' as const, index: 0 }]],
	},
};

test.describe(
	'Demo executable preview - Chat Trigger',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		test('hides execute button and exposes Open chat that opens logs panel', async ({
			n8n,
			api,
		}) => {
			// Create the workflow via API so it exists in the database
			const workflow = await api.workflows.createWorkflow({
				name: 'Chat Trigger Preview',
				nodes: chatTriggerNodes,
				connections: chatTriggerConnections,
			});

			await n8n.demo.goto({ canExecute: true });
			await n8n.demo.importWorkflow({
				...workflow,
				nodes: chatTriggerNodes,
				connections: chatTriggerConnections,
			});

			await expect(n8n.canvas.nodeByName('When chat message received')).toBeVisible();

			await expect(n8n.canvas.getExecuteWorkflowButton()).toBeHidden();
			await expect(n8n.canvas.getOpenChatButton()).toBeVisible();

			await n8n.canvas.getOpenChatButton().click();

			await expect(n8n.canvas.getChatPanel()).toBeVisible();
			await expect(n8n.canvas.getHideChatButton()).toBeVisible();

			// Send a chat message and verify execution completes via the logs panel
			const chatInput = n8n.canvas.logsPanel.getManualChatInput();
			await chatInput.fill('hello world');
			await chatInput.press('Enter');

			// The user message should appear in the chat
			await expect(n8n.canvas.logsPanel.getManualChatMessages().nth(0)).toContainText(
				'hello world',
			);

			// Execution should complete — logs panel shows success entries
			await expect(n8n.canvas.logsPanel.getLogEntries()).not.toHaveCount(0, { timeout: 30_000 });
		});
	},
);
