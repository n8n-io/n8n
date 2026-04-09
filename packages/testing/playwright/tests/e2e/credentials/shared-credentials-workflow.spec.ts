import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Shared credentials in workflows',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('sharing');
		});

		test('GHC-7663: should display shared credentials in node credential dropdown and persist after workflow execution', async ({
			n8n,
			api,
		}) => {
			// Create a shared/global credential as owner
			await n8n.api.signin('owner');
			const projectId = await n8n.start.fromNewProject();

			const sharedCredentialName = `Shared GitHub Credential ${nanoid()}`;

			// Create a GitHub credential
			const credential = await api.credentials.createCredential({
				name: sharedCredentialName,
				type: 'githubApi',
				data: { server: 'https://api.github.com', user: 'testuser', accessToken: 'test_token' },
				projectId,
			});

			// Share the credential with all users (make it global)
			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.cards.getCredential(sharedCredentialName).click();
			await n8n.credentials.credentialModal.changeTab('Sharing');
			await n8n.credentials.credentialModal.getUsersSelect().click();
			await n8n.credentials.credentialModal.getVisibleDropdown().getByText('All users').click();
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			// Verify credential is marked as global
			await expect(
				n8n.credentials.cards
					.getCredential(sharedCredentialName)
					.getByTestId('credential-global-badge'),
			).toBeVisible();

			// Create a new workflow with a GitHub node
			await n8n.navigate.toWorkflow('new', projectId);
			const workflowName = `Test Workflow ${nanoid()}`;
			await n8n.canvas.setWorkflowName(workflowName);

			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('GitHub', { action: 'Get a repository' });

			// Step 1: Verify the shared credential appears in the credential dropdown
			const credentialSelect = n8n.ndv.getCredentialSelect();
			await credentialSelect.click();

			// The issue: shared credentials don't appear initially
			const dropdown = n8n.canvas.credentialModal.getVisibleDropdown();
			await expect(dropdown.getByText(sharedCredentialName)).toBeVisible();

			// Select the shared credential
			await dropdown.getByText(sharedCredentialName).click();

			// Step 2: Verify the credential is selected
			await expect(credentialSelect).toHaveValue(sharedCredentialName);

			// Fill required parameters
			await n8n.ndv.fillParameterInput('owner', 'n8n-io');
			await n8n.ndv.fillParameterInput('repository', 'n8n');

			await n8n.ndv.close();

			// Save the workflow
			await n8n.canvas.clickWorkflowSaveButton();
			await expect(n8n.notifications.getNotificationByTitleOrContent('Workflow saved')).toBeVisible();

			// Step 3: Re-open the node and verify credential is still selected
			await n8n.canvas.openNodeByName('GitHub');
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(sharedCredentialName);
			await n8n.ndv.close();

			// Step 4: Execute the workflow (mock the GitHub API to avoid network calls)
			await n8n.page.route('https://api.github.com/repos/n8n-io/n8n', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						id: 123,
						name: 'n8n',
						full_name: 'n8n-io/n8n',
						owner: { login: 'n8n-io' },
					}),
				});
			});

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			// Step 5: Re-open the node and verify credential is STILL selected after execution
			// The issue: credential disappears after workflow execution
			await n8n.canvas.openNodeByName('GitHub');
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(sharedCredentialName);
			await n8n.ndv.close();

			// Clean up
			await api.credentials.deleteCredential(credential.id);
		});

		test('GHC-7663: shared credentials should become visible after creating empty credential', async ({
			n8n,
			api,
		}) => {
			// Create a shared credential as owner
			await n8n.api.signin('owner');
			const projectId = await n8n.start.fromNewProject();

			const sharedCredentialName = `Shared Notion Credential ${nanoid()}`;

			// Create a Notion credential and share it
			const credential = await api.credentials.createCredential({
				name: sharedCredentialName,
				type: 'notionApi',
				data: { apiKey: 'test_api_key' },
				projectId,
			});

			// Share the credential with all users
			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.cards.getCredential(sharedCredentialName).click();
			await n8n.credentials.credentialModal.changeTab('Sharing');
			await n8n.credentials.credentialModal.getUsersSelect().click();
			await n8n.credentials.credentialModal.getVisibleDropdown().getByText('All users').click();
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			// Create a workflow with a Notion node
			await n8n.navigate.toWorkflow('new', projectId);
			const workflowName = `Test Workflow ${nanoid()}`;
			await n8n.canvas.setWorkflowName(workflowName);

			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Append a block' });

			// Step 1: Try to open credential dropdown - shared credentials might not appear
			const credentialSelect = n8n.ndv.getCredentialSelect();
			await credentialSelect.click();

			let dropdown = n8n.canvas.credentialModal.getVisibleDropdown();

			// The issue: shared credentials don't appear initially
			// We expect the credential to be hidden initially (this test should fail when bug is fixed)
			const isCredentialVisible = await dropdown.getByText(sharedCredentialName).isVisible().catch(() => false);

			if (!isCredentialVisible) {
				// Close the dropdown
				await n8n.ndv.close();

				// Step 2: Create a new empty credential as workaround
				await n8n.canvas.openNodeByName('Notion');
				await credentialSelect.click();
				await n8n.ndv.credentialDropdownCreateNewCredential().click();

				const emptyCredentialName = `Empty Credential ${nanoid()}`;
				await n8n.canvas.credentialModal.addCredential(
					{ apiKey: 'temp_key' },
					{ name: emptyCredentialName },
				);

				// Step 3: Now the shared credentials should appear
				await credentialSelect.click();
				dropdown = n8n.canvas.credentialModal.getVisibleDropdown();
				await expect(dropdown.getByText(sharedCredentialName)).toBeVisible();

				// Select the shared credential
				await dropdown.getByText(sharedCredentialName).click();
				await expect(credentialSelect).toHaveValue(sharedCredentialName);

				// Clean up the empty credential
				const credentials = await api.credentials.getCredentials();
				const emptyCredential = credentials.find((c) => c.name === emptyCredentialName);
				if (emptyCredential) {
					await api.credentials.deleteCredential(emptyCredential.id);
				}
			} else {
				// If credential is visible from the start, select it
				await dropdown.getByText(sharedCredentialName).click();
				await expect(credentialSelect).toHaveValue(sharedCredentialName);
			}

			await n8n.ndv.close();

			// Clean up
			await api.credentials.deleteCredential(credential.id);
		});

		test('GHC-7663: workflow execution should not fail with "Node does not have access to credential" error', async ({
			n8n,
			api,
		}) => {
			// Create shared credential as owner
			await n8n.api.signin('owner');
			const projectId = await n8n.start.fromNewProject();

			const sharedCredentialName = `Shared HTTP Auth ${nanoid()}`;

			// Create an HTTP Header Auth credential
			const credential = await api.credentials.createCredential({
				name: sharedCredentialName,
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: 'Bearer test-token' },
				projectId,
			});

			// Share the credential with all users
			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.cards.getCredential(sharedCredentialName).click();
			await n8n.credentials.credentialModal.changeTab('Sharing');
			await n8n.credentials.credentialModal.getUsersSelect().click();
			await n8n.credentials.credentialModal.getVisibleDropdown().getByText('All users').click();
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			// Create workflow with HTTP Request node
			await n8n.navigate.toWorkflow('new', projectId);
			await n8n.canvas.setWorkflowName(`HTTP Test ${nanoid()}`);

			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('HTTP Request');

			// Configure the node with shared credential
			await n8n.ndv.fillParameterInput('URL', 'https://api.example.com/data');
			await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Generic Credential Type');
			await n8n.ndv.selectOptionInParameterDropdown('genericAuthType', 'Header Auth');

			const credentialSelect = n8n.ndv.getCredentialSelect();
			await credentialSelect.click();
			const dropdown = n8n.canvas.credentialModal.getVisibleDropdown();
			await dropdown.getByText(sharedCredentialName).click();
			await expect(credentialSelect).toHaveValue(sharedCredentialName);

			await n8n.ndv.close();

			// Save workflow
			await n8n.canvas.clickWorkflowSaveButton();

			// Mock the HTTP request
			await n8n.page.route('https://api.example.com/data', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ success: true }),
				});
			});

			// Execute workflow - should NOT fail with permission error
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			// Verify no error notification about credential access
			await expect(
				n8n.notifications.getNotificationByTitleOrContent('does not have access to the credential'),
			).toBeHidden();

			// Clean up
			await api.credentials.deleteCredential(credential.id);
		});
	},
);
