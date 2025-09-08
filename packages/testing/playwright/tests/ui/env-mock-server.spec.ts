import assert from 'node:assert';

import { test, expect } from '../../fixtures/base';

// @capability:proxy tag ensures that test suite is only run when proxy is available
test.describe('Proxy server @capability:proxy', () => {
	test.beforeEach(async ({ proxyServer }) => {
		await proxyServer.clearAllExpectations();
	});

	test('should verify ProxyServer container is running', async ({ proxyServer }) => {
		const mockResponse = await proxyServer.createGetExpectation('/health', {
			status: 'healthy',
		});

		assert(typeof mockResponse !== 'string');
		expect(mockResponse.statusCode).toBe(201);

		expect(await proxyServer.wasRequestMade({ method: 'GET', path: '/health' })).toBe(false);

		// Verify the mock endpoint works
		const healthResponse = await fetch(`${proxyServer.url}/health`);
		expect(healthResponse.ok).toBe(true);
		const healthData = await healthResponse.json();
		expect(healthData.status).toBe('healthy');

		expect(await proxyServer.wasRequestMade({ method: 'GET', path: '/health' })).toBe(true);
	});

	test('should run a simple workflow calling http endpoint', async ({ n8n, proxyServer }) => {
		const mockResponse = { data: 'Hello from ProxyServer!', test: '1' };

		// Create expectation in mockserver to handle the request
		await proxyServer.createGetExpectation('/data', mockResponse, { test: '1' });

		await n8n.canvas.openNewWorkflow();

		// This is calling a random endpoint http://mock-api.com
		await n8n.canvas.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

		// Execute workflow - this should now proxy through mockserver
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
		await n8n.canvas.openNode('HTTP Request');
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('Hello from ProxyServer!');

		// Verify the request was handled by mockserver
		expect(
			await proxyServer.wasRequestMade({
				method: 'GET',
				path: '/data',
				queryStringParameters: { test: ['1'] },
			}),
		).toBe(true);
	});

	test('should use stored expectations respond to api request', async ({ proxyServer }) => {
		await proxyServer.loadExpectations('proxy-server');

		const response = await fetch(`${proxyServer.url}/mock-endpoint`);
		expect(response.ok).toBe(true);
		const data = await response.json();
		expect(data.title).toBe('delectus aut autem');
		expect(await proxyServer.wasRequestMade({ method: 'GET', path: '/mock-endpoint' })).toBe(true);
	});

	test('should run a simple workflow proxying HTTPS request', async ({ n8n }) => {
		await n8n.canvas.openNewWorkflow();
		await n8n.canvas.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

		await n8n.canvas.openNode('HTTP Request');
		await n8n.ndv.setParameterInput('url', 'https://jsonplaceholder.typicode.com/todos/1');
		await n8n.ndv.execute();
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');
	});
});
