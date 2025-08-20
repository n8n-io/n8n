import { test, expect } from '../../fixtures/base';
import { importAndActivateWebhookWorkflow, triggerWebhook } from '../../services/webhook-helper';

test.describe('External Webhook Triggering @auth:owner', () => {
	test('should create workflow via API, activate it, trigger webhook externally, and verify execution', async ({
		api,
	}) => {
		const { webhookPath, workflowId } = await importAndActivateWebhookWorkflow(
			api,
			'simple-webhook-test.json',
		);

		const testPayload = { message: 'Hello from Playwright test' };

		const webhookResponse = await triggerWebhook(api, webhookPath, {
			data: testPayload,
		});
		expect(webhookResponse.ok()).toBe(true);

		const execution = await api.workflowApi.waitForExecution(workflowId, 10000);
		expect(execution.status).toBe('success');

		const executionDetails = await api.workflowApi.getExecution(execution.id);
		expect(executionDetails.data).toContain('Hello from Playwright test');
	});
});
