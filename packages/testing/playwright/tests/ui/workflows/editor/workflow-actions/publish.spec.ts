import {
	MANUAL_TRIGGER_NODE_NAME,
	NOTION_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

// eslint-disable-next-line playwright/no-skipped-test
test.skip('Workflow Publish', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should not be able to publish workflow without trigger node', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.getOpenPublishModalButton().click();

		await expect(n8n.canvas.getPublishButton()).toBeDisabled();
	});

	test('should be able to publish workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await expect(n8n.canvas.getPublishedIndicator()).not.toBeVisible();

		await n8n.canvas.publishWorkflow();

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
	});

	test('should not be able to publish workflow when nodes have errors', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.getOpenPublishModalButton().click();

		await expect(n8n.canvas.getPublishButton()).toBeDisabled();

		await expect(n8n.canvas.getPublishModalCallout()).toBeVisible();
	});

	test('should be able to publish workflow when nodes with errors are disabled', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();

		await n8n.canvas.getOpenPublishModalButton().click();

		await expect(n8n.canvas.getPublishButton()).toBeDisabled();
		await n8n.canvas.cancelPublishWorkflowModal();

		const nodeName = await n8n.canvas.getCanvasNodes().last().getAttribute('data-node-name');
		await n8n.canvas.toggleNodeEnabled(nodeName!);

		await n8n.canvas.publishWorkflow();

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
	});
});
