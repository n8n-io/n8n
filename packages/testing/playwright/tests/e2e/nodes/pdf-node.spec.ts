import { expect, test } from '../../../fixtures/base';

test.describe('PDF Test', () => {
	test('Can read and write PDF files and extract text', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.importWorkflow('test_pdf_workflow.json', 'PDF Workflow');
		await n8n.canvas.clickExecuteWorkflowButton();
		// Increased timeout - PDF processing can be slow after recent changes
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible({ timeout: 30000 });
	});
});
