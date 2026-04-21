import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'form-endpoint-isolation' } } });

test.describe(
	'Form Endpoint Isolation',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('forms should only be accessible via /form path, not /webhook path', async ({ api }) => {
			// Create a workflow with a Form Trigger node
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

			// Activate the workflow
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Form should be accessible via /form path
			const formResponse = await api.webhooks.trigger(`/form/${webhookId}`);
			expect(formResponse.ok()).toBe(true);
			expect(formResponse.status()).toBe(200);

			// BUG: Form should NOT be accessible via /webhook path
			// Currently this test will FAIL because forms are accessible via both paths
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookId}`);
			expect(webhookResponse.ok()).toBe(false);
			expect(webhookResponse.status()).toBe(404);
		});

		test('regular webhooks should only be accessible via /webhook path, not /form path', async ({
			api,
		}) => {
			// Create a workflow with a regular Webhook node (not form)
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

			// Activate the workflow
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Webhook should be accessible via /webhook path
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);
			expect(webhookResponse.ok()).toBe(true);
			expect(webhookResponse.status()).toBe(200);

			// BUG: Regular webhook should NOT be accessible via /form path
			// Currently this test will FAIL because webhooks are accessible via both paths
			const formResponse = await api.webhooks.trigger(`/form/${webhookPath}`);
			expect(formResponse.ok()).toBe(false);
			expect(formResponse.status()).toBe(404);
		});
	},
);
