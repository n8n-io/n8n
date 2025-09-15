import { test, expect } from '../../fixtures/base';

test.describe('External Webhook Triggering', () => {
	// Marked as serial to avoid race conditions with importing workflows and ID's being returned
	test.describe.configure({ mode: 'serial' });
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

	test('should save successful webhook executions when workflow configured to save (default behavior)', async ({
		api,
	}) => {
		const { webhookPath, workflowId, createdWorkflow } = await api.workflowApi.importWorkflow(
			'simple-webhook-test.json',
		);

		const testPayload = { message: 'Test execution saving - should save' };

		const webhookResponse = await api.request.post(`/webhook/${webhookPath}`, {
			data: testPayload,
		});
		expect(webhookResponse.ok()).toBe(true);

		const execution = await api.workflowApi.waitForExecution(workflowId, 5000);
		expect(execution.status).toBe('success');

		const allExecutions = await api.workflowApi.getExecutions();
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
		const { webhookPath, createdWorkflow } = await api.workflowApi.importWorkflow(
			'webhook-no-save-executions.json',
		);

		const testPayload = { message: 'Test execution saving - should not save' };

		const webhookResponse = await api.request.post(`/webhook/${webhookPath}`, {
			data: testPayload,
		});
		expect(webhookResponse.ok()).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const allExecutions = await api.workflowApi.getExecutions();

		const filteredExecutions = allExecutions.filter(
			(exec) => exec.workflowName === createdWorkflow.name,
		);

		expect(filteredExecutions).toHaveLength(0);
	});

	test('should not save executions under concurrent load when workflow configured not to save @capability:queue', async ({
		api,
	}) => {
		const { webhookPath, createdWorkflow } = await api.workflowApi.importWorkflow(
			'webhook-no-save-executions.json',
		);

		const concurrentRequests = 100;
		const testPayload = { message: 'Concurrent load test - should not save' };

		// Fire multiple webhook requests concurrently to create race conditions
		const requests = Array.from({ length: concurrentRequests }, (_, i) =>
			api.request.post(`/webhook/${webhookPath}`, {
				data: { ...testPayload, requestId: i },
			}),
		);

		const responses = await Promise.all(requests);

		for (const response of responses) {
			expect(response.ok()).toBe(true);
		}

		await new Promise((resolve) => setTimeout(resolve, 20000));

		const allExecutions = await api.workflowApi.getExecutions();
		const filteredExecutions = allExecutions.filter(
			(exec) => exec.workflowName === createdWorkflow.name,
		);

		// Critical: Even under concurrent load, NO executions should be saved
		// This test specifically targets the PAY-3823 race condition bug
		expect(filteredExecutions).toHaveLength(0);
	});

	test('should save all executions under concurrent load when workflow configured to save @capability:queue', async ({
		api,
	}) => {
		const { webhookPath, createdWorkflow } = await api.workflowApi.importWorkflow(
			'simple-webhook-test.json',
		);

		const concurrentRequests = 20;
		const testPayload = { message: 'Concurrent load test - should save all' };

		// Fire multiple webhook requests concurrently
		const requests = Array.from({ length: concurrentRequests }, (_, i) =>
			api.request.post(`/webhook/${webhookPath}`, {
				data: { ...testPayload, requestId: i },
			}),
		);

		const responses = await Promise.all(requests);

		for (const response of responses) {
			expect(response.ok()).toBe(true);
		}

		await new Promise((resolve) => setTimeout(resolve, 5000));

		const allExecutions = await api.workflowApi.getExecutions();
		const filteredExecutions = allExecutions.filter(
			(exec) => exec.workflowName === createdWorkflow.name,
		);

		expect(filteredExecutions).toHaveLength(concurrentRequests);

		for (const execution of filteredExecutions) {
			expect(execution.status).toBe('success');
		}
	});
});
