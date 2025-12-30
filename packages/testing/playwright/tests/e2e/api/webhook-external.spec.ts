import { test, expect } from '../../../fixtures/base';

test.describe('External Webhook Triggering', () => {
	// Marked as serial to avoid race conditions with importing workflows and ID's being returned
	test.describe.configure({ mode: 'serial' });

	test('should create workflow via API, activate it, trigger webhook externally, and verify execution', async ({
		api,
	}) => {
		const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
			'simple-webhook-test.json',
		);

		const testPayload = { message: 'Hello from Playwright test' };

		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
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

		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);

		expect(webhookResponse.ok()).toBe(false);
		expect(await webhookResponse.text()).toContain('Unused Respond to Webhook node');
	});

	test('should save successful webhook executions when workflow configured to save (default behavior)', async ({
		api,
	}) => {
		const { webhookPath, workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
			'simple-webhook-test.json',
		);

		const testPayload = { message: 'Test execution saving - should save' };

		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: testPayload,
		});
		expect(webhookResponse.ok()).toBe(true);

		const execution = await api.workflows.waitForExecution(workflowId, 5000);
		expect(execution.status).toBe('success');

		const allExecutions = await api.workflows.getExecutions();
		const filteredExecutions = allExecutions.filter(
			(exec) => exec.workflowName === createdWorkflow.name,
		);
		expect(filteredExecutions).toHaveLength(1);
		expect(filteredExecutions[0].status).toBe('success');
		expect(filteredExecutions[0].workflowId).toBe(workflowId);
	});

	test('should not save successful webhook executions when workflow configured not to save', async ({
		api,
	}) => {
		const { webhookPath, createdWorkflow } = await api.workflows.importWorkflowFromFile(
			'webhook-no-save-executions.json',
		);

		const testPayload = { message: 'Test execution saving - should not save' };

		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: testPayload,
		});
		expect(webhookResponse.ok()).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const allExecutions = await api.workflows.getExecutions();

		const filteredExecutions = allExecutions.filter(
			(exec) => exec.workflowName === createdWorkflow.name,
		);

		expect(filteredExecutions).toHaveLength(0);
	});
});
