import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Reproduction test for GHC-7344
 *
 * Bug: After pulling a workflow from git/source control, HTTP Request nodes lose
 * their credential binding. The credentials appear unset, and trying to reassign
 * them triggers errors. The only workaround is to copy/paste the node.
 *
 * This test simulates the pull operation by:
 * 1. Creating a workflow with HTTP Request nodes using predefined credentials
 * 2. Exporting the workflow (get its JSON)
 * 3. Deleting the workflow
 * 4. Importing it back (simulates git pull)
 * 5. Verifying that credentials are still properly bound
 */
test.describe(
	'HTTP Request node credential preservation on workflow pull (GHC-7344)',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should preserve predefinedCredentialType (oktaApi) after workflow import', async ({
			n8n,
		}) => {
			const projectId = await n8n.start.fromNewProjectBlankCanvas();

			// Create a credential for the HTTP Request node
			const credentialName = `Okta Cred ${nanoid()}`;
			await n8n.api.credentials.createCredential({
				name: credentialName,
				type: 'oktaApi',
				data: {
					url: 'https://sandbox-test.oktapreview.com',
					apiToken: 'test-token-123',
				},
				projectId,
			});

			// Create HTTP Request node with predefined Okta credential
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('HTTP Request', { closeNDV: false });

			// Configure HTTP Request to use predefinedCredentialType with oktaApi
			await n8n.ndv.getParameterInputField('url').fill('https://sandbox-test.oktapreview.com/api/v1/groups');

			// Set authentication to predefined credential type
			await n8n.ndv.getParameterInputField('authentication').selectOption('predefinedCredentialType');
			await n8n.ndv.getParameterInputField('nodeCredentialType').selectOption('oktaApi');

			// Select the credential
			await n8n.ndv.getCredentialSelect().selectOption(credentialName);

			await n8n.ndv.closeNdv();

			// Save the workflow
			const workflowName = `Test Workflow ${nanoid()}`;
			await n8n.canvas.getCanvasSaveButton().click();
			await n8n.page.getByTestId('workflow-name-input').fill(workflowName);
			await n8n.page.getByTestId('workflow-name-input').press('Enter');
			await n8n.page.waitForResponse((resp) => resp.url().includes('/rest/workflows') && resp.status() === 200);

			// Get the workflow ID and export its JSON (simulates git export)
			const workflows = await n8n.api.workflows.getWorkflows();
			const workflow = workflows.find((w: any) => w.name === workflowName);
			expect(workflow).toBeDefined();
			const workflowId = workflow.id;

			// Get the full workflow data
			const response = await n8n.page.request.get(`/rest/workflows/${workflowId}`);
			const workflowData = await response.json();
			const exportedWorkflow = workflowData.data ?? workflowData;

			// Verify the HTTP Request node has the credential properly set before import
			const httpRequestNode = exportedWorkflow.nodes.find((n: any) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpRequestNode).toBeDefined();
			expect(httpRequestNode.parameters.authentication).toBe('predefinedCredentialType');
			expect(httpRequestNode.parameters.nodeCredentialType).toBe('oktaApi');
			expect(httpRequestNode.credentials).toBeDefined();
			expect(httpRequestNode.credentials.oktaApi).toBeDefined();
			expect(httpRequestNode.credentials.oktaApi.name).toBe(credentialName);
			expect(httpRequestNode.credentials.oktaApi.id).toBeDefined();

			// Delete the workflow (clean slate for import)
			await n8n.api.workflows.delete(workflowId);

			// Import the workflow back (simulates git pull)
			// Remove id and versionId to force creation of new workflow
			delete exportedWorkflow.id;
			delete exportedWorkflow.versionId;
			exportedWorkflow.name = `${workflowName} (Imported)`;

			const importedWorkflow = await n8n.api.workflows.createWorkflow(exportedWorkflow);

			// Navigate to the imported workflow
			await n8n.navigate.toWorkflow(importedWorkflow.id);
			await n8n.page.waitForLoadState('networkidle');

			// Open the HTTP Request node to verify credentials
			await n8n.canvas.getCanvasNode('HTTP Request').click();

			// THIS IS WHERE THE BUG MANIFESTS:
			// The credential should still be properly bound to the node
			// Bug: After import, the credential binding is lost or corrupted

			// Verify the credential is still selected
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);

			// Verify the authentication parameters are preserved
			await expect(n8n.ndv.getParameterInputField('authentication')).toHaveValue('predefinedCredentialType');
			await expect(n8n.ndv.getParameterInputField('nodeCredentialType')).toHaveValue('oktaApi');

			// Verify there are no error indicators on the credential field
			const credentialContainer = n8n.page.getByTestId('credential-select').locator('..');
			await expect(credentialContainer.locator('[class*="error"]')).not.toBeVisible();
		});

		test('should preserve genericCredentialType (httpHeaderAuth) after workflow import', async ({
			n8n,
		}) => {
			const projectId = await n8n.start.fromNewProjectBlankCanvas();

			// Create a credential for the HTTP Request node
			const credentialName = `Header Auth ${nanoid()}`;
			await n8n.api.credentials.createCredential({
				name: credentialName,
				type: 'httpHeaderAuth',
				data: {
					name: 'Authorization',
					value: 'Bearer test-token',
				},
				projectId,
			});

			// Create HTTP Request node with generic credential type
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('HTTP Request', { closeNDV: false });

			// Configure HTTP Request to use genericCredentialType with httpHeaderAuth
			await n8n.ndv.getParameterInputField('url').fill('https://api.example.com/data');

			// Set authentication to generic credential type
			await n8n.ndv.getParameterInputField('authentication').selectOption('genericCredentialType');
			await n8n.ndv.getParameterInputField('genericAuthType').selectOption('httpHeaderAuth');

			// Select the credential
			await n8n.ndv.getCredentialSelect().selectOption(credentialName);

			await n8n.ndv.closeNdv();

			// Save the workflow
			const workflowName = `Test Workflow ${nanoid()}`;
			await n8n.canvas.getCanvasSaveButton().click();
			await n8n.page.getByTestId('workflow-name-input').fill(workflowName);
			await n8n.page.getByTestId('workflow-name-input').press('Enter');
			await n8n.page.waitForResponse((resp) => resp.url().includes('/rest/workflows') && resp.status() === 200);

			// Get the workflow ID and export its JSON (simulates git export)
			const workflows = await n8n.api.workflows.getWorkflows();
			const workflow = workflows.find((w: any) => w.name === workflowName);
			expect(workflow).toBeDefined();
			const workflowId = workflow.id;

			// Get the full workflow data
			const response = await n8n.page.request.get(`/rest/workflows/${workflowId}`);
			const workflowData = await response.json();
			const exportedWorkflow = workflowData.data ?? workflowData;

			// Verify the HTTP Request node has the credential properly set before import
			const httpRequestNode = exportedWorkflow.nodes.find((n: any) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpRequestNode).toBeDefined();
			expect(httpRequestNode.parameters.authentication).toBe('genericCredentialType');
			expect(httpRequestNode.parameters.genericAuthType).toBe('httpHeaderAuth');
			expect(httpRequestNode.credentials).toBeDefined();
			expect(httpRequestNode.credentials.httpHeaderAuth).toBeDefined();
			expect(httpRequestNode.credentials.httpHeaderAuth.name).toBe(credentialName);
			expect(httpRequestNode.credentials.httpHeaderAuth.id).toBeDefined();

			// Delete the workflow (clean slate for import)
			await n8n.api.workflows.delete(workflowId);

			// Import the workflow back (simulates git pull)
			delete exportedWorkflow.id;
			delete exportedWorkflow.versionId;
			exportedWorkflow.name = `${workflowName} (Imported)`;

			const importedWorkflow = await n8n.api.workflows.createWorkflow(exportedWorkflow);

			// Navigate to the imported workflow
			await n8n.navigate.toWorkflow(importedWorkflow.id);
			await n8n.page.waitForLoadState('networkidle');

			// Open the HTTP Request node to verify credentials
			await n8n.canvas.getCanvasNode('HTTP Request').click();

			// THIS IS WHERE THE BUG MANIFESTS:
			// The credential should still be properly bound to the node
			// Bug: After import, the credential binding is lost or corrupted
			// According to the issue, this affects both predefined and generic credential types

			// Verify the credential is still selected
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);

			// Verify the authentication parameters are preserved
			await expect(n8n.ndv.getParameterInputField('authentication')).toHaveValue('genericCredentialType');
			await expect(n8n.ndv.getParameterInputField('genericAuthType')).toHaveValue('httpHeaderAuth');

			// Verify there are no error indicators on the credential field
			const credentialContainer = n8n.page.getByTestId('credential-select').locator('..');
			await expect(credentialContainer.locator('[class*="error"]')).not.toBeVisible();
		});
	},
);
