import { test, expect } from '../fixtures/base';

// Example of importing a workflow from a file
test.describe('Workflows', () => {
	test('should create a new workflow using empty state card @db:reset', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickNewWorkflowCard();
		await n8n.workflows.importWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');
		await expect(n8n.workflows.workflowTags()).toHaveText(['some-tag-1', 'some-tag-2']);
	});

	test.only('should create a workflow @db:reset @mode:mockserver', async ({ n8n }) => {
		await n8n.goNewWorkflow();
		await n8n.workflows.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

		// TODO Add proxy from http://mock-api.com/data to mockserver url

		// this executes workflow but does not validate notification correctly it seems
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
	});
});
