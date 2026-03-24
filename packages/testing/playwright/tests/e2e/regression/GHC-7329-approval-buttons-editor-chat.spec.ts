import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-7329
 * https://linear.app/n8n/issue/GHC-7329
 * https://github.com/n8n-io/n8n/issues/27187
 *
 * Issue: Approval buttons are not rendered in the built-in editor chat UI
 * when using Chat node with "Send and Wait for Response" operation and
 * "Approval" response type.
 *
 * The buttons render correctly in the public chat URL, but fail to appear
 * in the editor's test chat panel.
 */
test.describe(
	'GHC-7329: Approval buttons in editor chat',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('GHC-7329_approval_buttons_in_editor_chat.json');
			await n8n.notifications.quickCloseAll();
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();
		});

		test.afterEach(async ({ n8n }) => {
			await n8n.notifications.quickCloseAll();
			await n8n.canvas.logsPanel.clearExecutionData();
		});

		test('should render approval buttons in editor test chat', async ({ n8n }) => {
			// Open the manual chat modal by executing the workflow
			await n8n.canvas.openNode('When chat message received');
			await n8n.ndv.close();
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait for chat modal to be visible
			await expect(n8n.canvas.logsPanel.getManualChatModal()).toBeVisible();

			// Send a test message to trigger the approval response
			await n8n.canvas.logsPanel.sendManualChatMessage('Hello');

			// Wait for chat messages to appear
			const chatMessages = n8n.canvas.logsPanel.getManualChatMessages();
			await expect(chatMessages).toHaveCount(2, { timeout: 10000 });

			// Get the bot's response message (should contain approval buttons)
			const botMessage = chatMessages.last();
			await expect(botMessage).toContainText('Do you prefer boat or plane travel?');

			// Check for approval buttons
			// The Chat SDK should render buttons as interactive elements
			const approveButton = botMessage.getByRole('button', { name: /plane/i });
			const disapproveButton = botMessage.getByRole('button', { name: /boat/i });

			// These assertions should pass but will fail due to the bug
			await expect(approveButton).toBeVisible({ timeout: 5000 });
			await expect(disapproveButton).toBeVisible({ timeout: 5000 });
		});

		test('should render single approval button in editor test chat', async ({ n8n }) => {
			// First, update the Chat node to use single approval button
			await n8n.canvas.openNode('Ask');

			// Navigate to approval options and change to single button
			const ndv = n8n.ndv;
			await ndv.parameters.getDropdown('Operation').click();
			await ndv.parameters.getOption('Send and Wait for Response').click();
			await ndv.parameters.getDropdown('Response Type').click();
			await ndv.parameters.getOption('Approval').click();

			// Find and update approval type
			const approvalTypeField = ndv.parameters.getField('Approval Type');
			await approvalTypeField.click();
			const singleOption = ndv.parameters.root.getByText('Single Button').first();
			if (await singleOption.isVisible()) {
				await singleOption.click();
			}

			await ndv.close();

			// Execute workflow
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait for chat modal to be visible
			await expect(n8n.canvas.logsPanel.getManualChatModal()).toBeVisible();

			// Send a test message
			await n8n.canvas.logsPanel.sendManualChatMessage('Test single button');

			// Wait for messages
			const chatMessages = n8n.canvas.logsPanel.getManualChatMessages();
			await expect(chatMessages).toHaveCount(2, { timeout: 10000 });

			// Get bot's response
			const botMessage = chatMessages.last();
			await expect(botMessage).toContainText('Do you prefer boat or plane travel?');

			// Check for single approval button
			const approveButton = botMessage.getByRole('button', { name: /approve|plane/i });

			// This assertion should pass but will fail due to the bug
			await expect(approveButton).toBeVisible({ timeout: 5000 });
		});
	},
);
