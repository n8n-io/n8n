import { test, expect } from '../fixtures/base';

// Example of importing a workflow from a file
test.describe('Workflows', () => {
	test('should create a new workflow using empty state card @db:reset', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickNewWorkflowCard();
		await n8n.workflows.importWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');
		await expect(n8n.workflows.workflowTags()).toHaveText(['some-tag-1', 'some-tag-2']);
	});
});
