import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';

test.describe
	.serial('Webhook Trigger node', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.goHome();
		});

		// Basic HTTP method tests - using existing helpers
		test('should listen for a GET request', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook using existing helper
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
			});

			// Execute the webhook node
			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			// Test the webhook
			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(200);

			// Verify execution occurred in the UI
			await expect(n8n.ndv.getOutputPanel()).toBeVisible();
			await expect(n8n.ndv.getOutputPanel()).toContainText('headers');
		});

		test('should listen for a POST request', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'POST',
				path: webhookPath,
			});

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				method: 'POST',
			});
			expect(response.status()).toBe(200);

			await expect(n8n.ndv.getOutputPanel()).toBeVisible();
			await expect(n8n.ndv.getOutputPanel()).toContainText('headers');
		});

		test('should listen for a DELETE request', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'DELETE',
				path: webhookPath,
			});

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				method: 'DELETE',
			});
			expect(response.status()).toBe(200);

			await expect(n8n.ndv.getOutputPanel()).toBeVisible();
		});

		test('should listen for a HEAD request', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'HEAD',
				path: webhookPath,
			});

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				method: 'HEAD',
			});
			expect(response.status()).toBe(200);

			await expect(n8n.ndv.getOutputPanel()).toBeVisible();
		});

		test('should listen for a PATCH request', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'PATCH',
				path: webhookPath,
			});

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				method: 'PATCH',
			});
			expect(response.status()).toBe(200);

			await expect(n8n.ndv.getOutputPanel()).toBeVisible();
		});

		test('should listen for a PUT request', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'PUT',
				path: webhookPath,
			});

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				method: 'PUT',
			});
			expect(response.status()).toBe(200);

			await expect(n8n.ndv.getOutputPanel()).toBeVisible();
		});

		// Response handling tests - will need workflow fixtures or enhanced helpers
		test('should listen for a GET request and respond with Respond to Webhook node', async ({
			n8n,
		}) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook to use Respond to Webhook node
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: "Using 'Respond to Webhook' Node",
			});

			await n8n.ndv.close();

			// Add Edit Fields node
			await n8n.canvas.addNode('Edit Fields (Set)');

			// Configure Edit Fields to add MyValue: 1234
			await n8n.ndv.setEditFieldsValues([
				{
					name: 'MyValue',
					type: 'number',
					value: 1234,
				},
			]);

			await n8n.ndv.close();

			// Add Respond to Webhook node
			await n8n.canvas.addNode('Respond to Webhook');

			await n8n.ndv.close();

			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.page.getByText('Waiting for trigger event').waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				method: 'GET',
			});

			expect(response.status()).toBe(200);

			const responseData = await response.json();
			expect(responseData.MyValue).toBe(1234);
		});

		test('should listen for a GET request and respond with custom status code 201', async ({
			n8n,
		}) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.clickParameterOptions();

			// Configure webhook with custom status code
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
			});

			await n8n.page.getByRole('combobox', { name: 'Add option' }).click();
			await n8n.page.getByText('Response Code').click();

			await n8n.ndv.setParameterDropdown('responseCode', '201');

			await n8n.ndv.close();

			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.page.getByText('Waiting for trigger event').waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(201);
		});

		test('should listen for a GET request and respond with last node', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook to respond with last node
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: 'When Last Node Finishes',
			});

			await n8n.ndv.close();

			// Add Edit Fields node
			await n8n.canvas.addNode('Edit Fields (Set)');

			// Configure Edit Fields to add MyValue: 1234
			await n8n.ndv.setEditFieldsValues([
				{
					name: 'MyValue',
					type: 'number',
					value: 1234,
				},
			]);

			await n8n.ndv.close();

			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.page.getByText('Waiting for trigger event').waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(200);

			const responseData = await response.json();
			expect(responseData.MyValue).toBe(1234);
		});

		test('should listen for a GET request and respond with last node binary data', async ({
			n8n,
		}) => {
			const webhookPath = nanoid();
			const cowBase64 =
				'iVBORw0KGgoAAAANSUhEUgAAAHAAAABwCAMAAADxPgR5AAAACGFjVEwAAAAYAAAAANndHFMAAABmUExURf//////7PXszYl3WeXUqT03GmxYPEdEMbOafEc5J1lHMHZkR/Olptl7fP+9vc9dX5SJe4BqT//X1+vZrCsnEk9AK//99q2bfvrv1P/OzllHL8K6pX5sT+vdw/r04puJbPvpzOPOqsQreYI=';

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook to respond with last node binary data
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: 'When Last Node Finishes',
			});

			// Set response data to binary
			await n8n.ndv.setParameterDropdown('responseData', 'First Entry Binary');

			await n8n.ndv.close();

			// Add Edit Fields node to set binary data
			await n8n.canvas.addNode('Edit Fields (Set)');

			await n8n.ndv.setEditFieldsValues([
				{
					name: 'data',
					type: 'string',
					value: cowBase64,
				},
			]);

			await n8n.ndv.close();

			// Add Convert to File node
			await n8n.canvas.addNodeWithSubItem('Convert to File', 'Convert to JSON');

			// Configure Convert to File node
			await n8n.ndv.setParameterDropdown('operation', 'Convert to JSON');
			await n8n.ndv.setParameterDropdown('mode', 'Each Item to Separate File');

			await n8n.ndv.close();

			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.page.getByText('Waiting for trigger event').waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(200);

			const responseData = await response.json();
			expect(Object.keys(responseData)).toContain('data');
		});

		test('should listen for a GET request and respond with an empty body', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook with empty response body
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: 'When Last Node Finishes',
			});

			// Set response data to No Response Body
			await n8n.ndv.setParameterDropdown('responseData', 'No Response Body');

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			const response = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(200);

			// Check that response body is empty or minimal
			const responseText = await response.text();
			expect(responseText).toBe('');
		});

		// Authentication tests - using credential API helper
		test('should listen for a GET request with Basic Authentication', async ({ n8n, api }) => {
			const webhookPath = nanoid();

			// Create Basic Auth credentials via API
			const { createdCredential } = await api.credentialApi.createCredentialFromDefinition({
				name: 'Test Basic Auth',
				type: 'httpBasicAuth',
				data: {
					user: 'test',
					password: 'test',
				},
			});

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook with Basic Auth
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				authentication: 'Basic Auth', // Use the display name for the helper
			});

			// Select the credential we created
			await n8n.page.getByTestId('node-credentials-select').click();
			await n8n.page.getByText(createdCredential.name).click();

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			// Test with wrong credentials - should get 403
			const wrongAuthResponse = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				auth: { user: 'username', pass: 'password' },
				failOnStatusCode: false,
			});
			expect(wrongAuthResponse.status()).toBe(403);

			// Test with correct credentials - should get 200
			const correctAuthResponse = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				auth: { user: 'test', pass: 'test' },
			});
			expect(correctAuthResponse.status()).toBe(200);
		});

		test('should listen for a GET request with Header Authentication', async ({ n8n, api }) => {
			const webhookPath = nanoid();

			// Create Header Auth credentials via API
			const { createdCredential } = await api.credentialApi.createCredentialFromDefinition({
				name: 'Test Header Auth',
				type: 'httpHeaderAuth',
				data: {
					name: 'test',
					value: 'test',
				},
			});

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook with Header Auth
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				authentication: 'Header Auth', // Use the display name for the helper
			});

			// Select the credential we created
			await n8n.page.getByTestId('node-credentials-select').click();
			await n8n.page.getByText(createdCredential.name).click();

			await n8n.ndv.execute();

			// Wait for webhook to be ready
			await n8n.ndv
				.getContainer()
				.getByText('Listening for test event')
				.waitFor({ state: 'visible' });

			// Test with wrong header - should get 403
			const wrongHeaderResponse = await n8n.ndv.makeWebhookRequest(`/webhook-test/${webhookPath}`, {
				headers: { test: 'wrong' },
				failOnStatusCode: false,
			});
			expect(wrongHeaderResponse.status()).toBe(403);

			// Test with correct header - should get 200
			const correctHeaderResponse = await n8n.ndv.makeWebhookRequest(
				`/webhook-test/${webhookPath}`,
				{
					headers: { test: 'test' },
				},
			);
			expect(correctHeaderResponse.status()).toBe(200);
		});
	});
