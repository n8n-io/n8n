import { test, expect } from '../../../fixtures/base';

test.describe('Chat session ID reset', {
	annotation: [
		{ type: 'owner', description: 'AI' },
	],
}, () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_chat_partial_execution.json');
		await n8n.notifications.quickCloseAll();
		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.deselectAll();
	});

	test('should update session ID in node output when session is reset', async ({ n8n }) => {
		await n8n.canvas.logsPanel.open();
		await n8n.canvas.logsPanel.sendManualChatMessage('Test message 1');
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);

		const initialSessionId = await n8n.canvas.logsPanel.getSessionId(n8n.clipboard);
		await n8n.canvas.logsPanel.clickLogEntryAtRow(0);
		await expect(n8n.canvas.logsPanel.outputPanel.getTbodyCell(0, 1)).toContainText(
			initialSessionId,
		);

		await n8n.canvas.logsPanel.refreshSession();
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();

		// Step 5: Get the new session ID
		const newSessionId = await n8n.canvas.logsPanel.getSessionId(n8n.clipboard);
		expect(newSessionId).not.toEqual(initialSessionId);

		await n8n.canvas.logsPanel.sendManualChatMessage('Test message 2');
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);

		// Verify the NEW session ID in the output panel matches the chat header session ID
		await expect(n8n.canvas.logsPanel.outputPanel.getTbodyCell(0, 1)).toContainText(newSessionId);
	});
});
