import { test } from '../fixtures/base';

// Example of importing a workflow from a file
test.describe('PDF Test', () => {
	test('Can read and write PDF files and extract text', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickAddWorklowButton();
		await n8n.workflows.importWorkflow('test_pdf_workflow.json', 'PDF Workflow');
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
	});
});
