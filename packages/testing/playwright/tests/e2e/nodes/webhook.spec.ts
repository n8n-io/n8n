import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';
import { EditFieldsNode } from '../../../pages/nodes/EditFieldsNode';

const cowBase64 =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

test.describe('Webhook Trigger node', {
	annotation: [
		{ type: 'owner', description: 'Catalysts' },
	],
}, () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should listen for all HTTP methods (GET, POST, DELETE, HEAD, PATCH, PUT)', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Webhook');
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();

		const methods = ['GET', 'POST', 'DELETE', 'HEAD', 'PATCH', 'PUT'] as const;
		for (const method of methods) {
			await n8n.ndv.setupHelper.webhook({ httpMethod: method });
			await n8n.ndv.execute();
			await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

			const response = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`, { method });
			expect(response.ok(), `${method} request should succeed`).toBe(true);

			// Wait for output to appear (confirms execution completed)
			await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();
		}
	});

	test('should listen for a GET request and respond with Respond to Webhook node', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			responseMode: "Using 'Respond to Webhook' Node",
		});
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
		await n8n.ndv.close();
		await addEditFieldsNode(n8n);
		await n8n.canvas.addNode('Respond to Webhook', { closeNDV: true });

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();
		const response = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect(responseData.MyValue).toBe(1234);
	});

	test('should listen for a GET request and respond with custom status code 201', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'GET' });
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();

		// Add the Response Code optional parameter
		await n8n.ndv.getAddOptionDropdown().click();
		await n8n.page.getByRole('option', { name: 'Response Code' }).click();
		// Select 201 from the dropdown
		await n8n.ndv.selectOptionInParameterDropdown('responseCode', '201');
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
		expect(response.status()).toBe(201);
	});

	test('should listen for a GET request and respond with last node', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			responseMode: 'When Last Node Finishes',
		});
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
		await n8n.ndv.close();

		await addEditFieldsNode(n8n);

		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

		const response = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect(responseData.MyValue).toBe(1234);
	});

	test('should listen for a GET request and respond with last node binary data', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			responseMode: 'When Last Node Finishes',
		});
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
		await n8n.ndv.selectOptionInParameterDropdown('responseData', 'First Entry Binary');
		await n8n.ndv.close();

		await n8n.canvas.addNode('Edit Fields (Set)');
		const editFieldsNode = new EditFieldsNode(n8n.page);
		await editFieldsNode.setSingleFieldValue('data', 'string', cowBase64);
		await n8n.ndv.close();

		await n8n.canvas.addNode('Convert to File', { action: 'Convert to JSON' });
		await n8n.ndv.selectOptionInParameterDropdown('mode', 'Each Item to Separate File');
		await n8n.ndv.close();

		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

		const response = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect('data' in responseData).toBe(true);
	});

	test('should listen for a GET request and respond with an empty body', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			responseMode: 'When Last Node Finishes',
		});
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
		await n8n.ndv.selectOptionInParameterDropdown('responseData', 'No Response Body');
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.text();
		expect(responseData).toBe('');
	});

	test('should listen for a GET request with Basic Authentication', async ({ n8n }) => {
		const credentialName = `test-${nanoid()}`;
		const user = `test-${nanoid()}`;
		const password = `test-${nanoid()}`;
		await n8n.credentialsComposer.createFromApi({
			type: 'httpBasicAuth',
			name: credentialName,
			data: {
				user,
				password,
			},
		});

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			authentication: 'Basic Auth',
		});
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();

		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const failResponse = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
			headers: {
				Authorization: 'Basic ' + Buffer.from('wrong:wrong').toString('base64'),
			},
		});
		expect(failResponse.status()).toBe(403);

		const successResponse = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
			headers: {
				Authorization: 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'),
			},
		});
		expect(successResponse.ok()).toBe(true);
	});

	test('should listen for a GET request with Header Authentication', async ({ n8n }) => {
		const credentialName = `test-${nanoid()}`;
		const name = `test-${nanoid()}`;
		const value = `test-${nanoid()}`;
		await n8n.credentialsComposer.createFromApi({
			type: 'httpHeaderAuth',
			name: credentialName,
			data: {
				name,
				value,
			},
		});

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			authentication: 'Header Auth',
		});
		const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();

		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const failResponse = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
			headers: {
				test: 'wrong',
			},
		});

		expect(failResponse.status()).toBe(403);

		const successResponse = await n8n.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
			headers: {
				[name]: value,
			},
		});
		expect(successResponse.ok()).toBe(true);
	});

	test('CAT-1253-bug-cant-run-workflow-when-unconnected-nodes-have-errors', async ({ n8n }) => {
		// Add Webhook node
		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
		});
		await n8n.ndv.close();

		// Add No Operation node - it will connect automatically since Webhook node is in context
		await n8n.canvas.nodeByName('Webhook').click();
		await n8n.canvas.addNode('No Operation, do nothing', { closeNDV: true });

		// Verify connection was created
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		// Add HTTP Request node (unconnected, which will have an error)
		await n8n.canvas.deselectAll();
		await n8n.canvas.addNode('HTTP Request', { closeNDV: true });

		// Verify we now have 3 nodes but still only 1 connection
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		// Execute the workflow
		await n8n.canvas.clickExecuteWorkflowButton();

		// Assert that webhook is waiting for trigger
		await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

		// Assert that no error toast appeared
		await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
	});
});

async function addEditFieldsNode(n8n: n8nPage): Promise<void> {
	await n8n.canvas.addNode('Edit Fields (Set)');

	const editFieldsNode = new EditFieldsNode(n8n.page);
	await editFieldsNode.setSingleFieldValue('MyValue', 'number', 1234);

	await n8n.ndv.close();
}
