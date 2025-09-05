import { test, expect } from '../../fixtures/base';

test.describe('AI-812-partial-execs-broken-when-using-chat-trigger', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_chat_partial_execution.json');
		await n8n.notifications.quickCloseAll();
		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.deselectAll();
	});

	test.afterEach(async ({ n8n }) => {
		await n8n.notifications.quickCloseAll();
		await n8n.canvas.logsPanel.clearExecutionData();
		await n8n.canvas.logsPanel.sendManualChatMessage('Test Full Execution');

		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(4);

		await expect(n8n.canvas.logsPanel.getManualChatMessages().last()).toContainText(
			'Set 3 with chatInput: Test Full Execution',
		);
	});

	test('should do partial execution when using chat trigger and clicking NDV execute node', async ({
		n8n,
	}) => {
		await n8n.canvas.openNode('Edit Fields1');
		await n8n.ndv.execute();

		await expect(n8n.canvas.logsPanel.getManualChatModal()).toBeVisible();
		await n8n.canvas.logsPanel.sendManualChatMessage('Test Partial Execution');

		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);
		await expect(n8n.canvas.logsPanel.getManualChatMessages().first()).toContainText(
			'Test Partial Execution',
		);
		await expect(n8n.canvas.logsPanel.getManualChatMessages().last()).toContainText(
			'Set 2 with chatInput: Test Partial Execution',
		);
	});

	test('should do partial execution when using chat trigger and context-menu execute node', async ({
		n8n,
	}) => {
		await n8n.canvas.executeNodeFromContextMenu('Edit Fields');

		await expect(n8n.canvas.logsPanel.getManualChatModal()).toBeVisible();
		await n8n.canvas.logsPanel.sendManualChatMessage('Test Partial Execution');

		await expect(n8n.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);
		await expect(n8n.canvas.logsPanel.getManualChatMessages().first()).toContainText(
			'Test Partial Execution',
		);
		await expect(n8n.canvas.logsPanel.getManualChatMessages().last()).toContainText(
			'Set 1 with chatInput: Test Partial Execution',
		);
	});
});
