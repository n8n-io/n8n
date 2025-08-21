import { test, expect } from '../../../fixtures/base';

test.describe('03 - Node Details Configuration', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should configure webhook node', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook');

		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'POST',
			path: 'test-webhook',
			authentication: 'Basic Auth',
		});

		await expect(n8n.ndv.getParameterInputField('path')).toHaveValue('test-webhook');
	});

	test('should configure HTTP Request node', async ({ n8n }) => {
		await n8n.canvas.addNode('HTTP Request');

		await n8n.ndv.setupHelper.httpRequest({
			method: 'POST',
			url: 'https://api.example.com/test',
			sendQuery: true,
			sendHeaders: false,
		});

		await expect(n8n.ndv.getParameterInputField('url')).toHaveValue('https://api.example.com/test');
	});

	test('should auto-detect parameter types', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook');

		await n8n.ndv.setupHelper.setParameter('httpMethod', 'PUT');
		await n8n.ndv.setupHelper.setParameter('path', 'auto-detect-test');

		await expect(n8n.ndv.getParameterInputField('path')).toHaveValue('auto-detect-test');
	});

	test('should use explicit types for better performance', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook');

		await n8n.ndv.setupHelper.setParameter('httpMethod', 'PATCH', 'dropdown');
		await n8n.ndv.setupHelper.setParameter('path', 'explicit-types', 'text');

		await expect(n8n.ndv.getParameterInputField('path')).toHaveValue('explicit-types');
	});
});
