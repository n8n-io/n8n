import {
	MANUAL_TRIGGER_NODE_NAME,
	NOTION_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';

test.describe('Workflow Actions', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should be able to save on button click', async ({ n8n }) => {
		const saveButton = n8n.canvas.getWorkflowSaveButton();

		await expect(saveButton).toContainText('Save');

		await n8n.canvas.saveWorkflow();

		await expect(saveButton).toContainText('Saved');

		const tagName = await saveButton.evaluate((el) => el.tagName);
		expect(tagName).toBe('SPAN');

		await expect(n8n.page).not.toHaveURL(/\/workflow\/new$/);
		await expect(n8n.page).toHaveURL(/\/workflow\/[a-zA-Z0-9]+$/);
	});

	test('should save workflow on keyboard shortcut', async ({ n8n }) => {
		const saveButton = n8n.canvas.getWorkflowSaveButton();

		await n8n.canvas.deselectAll();

		await n8n.canvas.hitSaveWorkflow();

		await expect(saveButton).toContainText('Saved');

		const tagName = await saveButton.evaluate((el) => el.tagName);
		expect(tagName).toBe('SPAN');
	});

	test('should not save already saved workflow', async ({ n8n }) => {
		const patchRequests: string[] = [];
		n8n.page.on('request', (request) => {
			if (request.method() === 'PATCH' && request.url().includes('/rest/workflows/')) {
				patchRequests.push(request.url());
			}
		});

		const saveButton = n8n.canvas.getWorkflowSaveButton();
		await expect(saveButton).toContainText('Save');
		await n8n.canvas.saveWorkflow();
		await expect(saveButton).toContainText('Saved');

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

		const patchPromise = n8n.page.waitForRequest(
			(req) => req.method() === 'PATCH' && req.url().includes('/rest/workflows/'),
		);
		await n8n.canvas.saveWorkflow();
		await patchPromise;
		await expect(saveButton).toContainText('Saved');

		expect(await saveButton.evaluate((el) => el.tagName)).toBe('SPAN');

		await n8n.canvas.hitSaveWorkflow();
		await n8n.canvas.hitSaveWorkflow();

		expect(patchRequests).toHaveLength(1);
	});

	test('should not be able to activate unsaved workflow', async ({ n8n }) => {
		await expect(n8n.canvas.getWorkflowActivatorSwitch().locator('input').first()).toBeDisabled();
	});

	test('should not be able to activate workflow without trigger node', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await expect(n8n.canvas.getWorkflowActivatorSwitch().locator('input').first()).toBeDisabled();
	});

	test('should be able to activate workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();

		await expect(n8n.canvas.getWorkflowActivatorSwitch()).toHaveClass(/is-checked/);
	});

	test('should not be able to activate workflow when nodes have errors', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();

		await n8n.canvas.getWorkflowActivatorSwitch().click();

		await expect(n8n.notifications.getErrorNotifications().first()).toBeVisible();
	});

	test('should be able to activate workflow when nodes with errors are disabled', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();

		await n8n.canvas.getWorkflowActivatorSwitch().click();

		await expect(n8n.notifications.getErrorNotifications().first()).toBeVisible();

		const nodeName = await n8n.canvas.getCanvasNodes().last().getAttribute('data-node-name');
		await n8n.canvas.toggleNodeEnabled(nodeName!);

		await n8n.canvas.activateWorkflow();

		await expect(n8n.canvas.getWorkflowActivatorSwitch()).toHaveClass(/is-checked/);
	});

	test('should save new workflow after renaming', async ({ n8n }) => {
		await n8n.canvas.setWorkflowName('Something else');
		await n8n.canvas.getWorkflowNameInput().press('Enter');

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
	});

	test('should rename workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.setWorkflowName('Something else');
		await n8n.canvas.getWorkflowNameInput().press('Enter');

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
		await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', 'Something else');
	});

	test('should not save workflow if canvas is loading', async ({ n8n }) => {
		let patchCount = 0;

		n8n.page.on('request', (req) => {
			if (req.method() === 'PATCH' && req.url().includes('/rest/workflows/')) {
				patchCount++;
			}
		});

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
		const workflowId = n8n.canvas.getWorkflowIdFromUrl();

		await n8n.canvasComposer.delayWorkflowLoad(workflowId);

		await n8n.page.reload();
		await expect(n8n.canvas.getLoadingMask()).toBeVisible();

		await n8n.canvas.hitSaveWorkflow();
		await n8n.canvas.hitSaveWorkflow();
		await n8n.canvas.hitSaveWorkflow();

		expect(patchCount).toBe(0);

		await expect(n8n.page.getByTestId('node-view-loader')).not.toBeAttached();
		await expect(n8n.canvas.getLoadingMask()).not.toBeAttached();
		await n8n.canvasComposer.undelayWorkflowLoad(workflowId);

		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

		const patchPromise = n8n.page.waitForRequest(
			(req) => req.method() === 'PATCH' && req.url().includes('/rest/workflows/'),
		);
		await n8n.canvas.hitSaveWorkflow();
		await patchPromise;

		expect(patchCount).toBe(1);
	});
});
