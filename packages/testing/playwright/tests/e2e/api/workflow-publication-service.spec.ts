import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'workflow-publication-service',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
		},
	},
});

test.describe(
	'Workflow Publication Service',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('executes a published workflow when reading via workflow_published_version', async ({
			api,
		}) => {
			const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
				'simple-webhook-test.json',
			);

			const testPayload = { message: 'Hello from publication-service test' };

			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: testPayload,
			});

			expect(webhookResponse.ok()).toBe(true);

			const execution = await api.workflows.waitForExecution(workflowId, 5000);
			expect(execution.status).toBe('success');

			const executionDetails = await api.workflows.getExecution(execution.id);
			expect(executionDetails.data).toContain('Hello from publication-service test');
		});
	},
);
