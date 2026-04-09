import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Credential Mismatch Bug (GHC-7669)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should show saved credentials when nodeCredentialType matches despite mismatched credentials object', async ({
			n8n,
			api,
		}) => {
			const projectId = await n8n.start.fromNewProject();

			// Create an anthropicApi credential via API
			const anthropicCredName = `Anthropic API ${nanoid()}`;
			const anthropicCred = await api.credentials.createCredential({
				name: anthropicCredName,
				type: 'anthropicApi',
				data: {
					apiKey: 'test-api-key-12345',
				},
				projectId,
			});

			// Create an httpHeaderAuth credential (simulating the mismatch scenario)
			const headerAuthCredName = `Header Auth ${nanoid()}`;
			const headerAuthCred = await api.credentials.createCredential({
				name: headerAuthCredName,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-api-key',
					value: 'test-value',
				},
				projectId,
			});

			// Create a workflow with HTTP Request node that has mismatched credentials
			// The node specifies it should use 'anthropicApi' type, but has 'httpHeaderAuth' attached
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
							nodeCredentialType: 'anthropicApi', // Node expects anthropicApi
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
						// Bug: credentials object has httpHeaderAuth instead of anthropicApi
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
				projectId,
			});

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Open the HTTP Request node
			await n8n.canvas.openNode('HTTP Request');

			// Wait for NDV to be visible
			await expect(n8n.ndv.container).toBeVisible();

			// Click on the credential select to open the dropdown
			const credSelect = n8n.ndv.getCredentialSelect();
			await credSelect.click();

			// Get all credential options in the dropdown
			const credOptions = n8n.ndv.getCredentialDropdownOptions();

			// The bug: saved anthropicApi credential should be visible in the dropdown
			// because the node's nodeCredentialType is 'anthropicApi'
			// But due to the mismatch, it's not shown
			const anthropicOption = credOptions.filter({ hasText: anthropicCredName });
			await expect(anthropicOption).toBeVisible();

			// The httpHeaderAuth credential should NOT be visible
			// because the nodeCredentialType is 'anthropicApi', not 'httpHeaderAuth'
			const headerAuthOption = credOptions.filter({ hasText: headerAuthCredName });
			await expect(headerAuthOption).not.toBeVisible();
		});

		test('should allow switching to correct credential type when mismatch is detected', async ({
			n8n,
			api,
		}) => {
			const projectId = await n8n.start.fromNewProject();

			// Create both credential types
			const anthropicCredName = `Anthropic API ${nanoid()}`;
			await api.credentials.createCredential({
				name: anthropicCredName,
				type: 'anthropicApi',
				data: {
					apiKey: 'test-api-key-12345',
				},
				projectId,
			});

			const headerAuthCredName = `Header Auth ${nanoid()}`;
			const headerAuthCred = await api.credentials.createCredential({
				name: headerAuthCredName,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-api-key',
					value: 'test-value',
				},
				projectId,
			});

			// Create workflow with mismatched credentials
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
				projectId,
			});

			// Navigate and open the node
			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.openNode('HTTP Request');
			await expect(n8n.ndv.container).toBeVisible();

			// Open credential dropdown
			const credSelect = n8n.ndv.getCredentialSelect();
			await credSelect.click();

			// Select the correct anthropicApi credential
			await n8n.ndv.getCredentialOptionByText(anthropicCredName).click();

			// Verify the credential is now selected
			await expect(credSelect).toHaveValue(anthropicCredName);

			// Close NDV and save workflow
			await n8n.ndv.close();
			await n8n.canvas.saveWorkflow();

			// Reload the page to verify persistence
			await n8n.page.reload();
			await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();

			// Open the node again
			await n8n.canvas.openNode('HTTP Request');
			await expect(n8n.ndv.container).toBeVisible();

			// Verify the correct credential is still selected after reload
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(anthropicCredName);
		});
	},
);
