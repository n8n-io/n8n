import { expect, test } from '../../fixtures/base';

test.describe('PDF Test', () => {
	test('Can read and write PDF files and extract text', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.addResource.workflow();
		await n8n.canvas.importWorkflow('test_pdf_workflow.json', 'PDF Workflow');
		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible();
	});
});
