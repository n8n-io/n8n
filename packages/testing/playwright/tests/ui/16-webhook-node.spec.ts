import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import { EditFieldsNode } from '../../pages/nodes/EditFieldsNode';

const cowBase64 =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

test.describe('Webhook Trigger node', () => {
	test.describe.configure({ mode: 'serial' });
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	const HTTP_METHODS = ['GET', 'POST', 'DELETE', 'HEAD', 'PATCH', 'PUT'];
	for (const httpMethod of HTTP_METHODS) {
		test(`should listen for a ${httpMethod} request`, async ({ n8n }) => {
			const webhookPath = nanoid();
			await n8n.canvas.addNode('Webhook');
			await n8n.ndv.setupHelper.webhook({ httpMethod, path: webhookPath });
			await n8n.ndv.execute();
			await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();
			const response = await n8n.api.request.fetch(`/webhook-test/${webhookPath}`, {
				method: httpMethod,
			});
			expect(response.ok()).toBe(true);
		});
	}

	test('should listen for a GET request and respond with Respond to Webhook node', async ({
		n8n,
	}) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			responseMode: "Using 'Respond to Webhook' Node",
		});
		await n8n.ndv.close();
		await addEditFieldsNode(n8n);
		await n8n.canvas.addNode('Respond to Webhook', { closeNDV: true });

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();
		const response = await n8n.api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect(responseData.MyValue).toBe(1234);
	});

	test('should listen for a GET request and respond with custom status code 201', async ({
		n8n,
	}) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({ httpMethod: 'GET', path: webhookPath });

		await n8n.ndv.setOptionalParameter('Response Code', 'responseCode', '201');
		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const response = await n8n.api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.status()).toBe(201);
	});

	test('should listen for a GET request and respond with last node', async ({ n8n }) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			responseMode: 'When Last Node Finishes',
		});
		await n8n.ndv.close();

		await addEditFieldsNode(n8n);

		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(n8n.canvas.waitingForTriggerEvent()).toBeVisible();

		const response = await n8n.api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect(responseData.MyValue).toBe(1234);
	});

	test('should listen for a GET request and respond with last node binary data', async ({
		n8n,
	}) => {
		const webhookPath = nanoid();

		await n8n.canvas.addNode('Webhook');
		await n8n.ndv.setupHelper.webhook({
			httpMethod: 'GET',
			path: webhookPath,
			responseMode: 'When Last Node Finishes',
		});
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

		const response = await n8n.api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.json();
		expect('data' in responseData).toBe(true);
	});

	test('should listen for a GET request and respond with an empty body', async ({ n8n }) => {
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

		const response = await n8n.api.request.get(`/webhook-test/${webhookPath}`);
		expect(response.ok()).toBe(true);

		const responseData = await response.text();
		expect(responseData).toBe('');
	});

	test('should listen for a GET request with Basic Authentication', async ({ n8n }) => {
		const webhookPath = nanoid();
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
			path: webhookPath,
			authentication: 'Basic Auth',
		});

		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const failResponse = await n8n.api.request.get(`/webhook-test/${webhookPath}`, {
			headers: {
				Authorization: 'Basic ' + Buffer.from('wrong:wrong').toString('base64'),
			},
		});
		expect(failResponse.status()).toBe(403);

		const successResponse = await n8n.api.request.get(`/webhook-test/${webhookPath}`, {
			headers: {
				Authorization: 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'),
			},
		});
		expect(successResponse.ok()).toBe(true);
	});

	test('should listen for a GET request with Header Authentication', async ({ n8n, api }) => {
		const webhookPath = nanoid();
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
			path: webhookPath,
			authentication: 'Header Auth',
		});

		await n8n.ndv.execute();
		await expect(n8n.ndv.getWebhookTestEvent()).toBeVisible();

		const failResponse = await api.request.get(`/webhook-test/${webhookPath}`, {
			headers: {
				test: 'wrong',
			},
		});

		expect(failResponse.status()).toBe(403);

		const successResponse = await api.request.get(`/webhook-test/${webhookPath}`, {
			headers: {
				[name]: value,
			},
		});
		expect(successResponse.ok()).toBe(true);
	});
});

async function addEditFieldsNode(n8n: n8nPage): Promise<void> {
	await n8n.canvas.addNode('Edit Fields (Set)');

	const editFieldsNode = new EditFieldsNode(n8n.page);
	await editFieldsNode.setSingleFieldValue('MyValue', 'number', 1234);

	await n8n.ndv.close();
}
