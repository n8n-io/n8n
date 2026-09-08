import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'form-endpoint-isolation' } } });

test.describe(
	'Form Endpoint Isolation',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		const cleanupWorkflowIds: string[] = [];

		test.afterEach(async ({ api }) => {
			while (cleanupWorkflowIds.length > 0) {
				try {
					// Webhook paths are non-unique in these tests, so a flaky run would otherwise
					// leave active webhooks behind and fail the next activation with a conflict.
					const workflowId = cleanupWorkflowIds.pop();
					await api.workflows.deactivate(workflowId!);
					await api.workflows.delete(workflowId!);
				} catch {
					// ignore potential errors in the cleanup process
				}
			}
		});

		test('form triggers are served on /form and return 404 on /webhook', async ({ api }) => {
			const webhookId = nanoid();
			const workflow: Partial<IWorkflowBase> = {
				name: `Form Endpoint Test ${nanoid()}`,
				nodes: [
					{
						parameters: {
							formTitle: 'Test Form',
							formDescription: 'This is a test form',
							formFields: {
								values: [
									{
										fieldLabel: 'Name',
										fieldType: 'text',
										requiredField: true,
									},
								],
							},
							options: {},
						},
						type: 'n8n-nodes-base.formTrigger',
						typeVersion: 2.5,
						position: [0, 0],
						id: nanoid(),
						name: 'Form Trigger',
						webhookId,
					},
				],
				connections: {},
			};

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				workflow,
				{ makeUnique: false },
			);
			cleanupWorkflowIds.push(workflowId);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const formResponse = await api.webhooks.trigger(`/form/${webhookId}`);
			expect(formResponse.ok()).toBe(true);
			expect(formResponse.status()).toBe(200);

			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookId}`);
			expect(webhookResponse.ok()).toBe(false);
			expect(webhookResponse.status()).toBe(404);
		});

		test('regular webhooks are served on /webhook and return 404 on /form', async ({ api }) => {
			const webhookPath = `webhook-test-${nanoid()}`;
			const workflow: Partial<IWorkflowBase> = {
				name: `Webhook Endpoint Test ${nanoid()}`,
				nodes: [
					{
						parameters: {
							httpMethod: 'GET',
							path: webhookPath,
							options: {},
						},
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [0, 0],
						id: nanoid(),
						name: 'Webhook',
						webhookId: nanoid(),
					},
				],
				connections: {},
			};

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				workflow,
				{ makeUnique: false },
			);
			cleanupWorkflowIds.push(workflowId);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);
			expect(webhookResponse.ok()).toBe(true);
			expect(webhookResponse.status()).toBe(200);

			const formResponse = await api.webhooks.trigger(`/form/${webhookPath}`);
			expect(formResponse.ok()).toBe(false);
			expect(formResponse.status()).toBe(404);
		});
	},
);
