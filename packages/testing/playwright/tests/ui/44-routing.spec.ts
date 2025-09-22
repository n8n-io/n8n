import { EDIT_FIELDS_SET_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';

test.describe('Routing @db:reset', () => {
	test('should ask to save unsaved changes before leaving route', async ({ n8n }) => {
		await n8n.goHome();
		await expect(n8n.workflows.getNewWorkflowCard()).toBeVisible();
		await n8n.workflows.clickNewWorkflowCard();

		await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test Workflow');

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

		await n8n.sideBar.clickHomeButton();

		expect(n8n.page.url()).toContain('/workflow/');

		await expect(n8n.canvas.saveChangesModal.getModal()).toBeVisible();
		await n8n.canvas.saveChangesModal.clickCancel();

		expect(n8n.page.url()).toContain('/home/workflows');
	});

	test('should correct route after cancelling saveChangesModal', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();

		await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test Workflow');

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });

		await n8n.page.goBack();

		expect(n8n.page.url()).toContain('/home/workflows');

		await expect(n8n.canvas.saveChangesModal.getModal()).toBeVisible();
		await n8n.canvas.saveChangesModal.clickClose();

		expect(n8n.page.url()).toContain('/workflow/');
	});

	test('should correct route when opening and closing NDV', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.clickSaveWorkflowButton();

		await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test Workflow');

		const baselineUrl = n8n.page.url();

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });

		expect(n8n.page.url()).not.toBe(baselineUrl);

		await n8n.page.keyboard.press('Escape');

		expect(n8n.page.url()).toBe(baselineUrl);
	});

	test('should open ndv via URL', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.clickSaveWorkflowButton();

		await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test Workflow');

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
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.clickSaveWorkflowButton();

		await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test Workflow');

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
});
