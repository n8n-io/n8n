import { readFileSync } from 'fs';

import { test, expect } from '../../fixtures/base';
import { resolveFromRoot } from '../../utils/path-helper';

test.describe('External Webhook Triggering @auth:owner', () => {
	test('should create workflow via API, activate it, trigger webhook externally, and verify execution', async ({
		api,
	}) => {
		const workflowDefinition = JSON.parse(
			readFileSync(resolveFromRoot('workflows', 'simple-webhook-test.json'), 'utf8'),
		);

		const createdWorkflow = await api.workflowApi.createWorkflow(workflowDefinition);
		expect(createdWorkflow.id).toBeDefined();

		const workflowId = createdWorkflow.id;
		await api.workflowApi.setActive(workflowId, true);

		const testPayload = { message: 'Hello from Playwright test' };

		const webhookResponse = await api.workflowApi.triggerWebhook('test-webhook', {
			data: testPayload,
		});
		expect(webhookResponse.ok()).toBe(true);

		const execution = await api.workflowApi.waitForExecution(workflowId, 10000);
		expect(execution.status).toBe('success');

		const executionDetails = await api.workflowApi.getExecution(execution.id);
		expect(executionDetails.data).toContain('Hello from Playwright test');
	});
});
