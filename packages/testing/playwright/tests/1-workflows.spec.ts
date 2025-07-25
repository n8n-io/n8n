import { test, expect } from '../fixtures/base';
import { createGetExpectation, verifyGetRequest } from '../services/mockserver';

// Example of importing a workflow from a file
test.describe('Workflows', () => {
	test('should create a new workflow using empty state card @db:reset', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickNewWorkflowCard();
		await n8n.workflows.importWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');
		await expect(n8n.workflows.workflowTags()).toHaveText(['some-tag-1', 'some-tag-2']);
	});

	test.only('should run a simple workflow calling http endpoint @db:reset @mode:mockserver', async ({
		n8n,
		n8nContainer,
	}) => {
		const mockServerUrl = n8nContainer.mockServerUrl!;
		const mockResponse = { data: 'Hello from MockServer!', test: '1' };

		// Create expectation in mockserver to handle the request
		await createGetExpectation(mockServerUrl, '/data', mockResponse, { test: '1' });

		await n8n.goNewWorkflow();
		await n8n.workflows.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

		// Execute workflow - this should now proxy through mockserver
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');

		// Verify the request was handled by mockserver
		const wasRequestHandled = await verifyGetRequest(mockServerUrl, '/data', { test: '1' });

		expect(wasRequestHandled).toBe(true);
	});
});
