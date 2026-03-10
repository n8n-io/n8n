import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-7089: Chat Trigger fails when workflow has multiple triggers
 *
 * Bug description:
 * - When a workflow has more than one active trigger (e.g., Chat Trigger + Manual Trigger),
 *   the Chat Trigger stops working properly
 * - Error: "The requested webhook "<workflowId>/<webhookId>" is not registered."
 * - Error: "Error handling CollaborationService push message - invalid input syntax for type uuid"
 *
 * Expected behavior:
 * - Chat Trigger should work normally even when other triggers are active in the workflow
 * - No webhook registration or collaboration service errors
 */
test.describe(
	'GHC-7089: Chat Trigger with multiple triggers',
	{
		annotation: [
			{ type: 'owner', description: 'AI' },
			{ type: 'issue', description: 'https://github.com/n8n-io/n8n/issues/26491' },
		],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_chat_trigger_multiple_triggers.json');
			await n8n.notifications.quickCloseAll();
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();
		});

		test('should successfully execute chat trigger when workflow has multiple triggers', async ({
			n8n,
		}) => {
			// Send a chat message
			await n8n.canvas.logsPanel.sendManualChatMessage('Hello from multiple triggers');

			// Wait for workflow execution to complete
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 5000,
			});

			// Verify chat messages are displayed
			const messages = n8n.canvas.logsPanel.getManualChatMessages();
			await expect(messages).toHaveCount(2); // User message + bot response

			// Verify user message
			await expect(messages.first()).toContainText('Hello from multiple triggers');

			// Verify bot response
			await expect(messages.last()).toContainText('Response to: Hello from multiple triggers');
		});

		test('should register chat webhook correctly even with other triggers present', async ({
			n8n,
		}) => {
			// First message - verifies initial webhook registration
			await n8n.canvas.logsPanel.sendManualChatMessage('First message');
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 5000,
			});

			// Second message - verifies webhook remains registered
			await n8n.canvas.logsPanel.sendManualChatMessage('Second message');
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 5000,
			});

			// Verify both messages executed successfully
			const messages = n8n.canvas.logsPanel.getManualChatMessages();
			await expect(messages).toHaveCount(4); // 2 user messages + 2 bot responses
		});

		test('should not throw "webhook not registered" error with multiple triggers', async ({
			n8n,
		}) => {
			// This test specifically checks that the webhook registration error doesn't occur
			// The bug manifests as: "The requested webhook "<workflowId>/<webhookId>" is not registered."

			// Send a chat message
			await n8n.canvas.logsPanel.sendManualChatMessage('Testing webhook registration');

			// Should execute successfully without webhook errors
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 5000,
			});

			// Verify no error notifications
			await expect(n8n.notifications.getNotifications()).toHaveCount(0);
		});
	},
);
