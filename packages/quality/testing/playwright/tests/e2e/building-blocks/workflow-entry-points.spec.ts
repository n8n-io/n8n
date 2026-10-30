import { EDIT_FIELDS_SET_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'UI Test Entry Points',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
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

			// Parity sentinel: the editor saves this workflow, so only the `n8n`
			// fixture's settings merge sends it to engine v2. The explicit check keeps
			// this test red if that wiring is lost.
			test('should run a workflow built on the canvas @engine:v2', async ({ n8n }) => {
				await n8n.start.fromBlankCanvas();
				await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await n8n.api.workflows.assertLatestExecutionRoutedToEngine(
					n8n.canvas.getWorkflowIdFromUrl(),
				);
			});
		});

		test.describe('Entry Point: Basic Workflow Creation', () => {
			test('should create a new project and workflow', async ({ n8n }) => {
				await n8n.start.fromNewProjectBlankCanvas();
				await expect(n8n.canvas.canvasPane()).toBeVisible();
			});
		});

		test.describe('Entry Point: Imported Workflow', () => {
			test('should import a webhook workflow @engine:v2', async ({ n8n, api }) => {
				const workflowImportResult = await n8n.start.fromImportedWorkflow(
					'simple-webhook-test.json',
				);
				const { webhookPath } = workflowImportResult;

				const testPayload = { message: 'Hello from Playwright test' };

				await n8n.canvas.clickExecuteWorkflowButton();
				await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

				const webhookResponse = await api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
					method: 'POST',
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
	},
);
