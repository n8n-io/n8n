import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'HTTP Request credential picker with mismatched credentials object',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should show saved credentials when nodeCredentialType matches despite mismatched credentials object', async ({
			n8n,
			api,
		}) => {
			await n8n.start.fromHome();

			const anthropicCredName = `Anthropic API ${nanoid()}`;
			await api.credentials.createCredential({
				name: anthropicCredName,
				type: 'anthropicApi',
				data: {
					apiKey: 'test-api-key-12345',
				},
			});

			const headerAuthCredName = `Header Auth ${nanoid()}`;
			const headerAuthCred = await api.credentials.createCredential({
				name: headerAuthCredName,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-api-key',
					value: 'test-value',
				},
			});

			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
						parameters: {
							method: 'POST',
							url: 'https://api.anthropic.com/v1/messages',
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'anthropicApi',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'anthropic-version',
										value: '2023-06-01',
									},
								],
							},
							sendBody: true,
							specifyBody: 'json',
							jsonBody: '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 1024}',
							options: {},
						},
						credentials: {
							httpHeaderAuth: {
								id: headerAuthCred.id,
								name: headerAuthCredName,
							},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
				active: false,
				settings: {},
			});

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.openNode('HTTP Request');
			await expect(n8n.ndv.container).toBeVisible();

			const credSelect = n8n.ndv.getCredentialSelect();
			await credSelect.click();

			const credOptions = n8n.ndv.getCredentialDropdownOptions();

			const anthropicOption = credOptions.filter({ hasText: anthropicCredName });
			await expect(anthropicOption).toBeVisible();

			const headerAuthOption = credOptions.filter({ hasText: headerAuthCredName });
			await expect(headerAuthOption).not.toBeVisible();
		});

		test('should persist credential selection across reload when mismatch is resolved', async ({
			n8n,
			api,
		}) => {
			await n8n.start.fromHome();

			const anthropicCredName = `Anthropic API ${nanoid()}`;
			await api.credentials.createCredential({
				name: anthropicCredName,
				type: 'anthropicApi',
				data: {
					apiKey: 'test-api-key-12345',
				},
			});

			const headerAuthCredName = `Header Auth ${nanoid()}`;
			const headerAuthCred = await api.credentials.createCredential({
				name: headerAuthCredName,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-api-key',
					value: 'test-value',
				},
			});

			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
						parameters: {
							method: 'POST',
							url: 'https://api.anthropic.com/v1/messages',
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'anthropicApi',
						},
						credentials: {
							httpHeaderAuth: {
								id: headerAuthCred.id,
								name: headerAuthCredName,
							},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
				active: false,
				settings: {},
			});

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.openNode('HTTP Request');
			await expect(n8n.ndv.container).toBeVisible();

			const credSelect = n8n.ndv.getCredentialSelect();
			await credSelect.click();

			await n8n.ndv.getCredentialOptionByText(anthropicCredName).click();

			await expect(credSelect).toHaveValue(anthropicCredName);

			const saveResponse = n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();
			await saveResponse;

			await n8n.page.reload();
			await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();

			await n8n.canvas.openNode('HTTP Request');
			await expect(n8n.ndv.container).toBeVisible();

			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(anthropicCredName);
		});
	},
);
