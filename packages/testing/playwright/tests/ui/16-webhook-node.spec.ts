import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

async function executeCanvasWebhookTest(n8n: n8nPage, httpMethod: string) {
	const webhookPath = nanoid();
	await n8n.workflows.clickAddWorkflowButton();
	await n8n.canvas.addNode('Webhook');

	await n8n.ndv.setupHelper.webhook({
		httpMethod,
		path: webhookPath,
	});

	await n8n.ndv.execute();

	await n8n.ndv.waitForListeningForTestEvent();

	const response = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`, {
		method: httpMethod,
	});
	return response;
}

test.describe
	.serial('Webhook Trigger node', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.goHome();
		});

		const httpMethods = ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'HEAD'];

		for (const httpMethod of httpMethods) {
			test(`should listen for a ${httpMethod} request`, async ({ n8n }) => {
				const response = await executeCanvasWebhookTest(n8n, httpMethod);
				expect(response.status()).toBe(200);
			});
		}

		test('should listen for a GET request and respond with Respond to Webhook node', async ({
			n8n,
		}) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: "Using 'Respond to Webhook' Node",
			});

			await n8n.ndv.close();

			await n8n.canvas.addNode('Edit Fields (Set)');

			await n8n.ndv.setEditFieldsValues([
				{
					name: 'MyValue',
					type: 'number',
					value: 1234,
				},
			]);

			await n8n.ndv.close();
			await n8n.canvas.addNode('Respond to Webhook');
			await n8n.ndv.close();
			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.canvas.waitForTriggerEvent();

			const response = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`, {
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

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
			});

			await n8n.ndv.clickAddOptionCombobox();
			await n8n.ndv.selectResponseCodeOption();

			await n8n.ndv.setParameterDropdown('responseCode', '201');

			await n8n.ndv.close();

			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.canvas.waitForTriggerEvent();

			const response = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(201);
		});

		test('should listen for a GET request and respond with last node', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: 'When Last Node Finishes',
			});

			await n8n.ndv.close();
			await n8n.canvas.addNode('Edit Fields (Set)');
			await n8n.ndv.setEditFieldsValues([
				{
					name: 'MyValue',
					type: 'number',
					value: 1234,
				},
			]);

			await n8n.ndv.close();
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.waitForTriggerEvent();

			const response = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`);
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

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: 'When Last Node Finishes',
				responseData: 'First Entry Binary',
			});

			await n8n.ndv.close();

			await n8n.canvas.addNode('Edit Fields (Set)');

			await n8n.ndv.setEditFieldsValues([
				{
					name: 'data',
					type: 'string',
					value: cowBase64,
				},
			]);

			await n8n.ndv.close();

			await n8n.canvas.addNodeWithSubItem('Convert to File', 'Convert to JSON');

			await n8n.ndv.setParameterDropdown('operation', 'Convert to JSON');
			await n8n.ndv.setParameterDropdown('mode', 'Each Item to Separate File');

			await n8n.ndv.close();

			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.canvas.waitForTriggerEvent();

			const response = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(200);

			const responseData = await response.json();
			expect(Object.keys(responseData)).toContain('data');
		});

		test('should listen for a GET request and respond with an empty body', async ({ n8n }) => {
			const webhookPath = nanoid();

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode('Webhook');

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				responseMode: 'When Last Node Finishes',
				responseData: 'No Response Body',
			});

			await n8n.ndv.execute();

			await n8n.canvas.waitForTriggerEvent();

			const response = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(200);

			const responseText = await response.text();
			expect(responseText).toBe('');
		});

		test('should listen for a GET request with Basic Authentication', async ({ n8n, api }) => {
			const webhookPath = nanoid();

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

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				authentication: 'Basic Auth',
			});

			await n8n.ndv.selectCredential(createdCredential.name);

			await n8n.ndv.execute();

			await n8n.ndv.waitForListeningForTestEvent();

			const wrongAuthResponse = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`, {
				headers: {
					Authorization: `Basic ${Buffer.from('username:password').toString('base64')}`,
				},
				failOnStatusCode: false,
			});
			expect(wrongAuthResponse.status()).toBe(403);

			const correctAuthResponse = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`, {
				headers: {
					Authorization: `Basic ${Buffer.from('test:test').toString('base64')}`,
				},
			});
			expect(correctAuthResponse.status()).toBe(200);
		});

		test('should listen for a GET request with Header Authentication', async ({ n8n, api }) => {
			const webhookPath = nanoid();

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

			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				path: webhookPath,
				authentication: 'Header Auth',
			});

			await n8n.ndv.selectCredential(createdCredential.name);

			await n8n.ndv.execute();

			await n8n.ndv.waitForListeningForTestEvent();

			const wrongHeaderResponse = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`, {
				headers: { test: 'wrong' },
				failOnStatusCode: false,
			});
			expect(wrongHeaderResponse.status()).toBe(403);

			const correctHeaderResponse = await n8n.page.request.fetch(`/webhook-test/${webhookPath}`, {
				headers: { test: 'test' },
			});
			expect(correctHeaderResponse.status()).toBe(200);
		});
	});
