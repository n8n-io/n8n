import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * GHC-7561: Webhooks + Authentication produce 501 and an HTML Response, No Logs
 * https://github.com/n8n-io/n8n/issues/27920
 *
 * Bug description:
 * - When authentication is enabled on a Webhook, production webhook calls return 501 with HTML response
 * - Test webhooks work fine
 * - Webhooks without authentication work fine
 * - MCP + Authentication works fine
 *
 * This test uses API-only setup to avoid UI flakiness and focus on the core webhook authentication issue.
 */
test.describe(
	'Webhook Authentication Production (API)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('GHC-7561: production webhook with Basic Auth should work', async ({ api }) => {
			// Create Basic Auth credential via API
			const credentialName = `basic-auth-${nanoid()}`;
			const user = `user-${nanoid()}`;
			const password = `password-${nanoid()}`;

			const credential = await api.credentials.createCredential({
				name: credentialName,
				type: 'httpBasicAuth',
				data: {
					user,
					password,
				},
			});

			// Create a webhook workflow with Basic Auth
			const webhookPath = nanoid();
			const workflow = await api.workflows.createWorkflow({
				name: `webhook-basic-auth-${nanoid()}`,
				nodes: [
					{
						parameters: {
							path: webhookPath,
							httpMethod: 'POST',
							authentication: 'basicAuth',
							responseMode: 'onReceived',
							options: {},
						},
						id: 'webhook-node',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2.1,
						position: [250, 300],
						webhookId: nanoid(),
						credentials: {
							httpBasicAuth: {
								id: credential.id.toString(),
								name: credentialName,
							},
						},
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: nanoid(),
										name: 'response',
										value: 'success',
										type: 'string',
									},
								],
							},
							options: {},
						},
						id: 'edit-fields-node',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [450, 300],
					},
				],
				connections: {
					Webhook: {
						main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
					},
				},
				active: false,
				settings: {
					executionOrder: 'v1',
				},
			});

			// Activate the workflow to enable production webhook
			await api.workflows.activate(workflow.id, workflow.versionId!);

			try {
				// Test 1: No auth - should return 401
				const noAuthResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
					},
				});

				expect(noAuthResponse.status()).toBe(401);

				// Test 2: Wrong auth - should return 403
				const wrongAuthResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Basic ' + Buffer.from('wrong:wrong').toString('base64'),
					},
				});

				expect(wrongAuthResponse.status()).toBe(403);

				// Test 3: Correct auth - should return 200 with JSON
				// BUG: This currently returns 501 with HTML response
				const successResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'),
					},
				});

				// These assertions will FAIL if the bug exists
				expect(successResponse.status()).toBe(200);

				const contentType = successResponse.headers()['content-type'];
				expect(contentType).toBeTruthy();
				expect(contentType).toContain('application/json');

				const responseText = await successResponse.text();
				expect(responseText).not.toContain('<!DOCTYPE html>');
				expect(responseText).not.toContain('<html');

				// Verify it's valid JSON
				const responseData = JSON.parse(responseText);
				expect(responseData).toBeDefined();
			} finally {
				// Cleanup
				await api.workflows.deactivate(workflow.id);
				await api.workflows.archive(workflow.id);
				await api.workflows.delete(workflow.id);
				await api.credentials.deleteCredential(credential.id);
			}
		});

		test('GHC-7561: production webhook with Bearer Auth should work', async ({ api }) => {
			// Create Bearer Auth credential via API
			const credentialName = `bearer-auth-${nanoid()}`;
			const token = `token-${nanoid()}`;

			const credential = await api.credentials.createCredential({
				name: credentialName,
				type: 'httpBearerAuth',
				data: {
					token,
				},
			});

			// Create a webhook workflow with Bearer Auth
			const webhookPath = nanoid();
			const workflow = await api.workflows.createWorkflow({
				name: `webhook-bearer-auth-${nanoid()}`,
				nodes: [
					{
						parameters: {
							path: webhookPath,
							httpMethod: 'POST',
							authentication: 'bearerAuth',
							responseMode: 'onReceived',
							options: {},
						},
						id: 'webhook-node',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2.1,
						position: [250, 300],
						webhookId: nanoid(),
						credentials: {
							httpBearerAuth: {
								id: credential.id.toString(),
								name: credentialName,
							},
						},
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: nanoid(),
										name: 'response',
										value: 'success',
										type: 'string',
									},
								],
							},
							options: {},
						},
						id: 'edit-fields-node',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [450, 300],
					},
				],
				connections: {
					Webhook: {
						main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
					},
				},
				active: false,
				settings: {
					executionOrder: 'v1',
				},
			});

			// Activate the workflow to enable production webhook
			await api.workflows.activate(workflow.id, workflow.versionId!);

			try {
				// Test 1: No auth - should return 401 or 403
				const noAuthResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
					},
				});

				expect([401, 403]).toContain(noAuthResponse.status());

				// Test 2: Wrong auth - should return 403
				const wrongAuthResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer wrong-token',
					},
				});

				expect(wrongAuthResponse.status()).toBe(403);

				// Test 3: Correct auth - should return 200 with JSON
				// BUG: This currently returns 501 with HTML response
				const successResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				});

				// These assertions will FAIL if the bug exists
				expect(successResponse.status()).toBe(200);

				const contentType = successResponse.headers()['content-type'];
				expect(contentType).toBeTruthy();
				expect(contentType).toContain('application/json');

				const responseText = await successResponse.text();
				expect(responseText).not.toContain('<!DOCTYPE html>');
				expect(responseText).not.toContain('<html');

				// Verify it's valid JSON
				const responseData = JSON.parse(responseText);
				expect(responseData).toBeDefined();
			} finally {
				// Cleanup
				await api.workflows.deactivate(workflow.id);
				await api.workflows.archive(workflow.id);
				await api.workflows.delete(workflow.id);
				await api.credentials.deleteCredential(credential.id);
			}
		});

		test('GHC-7561: production webhook with Header Auth should work', async ({ api }) => {
			// Create Header Auth credential via API
			const credentialName = `header-auth-${nanoid()}`;
			const headerName = `X-Custom-${nanoid()}`;
			const headerValue = `value-${nanoid()}`;

			const credential = await api.credentials.createCredential({
				name: credentialName,
				type: 'httpHeaderAuth',
				data: {
					name: headerName,
					value: headerValue,
				},
			});

			// Create a webhook workflow with Header Auth
			const webhookPath = nanoid();
			const workflow = await api.workflows.createWorkflow({
				name: `webhook-header-auth-${nanoid()}`,
				nodes: [
					{
						parameters: {
							path: webhookPath,
							httpMethod: 'POST',
							authentication: 'headerAuth',
							responseMode: 'onReceived',
							options: {},
						},
						id: 'webhook-node',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2.1,
						position: [250, 300],
						webhookId: nanoid(),
						credentials: {
							httpHeaderAuth: {
								id: credential.id.toString(),
								name: credentialName,
							},
						},
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: nanoid(),
										name: 'response',
										value: 'success',
										type: 'string',
									},
								],
							},
							options: {},
						},
						id: 'edit-fields-node',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [450, 300],
					},
				],
				connections: {
					Webhook: {
						main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
					},
				},
				active: false,
				settings: {
					executionOrder: 'v1',
				},
			});

			// Activate the workflow to enable production webhook
			await api.workflows.activate(workflow.id, workflow.versionId!);

			try {
				// Test 1: No auth header - should return 403
				const noAuthResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
					},
				});

				expect(noAuthResponse.status()).toBe(403);

				// Test 2: Wrong header value - should return 403
				const wrongAuthResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
						[headerName]: 'wrong-value',
					},
				});

				expect(wrongAuthResponse.status()).toBe(403);

				// Test 3: Correct header - should return 200 with JSON
				// BUG: This currently returns 501 with HTML response
				const successResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					body: JSON.stringify({ test: 'data' }),
					headers: {
						'Content-Type': 'application/json',
						[headerName]: headerValue,
					},
				});

				// These assertions will FAIL if the bug exists
				expect(successResponse.status()).toBe(200);

				const contentType = successResponse.headers()['content-type'];
				expect(contentType).toBeTruthy();
				expect(contentType).toContain('application/json');

				const responseText = await successResponse.text();
				expect(responseText).not.toContain('<!DOCTYPE html>');
				expect(responseText).not.toContain('<html');

				// Verify it's valid JSON
				const responseData = JSON.parse(responseText);
				expect(responseData).toBeDefined();
			} finally {
				// Cleanup
				await api.workflows.deactivate(workflow.id);
				await api.workflows.archive(workflow.id);
				await api.workflows.delete(workflow.id);
				await api.credentials.deleteCredential(credential.id);
			}
		});
	},
);
