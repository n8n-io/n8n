import {
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe('Workflow Run @fixme', () => {
	test.fixme();

	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should keep endpoint click working when switching between execution and editor tab', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.clickNodePlusEndpoint('Edit Fields');
		await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();
		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.clickExecutionsTab();
		await n8n.page.waitForURL(/\/executions/);

		await n8n.canvas.clickEditorTab();

		await n8n.canvas.clickNodePlusEndpoint('Edit Fields');
		await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();
	});

	test('should run workflow on button click', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible();
	});

	test('should run workflow using keyboard shortcut', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.hitExecuteWorkflow();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible();
	});

	test('should not run empty workflows', async ({ n8n }) => {
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);

		await expect(n8n.canvas.getExecuteWorkflowButton()).not.toBeAttached();

		await n8n.canvas.hitExecuteWorkflow();
		await expect(n8n.notifications.getSuccessNotifications()).toHaveCount(0);
	});
});
