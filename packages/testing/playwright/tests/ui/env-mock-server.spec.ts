import assert from 'node:assert';

import { test, expect } from '../../fixtures/base';
import { createGetExpectation, verifyGetRequest } from '../services/proxyserver';

test.describe('Mock server', () => {
	test('should verify ProxyServer container is running', async ({ n8nContainer }) => {
		const proxyServerUrl = n8nContainer.proxyServerUrl;
		assert(proxyServerUrl, 'ProxyServer URL not available');

		const mockResponse = await createGetExpectation(proxyServerUrl, '/health', {
			status: 'healthy',
		});

		assert(typeof mockResponse !== 'string');
		expect(mockResponse.statusCode).toBe(201);

		// Verify the mock endpoint works
		const healthResponse = await fetch(`${proxyServerUrl}/health`);
		expect(healthResponse.ok).toBe(true);
		const healthData = await healthResponse.json();
		expect(healthData.status).toBe('healthy');

		expect(await verifyGetRequest(proxyServerUrl, '/health')).toBe(true);
	});

	test('should run a simple workflow calling http endpoint', async ({ n8n, n8nContainer }) => {
		const proxyServerUrl = n8nContainer.proxyServerUrl!;
		const mockResponse = { data: 'Hello from ProxyServer!', test: '1' };

		// Create expectation in mockserver to handle the request
		await createGetExpectation(proxyServerUrl, '/data', mockResponse, { test: '1' });

		await n8n.canvas.openNewWorkflow();
		await n8n.canvas.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

		// Execute workflow - this should now proxy through mockserver
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');

		// Verify the request was handled by mockserver
		const wasRequestHandled = await verifyGetRequest(proxyServerUrl, '/data', { test: '1' });

		expect(wasRequestHandled).toBe(true);
	});
});
