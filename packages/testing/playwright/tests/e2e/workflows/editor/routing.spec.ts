import {
	EDIT_FIELDS_SET_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../../config/constants';
import { test, expect } from '../../../../fixtures/base';

test.describe('Routing', () => {
	test('should ask to save unsaved changes before leaving route', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_1.json');
		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

		await n8n.sideBar.clickHomeButton();

		await expect(n8n.page).toHaveURL(/workflow/);

		await expect(n8n.canvas.saveChangesModal.getModal()).toBeVisible();
		await n8n.canvas.saveChangesModal.clickCancel();

		await expect(n8n.page).toHaveURL(/home\/workflows/);
	});

	test('should correct route after cancelling saveChangesModal', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

		await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test Workflow');

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });

		await n8n.page.goBack();

		await expect(n8n.page).toHaveURL(/home\/workflows/);

		await expect(n8n.canvas.saveChangesModal.getModal()).toBeVisible();
		await n8n.canvas.saveChangesModal.clickClose();

		await expect(n8n.page).toHaveURL(/workflow/);
	});

	test('should correct route when opening and closing NDV', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_1.json');

		const baselineUrl = n8n.page.url();

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });

		expect(n8n.page.url()).not.toBe(baselineUrl);

		await n8n.page.keyboard.press('Escape');

		expect(n8n.page.url()).toBe(baselineUrl);
	});

	test('should open ndv via URL', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_1.json');

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });
		const ndvUrl = n8n.page.url();

		await n8n.page.keyboard.press('Escape');
		await n8n.canvas.clickSaveWorkflowButton();

		await expect(n8n.ndv.getContainer()).toBeHidden();

		await n8n.page.goto(ndvUrl);

		await expect(n8n.ndv.getContainer()).toBeVisible();
	});

	test('should open show warning and drop nodeId from URL if it contained an unknown nodeId', async ({
		n8n,
	}) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_1.json');

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });
		const ndvUrl = n8n.page.url();

		await n8n.page.keyboard.press('Escape');
		await n8n.canvas.clickSaveWorkflowButton();

		await expect(n8n.ndv.getContainer()).toBeHidden();

		await n8n.page.goto(ndvUrl + 'thisMessesUpTheNodeId');

		await expect(n8n.notifications.getWarningNotifications()).toBeVisible();

		const urlWithoutNodeId = ndvUrl.split('/').slice(0, -1).join('/');
		expect(n8n.page.url()).toBe(urlWithoutNodeId);
	});

	test('should load existing workflow when navigating with ?new=true', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();

		// Create and save a workflow with a node
		const workflowName = 'Test Existing Workflow';
		await n8n.canvas.setWorkflowName(workflowName);
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');

		// Get the workflow ID from the URL
		const workflowId = n8n.canvas.getWorkflowIdFromUrl();
		expect(workflowId).toBeTruthy();

		// Navigate to the workflow with ?new=true query parameter
		await n8n.page.goto(`/workflow/${workflowId}?new=true`);

		// Wait for the canvas to load
		await expect(n8n.page.getByTestId('node-view-loader')).not.toBeAttached();

		// Verify the existing workflow was loaded (not a blank canvas)
		await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', workflowName);
		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');

		// Verify the previously added node is present
		const scheduleNode = n8n.canvas.nodeByName(SCHEDULE_TRIGGER_NODE_NAME);
		await expect(scheduleNode).toBeVisible();
	});
});
