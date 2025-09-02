import assert from 'node:assert';

import { test, expect } from '../../fixtures/base';

test.describe('Mock server', () => {
	test('should verify ProxyServer container is running', async ({ proxyServer }) => {
		const mockResponse = await proxyServer.createGetExpectation('/health', {
			status: 'healthy',
		});

		assert(typeof mockResponse !== 'string');
		expect(mockResponse.statusCode).toBe(201);

		expect(await proxyServer.verifyGetRequest('/health')).toBe(false);

		// Verify the mock endpoint works
		const healthResponse = await fetch(`${proxyServer.url}/health`);
		expect(healthResponse.ok).toBe(true);
		const healthData = await healthResponse.json();
		expect(healthData.status).toBe('healthy');

		expect(await proxyServer.verifyGetRequest('/health')).toBe(true);
	});

	test('should run a simple workflow calling http endpoint', async ({ n8n, proxyServer }) => {
		const mockResponse = { data: 'Hello from ProxyServer!', test: '1' };

		// Create expectation in mockserver to handle the request
		await proxyServer.createGetExpectation('/data', mockResponse, { test: '1' });

		await n8n.canvas.openNewWorkflow();
		await n8n.canvas.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

		// Execute workflow - this should now proxy through mockserver
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');

		// Verify the request was handled by mockserver
		const wasRequestHandled = await proxyServer.verifyGetRequest('/data', {
			test: '1',
		});

		expect(wasRequestHandled).toBe(true);
	});
});
