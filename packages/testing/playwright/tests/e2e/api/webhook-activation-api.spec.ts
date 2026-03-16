import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';
import type { IWorkflowBase } from 'n8n-workflow';

test.describe(
	'Webhook Registration via API - GHC-5388',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fail: webhook created via API without webhookId does not register production path', async ({
			api,
		}) => {
			const workflowName = `Test Webhook ${nanoid()}`;
			const webhookPath = `test-webhook-${nanoid()}`;

			// Create workflow WITHOUT webhookId (simulating user behavior via public API)
			const workflow: Partial<IWorkflowBase> = {
				name: workflowName,
				active: false,
				nodes: [
					{
						id: nanoid(),
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [250, 300] as [number, number],
						// Note: No webhookId field - this is the bug!
						parameters: {
							httpMethod: 'POST',
							path: webhookPath,
							responseMode: 'onReceived',
						},
					},
					{
						id: nanoid(),
						name: 'Respond to Webhook',
						type: 'n8n-nodes-base.respondToWebhook',
						typeVersion: 1,
						position: [450, 300] as [number, number],
						parameters: {
							respondWith: 'json',
							responseBody: '={{ { "status": "success" } }}',
						},
					},
				],
				connections: {
					Webhook: {
						main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
					},
				},
				settings: {},
			};

			// Create workflow via API
			const createdWorkflow = await api.workflows.createWorkflow(workflow);
			const workflowId = String(createdWorkflow.id);

			// Activate workflow via API
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Try to trigger the production webhook - this should work but will fail with 404
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { test: 'data' },
			});

			// This assertion will FAIL - demonstrating the bug
			// Expected: 200 OK
			// Actual: 404 Not Found - "The requested webhook POST {webhookPath} is not registered."
			expect(webhookResponse.ok()).toBe(true);
		});

		test('should succeed: webhook created via API WITH webhookId registers production path correctly', async ({
			api,
		}) => {
			const workflowName = `Test Webhook ${nanoid()}`;
			const webhookPath = `test-webhook-${nanoid()}`;
			const webhookId = nanoid();

			// Create workflow WITH webhookId (workaround)
			const workflow: Partial<IWorkflowBase> = {
				name: workflowName,
				active: false,
				nodes: [
					{
						id: nanoid(),
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [250, 300] as [number, number],
						webhookId, // THIS is the workaround - users shouldn't need to provide this
						parameters: {
							httpMethod: 'POST',
							path: webhookPath,
							responseMode: 'onReceived',
						},
					},
					{
						id: nanoid(),
						name: 'Respond to Webhook',
						type: 'n8n-nodes-base.respondToWebhook',
						typeVersion: 1,
						position: [450, 300] as [number, number],
						parameters: {
							respondWith: 'json',
							responseBody: '={{ { "status": "success" } }}',
						},
					},
				],
				connections: {
					Webhook: {
						main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
					},
				},
				settings: {},
			};

			// Create workflow via API
			const createdWorkflow = await api.workflows.createWorkflow(workflow);
			const workflowId = String(createdWorkflow.id);

			// Activate workflow via API
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Trigger the production webhook - this should work with the webhookId
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { test: 'data' },
			});

			// This should succeed
			expect(webhookResponse.ok()).toBe(true);

			// Verify execution occurred
			const execution = await api.workflows.waitForExecution(workflowId, 5000);
			expect(execution.status).toBe('success');
		});

		test('should fail: reactivating workflow without webhookId does not fix registration', async ({
			api,
		}) => {
			const workflowName = `Test Webhook ${nanoid()}`;
			const webhookPath = `test-webhook-${nanoid()}`;

			// Create workflow WITHOUT webhookId
			const workflow: Partial<IWorkflowBase> = {
				name: workflowName,
				active: false,
				nodes: [
					{
						id: nanoid(),
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [250, 300] as [number, number],
						// No webhookId
						parameters: {
							httpMethod: 'POST',
							path: webhookPath,
							responseMode: 'onReceived',
						},
					},
					{
						id: nanoid(),
						name: 'Respond to Webhook',
						type: 'n8n-nodes-base.respondToWebhook',
						typeVersion: 1,
						position: [450, 300] as [number, number],
						parameters: {
							respondWith: 'json',
							responseBody: '={{ { "status": "success" } }}',
						},
					},
				],
				connections: {
					Webhook: {
						main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
					},
				},
				settings: {},
			};

			// Create and activate workflow
			const createdWorkflow = await api.workflows.createWorkflow(workflow);
			const workflowId = String(createdWorkflow.id);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Try deactivate and reactivate cycle - this doesn't fix the issue
			await api.workflows.deactivate(workflowId);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Try to trigger the production webhook - still fails
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { test: 'data' },
			});

			// This assertion will FAIL - deactivate/reactivate doesn't fix the issue
			expect(webhookResponse.ok()).toBe(true);
		});

		test('should fail: patching workflow without adding webhookId does not fix registration', async ({
			api,
		}) => {
			const workflowName = `Test Webhook ${nanoid()}`;
			const webhookPath = `test-webhook-${nanoid()}`;

			// Create workflow WITHOUT webhookId
			const workflow: Partial<IWorkflowBase> = {
				name: workflowName,
				active: false,
				nodes: [
					{
						id: nanoid(),
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [250, 300] as [number, number],
						// No webhookId
						parameters: {
							httpMethod: 'POST',
							path: webhookPath,
							responseMode: 'onReceived',
						},
					},
					{
						id: nanoid(),
						name: 'Respond to Webhook',
						type: 'n8n-nodes-base.respondToWebhook',
						typeVersion: 1,
						position: [450, 300] as [number, number],
						parameters: {
							respondWith: 'json',
							responseBody: '={{ { "status": "success" } }}',
						},
					},
				],
				connections: {
					Webhook: {
						main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
					},
				},
				settings: {},
			};

			// Create and activate workflow
			const createdWorkflow = await api.workflows.createWorkflow(workflow);
			const workflowId = String(createdWorkflow.id);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Try patching with a no-op update - this doesn't fix the issue either
			await api.workflows.update(workflowId, createdWorkflow.versionId!, {
				name: workflowName, // Same name, no actual change
			});

			// Reactivate after patch
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Try to trigger the production webhook - still fails
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { test: 'data' },
			});

			// This assertion will FAIL - patching doesn't fix the issue
			expect(webhookResponse.ok()).toBe(true);
		});
	},
);
