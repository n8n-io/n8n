import { test, expect } from '../../../fixtures/base';

test.describe('01 - UI Test Entry Points', () => {
	test.describe('Entry Point: Home Page', () => {
		test('should navigate from home', async ({ n8n }) => {
			await n8n.start.fromHome();
			expect(n8n.page.url()).toContain('/home/workflows');
		});
	});

	test.describe('Entry Point: Blank Canvas', () => {
		test('should navigate from blank canvas', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await expect(n8n.canvas.canvasPane()).toBeVisible();
		});
	});

	test.describe('Entry Point: Basic Workflow Creation', () => {
		test('should create a new project and workflow', async ({ n8n }) => {
			await n8n.start.fromNewProjectBlankCanvas();
			await expect(n8n.canvas.canvasPane()).toBeVisible();
		});
	});

	test.describe('Entry Point: Imported Workflow', () => {
		test('should import a webhook workflow', async ({ n8n }) => {
			const workflowImportResult = await n8n.start.fromImportedWorkflow('simple-webhook-test.json');
			const { webhookPath } = workflowImportResult;

			const testPayload = { message: 'Hello from Playwright test' };

			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

			const webhookResponse = await n8n.page.request.post(`/webhook-test/${webhookPath}`, {
				data: testPayload,
			});

			expect(webhookResponse.ok()).toBe(true);
		});

		test('should import a workflow', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('manual.json');
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Success');
			await expect(n8n.canvas.canvasPane()).toBeVisible();
		});
	});
});
