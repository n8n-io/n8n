import { expect, test } from '../fixtures/base';

// Example of importing a workflow from a file
test.describe('PDF Test', () => {
	// eslint-disable-next-line playwright/no-skipped-test
	test.skip('Can read and write PDF files and extract text', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickAddWorklowButton();
		await n8n.workflows.importWorkflow('test_pdf_workflow.json', 'PDF Workflow');
		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(
			n8n.notifications.notificationContainerByText('Workflow executed successfully'),
		).toBeVisible();
	});
});
