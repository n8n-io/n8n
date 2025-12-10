import { test, expect } from '../../../fixtures/base';

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
		await sessionIdButton.hover();

		// Use .last() to get the most recently opened tooltip (session ID), not the "waiting for chat" tooltip
		const initialTooltip = n8n.page.locator('.n8n-tooltip').last();
		// Wait for tooltip to be visible before asserting text
		await expect(initialTooltip).toBeVisible();
		// Reka UI tooltip has content duplicated in an aria-hidden span for accessibility,
		// so we need to get just the visible text content, not the full textContent
		const initialTooltipText = await initialTooltip.innerText();
		expect(initialTooltipText).toMatch(/^[a-f0-9]+\s+\(click to copy\)$/im);
		const initialSessionId = initialTooltipText.split(/\s/)[0];

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
		await sessionIdButton.hover();
		const newTooltip = n8n.page.locator('.n8n-tooltip').last();
		// Wait for tooltip to be visible before asserting text
		await expect(newTooltip).toBeVisible();
		// Use innerText to get visible text only (excludes aria-hidden content)
		const newTooltipText = await newTooltip.innerText();
		expect(newTooltipText).toMatch(/^[a-f0-9]+\s+\(click to copy\)$/im);
		const newSessionId = newTooltipText.split(/\s/)[0];

		expect(newSessionId).not.toEqual(initialSessionId);

		// Execute again with a new message
		await n8n.canvas.logsPanel.sendManualChatMessage('Test message 2');
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);

		// Verify the NEW session ID in the output panel matches the chat header session ID
		await expect(n8n.canvas.logsPanel.outputPanel.getTbodyCell(0, 0)).toContainText(newSessionId);
	});
});
