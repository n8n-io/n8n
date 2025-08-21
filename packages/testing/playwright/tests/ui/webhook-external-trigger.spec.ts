import { test, expect } from '../../fixtures/base';

test.describe('External Webhook Triggering', () => {
	test('should create workflow via API, activate it, trigger webhook externally, and verify execution', async ({
		api,
	}) => {
		const { webhookPath, workflowId } = await api.workflowApi.importWorkflow(
			'simple-webhook-test.json',
		);

		const testPayload = { message: 'Hello from Playwright test' };

		const webhookResponse = await api.request.post(`/webhook/${webhookPath}`, {
			data: testPayload,
		});

		expect(webhookResponse.ok()).toBe(true);

		const execution = await api.workflowApi.waitForExecution(workflowId, 5000);
		expect(execution.status).toBe('success');

		const executionDetails = await api.workflowApi.getExecution(execution.id);
		expect(executionDetails.data).toContain('Hello from Playwright test');
	});
});
