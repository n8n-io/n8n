import { test, expect } from '../../fixtures/base';
import { nanoid } from 'nanoid';
import { EditFieldsNode } from '../../pages/nodes/EditFieldsNode';

// Base64 encoded image for binary data test
const cowBase64 =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

test.describe('Webhook Trigger node', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should listen for a GET request', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'GET', path: webhookPath });
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);
	});

	test('should listen for a POST request', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'POST', path: webhookPath });
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.post(`/webhook-test/${webhookPath}`, {
			data: { test: 'data' },
		});
		expect(response.ok()).toBe(true);
	});

	test('should listen for a DELETE request', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'DELETE', path: webhookPath });
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.delete(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);
	});

	test('should listen for a HEAD request', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'HEAD', path: webhookPath });
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.head(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);
	});

	test('should listen for a PATCH request', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'PATCH', path: webhookPath });
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.patch(`/webhook-test/${webhookPath}`, {
			data: { test: 'data' },
		});
		expect(response.ok()).toBe(true);
	});

	test('should listen for a PUT request', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'PUT', path: webhookPath });
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.put(`/webhook-test/${webhookPath}`, {
			data: { test: 'data' },
		});
		expect(response.ok()).toBe(true);
	});

	test('should listen for a GET request and respond with Respond to Webhook node', async ({
		n8n,
		api,
	}) => {
		const webhookPath = nanoid();

		// Configure webhook node
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			responseMode: "Using 'Respond to Webhook' Node",
		});
		await n8n.ndv.close();

		// Add Edit Fields node
		await addEditFieldsNode(n8n);

		// Add Respond to Webhook node
		await n8n.canvas.addNode('Respond to Webhook', { closeNDV: true });

		// Execute workflow
		await n8n.canvas.clickExecuteWorkflowButton();

		// Wait a bit for webhook to be ready
		await n8n.page.waitForTimeout(1000);

		// Make request and verify response
		const response = await api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect(responseData.MyValue).toBe(1234);
	});

	test('should listen for a GET request and respond with custom status code 201', async ({
		n8n,
		api,
	}) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'GET', path: webhookPath });

		// Add optional Response Code parameter
		await n8n.ndv.setupHelper.setOptionalParameter('Response Code', 'responseCode', '201');
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.status()).toBe(201);
	});

	test('should listen for a GET request and respond with last node', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		// Configure webhook node
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			responseMode: 'When Last Node Finishes',
		});
		await n8n.ndv.close();

		// Add Edit Fields node
		await addEditFieldsNode(n8n);

		// Execute workflow
		await n8n.canvas.clickExecuteWorkflowButton();

		// Wait for webhook to be ready
		await n8n.page.waitForTimeout(1000);

		// Make request and verify response
		const response = await api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect(responseData.MyValue).toBe(1234);
	});

	test('should listen for a GET request and respond with last node binary data', async ({
		n8n,
		api,
	}) => {
		const webhookPath = nanoid();

		// Configure webhook node
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			responseMode: 'When Last Node Finishes',
		});
		await n8n.ndv.selectOptionInParameterDropdown('responseData', 'First Entry Binary');
		await n8n.ndv.close();

		// Add Edit Fields node with binary data
		await n8n.canvas.addNode('Edit Fields (Set)');
		const editFieldsNode = new EditFieldsNode(n8n.page);
		await editFieldsNode.setSingleFieldValue('data', 'string', cowBase64);
		await n8n.ndv.close();

		// Add Convert to File node
		await n8n.canvas.addNode('Convert to File', { action: 'Convert to JSON' });
		await n8n.ndv.selectOptionInParameterDropdown('mode', 'Each Item to Separate File');
		await n8n.ndv.close();

		// Execute workflow
		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

		// Make request and verify response contains binary data
		const response = await api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect('data' in responseData).toBe(true);
	});

	test('should listen for a GET request and respond with an empty body', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			responseMode: 'When Last Node Finishes',
		});
		await n8n.ndv.selectOptionInParameterDropdown('responseData', 'No Response Body');
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect(responseData.MyValue).toBeUndefined();
	});

	test('should listen for a GET request with Basic Authentication', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			authentication: 'Basic Auth',
		});

		// Create and select credentials
		await n8n.page.pause();
		await n8n.page.getByTestId('node-credentials-select').click();
		await n8n.page.getByText('Create New').click();

		// Fill credentials form
		await n8n.credentialsModal.getByTestId('credential-input-user').fill('test');
		await n8n.credentialsModal.getByTestId('credential-input-password').fill('test');
		await n8n.credentialsModal.actions.save();

		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		// Test with wrong credentials - should fail
		const failResponse = await api.request.get(`/webhook-test/${webhookPath}`, {
			headers: {
				Authorization: 'Basic ' + Buffer.from('username:password').toString('base64'),
			},
		});
		expect(failResponse.status()).toBe(403);

		// Test with correct credentials - should succeed
		const successResponse = await api.request.get(`/webhook-test/${webhookPath}`, {
			headers: {
				Authorization: 'Basic ' + Buffer.from('test:test').toString('base64'),
			},
		});
		expect(successResponse.ok()).toBe(true);
	});

	test('should listen for a GET request with Header Authentication', async ({ n8n, api }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			authentication: 'Header Auth',
		});

		// Create and select credentials
		await n8n.page.getByTestId('node-credentials-select').click();
		await n8n.page.getByText('Create New').click();

		// Fill credentials form
		await n8n.credentialsModal.getByTestId('credential-input-name').fill('test');
		await n8n.credentialsModal.getByTestId('credential-input-value').fill('test');
		await n8n.credentialsModal.actions.save();

		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		// Test with wrong header - should fail
		const failResponse = await api.request.get(`/webhook-test/${webhookPath}`, {
			headers: {
				test: 'wrong',
			},
		});
		expect(failResponse.status()).toBe(403);

		// Test with correct header - should succeed
		const successResponse = await api.request.get(`/webhook/${webhookPath}`, {
			headers: {
				test: 'test',
			},
		});
		expect(successResponse.ok()).toBe(true);
	});
});

// Helper function to add and configure Edit Fields node
async function addEditFieldsNode(n8n: any): Promise<void> {
	await n8n.canvas.addNode('Edit Fields (Set)');

	const editFieldsNode = new EditFieldsNode(n8n.page);
	await editFieldsNode.setSingleFieldValue('MyValue', 'number', 1234);

	await n8n.ndv.close();
}
