import { WorkflowFactory } from 'n8n-workflow/workflow-factory';

import { test, expect } from '../../fixtures/base';

test.describe('External Webhook Triggering', () => {
	test('should create workflow via API, activate it, trigger webhook externally, and verify execution', async ({
		api,
	}) => {
		const workflow = WorkflowFactory.create({ name: 'Simple Webhook Test' })
			.add('n8n-nodes-base.webhook', {
				name: 'Webhook',
				httpMethod: 'POST',
				path: 'test-webhook',
			})
			.add('n8n-nodes-base.set', {
				name: 'Set response',
				assignments: {
					assignments: [
						{
							id: 'result-field',
							name: 'result',
							value: '=Webhook received: {{ $json.body }}',
							type: 'string',
						},
						{
							id: 'timestamp-field',
							name: 'timestamp',
							value: '={{ new Date().toISOString() }}',
							type: 'string',
						},
					],
				},
			})
			.connect('Webhook', 'Set response')
			.build();

		const { webhookPath, workflowId } =
			await api.workflowApi.importWorkflowFromDefinition(workflow);

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
	
	test('should surface workflow configuration errors to the caller', async ({ api }) => {
		const { webhookPath } = await api.workflowApi.importWorkflow(
			'webhook-misconfiguration-test.json',
		);

		const webhookResponse = await api.request.get(`/webhook/${webhookPath}`);

		expect(webhookResponse.ok()).toBe(false);
		expect(await webhookResponse.text()).toContain('Unused Respond to Webhook node');
	});
});
