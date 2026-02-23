import { test, expect } from '../../fixtures/base';

test.describe('Chat session ID reset', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_chat_partial_execution.json');
		await n8n.notifications.quickCloseAll();
		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.deselectAll();
	});

	test('should update session ID in node output when session is reset', async ({ n8n }) => {
		// Step 1 & 2: Execute workflow by sending a chat message
		await n8n.canvas.logsPanel.open();
		await n8n.canvas.logsPanel.sendManualChatMessage('Test message 1');
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);

		// Step 3: Get the current session ID from the chat header
		const sessionIdButton = n8n.page.getByTestId('chat-session-id');
		await sessionIdButton.click();

		let initialSessionId = await n8n.page.locator('.n8n-tooltip')?.textContent();
		expect(initialSessionId).toBeTruthy();
		initialSessionId = (initialSessionId as string).split(' ')[0]; // Split text "SESSIONID (Click to copy)"

		// Click on the chat trigger node in the logs to see its output
		await n8n.canvas.logsPanel.clickLogEntryAtRow(0);

		// Verify the session ID in the output panel matches the chat header session ID
		await expect(n8n.canvas.logsPanel.outputPanel.getTbodyCell(0, 0)).toContainText(
			initialSessionId,
		);

		// Step 4: Reset the session
		await n8n.page.getByTestId('refresh-session-button').click();
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();

		// Step 5: Get the new session ID
		await sessionIdButton.click();
		let newSessionId = await n8n.page.locator('.n8n-tooltip')?.textContent();
		expect(newSessionId).toBeTruthy();
		newSessionId = (newSessionId as string).split(' ')[0]; // Split text "SESSIONID (Click to copy)"

		expect(newSessionId).not.toEqual(initialSessionId);

		// Execute again with a new message
		await n8n.canvas.logsPanel.sendManualChatMessage('Test message 2');
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);

		// Verify the NEW session ID in the output panel matches the chat header session ID
		await expect(n8n.canvas.logsPanel.outputPanel.getTbodyCell(0, 0)).toContainText(newSessionId);
	});
});
