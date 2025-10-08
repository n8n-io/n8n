import { test, expect } from '../../fixtures/base';

test.describe('External Webhook Triggering', () => {
	test('should create workflow via API, activate it, trigger webhook externally, and verify execution', async ({
		api,
	}) => {
		const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
			'simple-webhook-test.json',
		);

		const testPayload = { message: 'Hello from Playwright test' };

		const webhookResponse = await api.request.post(`/webhook/${webhookPath}`, {
			data: testPayload,
		});

		expect(webhookResponse.ok()).toBe(true);

		const execution = await api.workflows.waitForExecution(workflowId, 5000);
		expect(execution.status).toBe('success');

		const executionDetails = await api.workflows.getExecution(execution.id);
		expect(executionDetails.data).toContain('Hello from Playwright test');
	});

	test('should surface workflow configuration errors to the caller', async ({ api }) => {
		const { webhookPath } = await api.workflows.importWorkflowFromFile(
			'webhook-misconfiguration-test.json',
		);

		const webhookResponse = await api.request.get(`/webhook/${webhookPath}`);

		expect(webhookResponse.ok()).toBe(false);
		expect(await webhookResponse.text()).toContain('Unused Respond to Webhook node');
	});
});
