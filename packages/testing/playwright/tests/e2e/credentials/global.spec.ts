import { test, expect } from '../../../fixtures/base';

test.describe('Global credentials @isolated', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeAll(async ({ api }) => {
		await api.resetDatabase();
		await api.enableFeature('sharing');
	});

	test('owner should create HTTP header credential and set to global', async ({ n8n }) => {
		await n8n.api.signin('owner');

		// Navigate to credentials page
		await n8n.navigate.toCredentials();

		// Create new credential
		await n8n.credentials.addResource.credential();
		await n8n.credentials.selectCredentialType('Header Auth');

		// Fill in credential fields
		await n8n.credentials.credentialModal.fillField('name', 'Authorization');
		await n8n.credentials.credentialModal.fillField('value', 'Bearer test-token-123');

		// Set credential name
		await n8n.credentials.credentialModal.getCredentialName().click();
		await n8n.credentials.credentialModal.getNameInput().fill('Global HTTP Header Cred');

		// Switch to Sharing tab
		await n8n.credentials.credentialModal.changeTab('Sharing');

		// Share with all users (set to global)
		await n8n.credentials.credentialModal.getUsersSelect().click();
		await n8n.credentials.credentialModal.getVisibleDropdown().getByText('All users').click();

		// Save the credential with sharing
		await n8n.credentials.credentialModal.save();
		await n8n.credentials.credentialModal.close();

		// Verify credential appears in list with global badge
		await expect(n8n.credentials.cards.getCredential('Global HTTP Header Cred')).toBeVisible();
		await expect(
			n8n.credentials.cards
				.getCredential('Global HTTP Header Cred')
				.getByTestId('credential-global-badge'),
		).toBeVisible();
	});

	test('member should see global credential in credentials view', async ({ n8n }) => {
		await n8n.api.signin('member', 0);

		// Navigate to credentials page
		await n8n.navigate.toCredentials();

		// Verify global credential is visible to member
		await expect(n8n.credentials.cards.getCredential('Global HTTP Header Cred')).toBeVisible();

		// Verify global badge is displayed
		await expect(
			n8n.credentials.cards
				.getCredential('Global HTTP Header Cred')
				.getByTestId('credential-global-badge'),
		).toBeVisible();
	});

	test('member should execute workflow with HTTP node using global credential', async ({
		n8n,
		baseURL,
	}) => {
		await n8n.api.signin('member', 0);

		// Create a new workflow
		await n8n.navigate.toWorkflow('new');
		await n8n.canvas.setWorkflowName('Test Global Credential Workflow');

		// Add manual trigger and HTTP Request node
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('HTTP Request');

		await n8n.ndv.fillParameterInput('URL', `${baseURL}/rest/settings`);
		await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Generic Credential Type');
		await n8n.ndv.selectOptionInParameterDropdown('genericAuthType', 'Header Auth');

		// Verify global credential is available in the credential select
		const credentialSelect = n8n.ndv.getCredentialSelect();
		await credentialSelect.click();

		// Check that global credential appears in dropdown
		const dropdown = n8n.credentials.credentialModal.getVisibleDropdown();
		await expect(dropdown.getByText('Global HTTP Header Cred')).toBeVisible();

		// Select the global credential
		await dropdown.getByText('Global HTTP Header Cred').click();

		// Verify credential is selected
		await expect(credentialSelect).toHaveValue('Global HTTP Header Cred');

		// Close NDV
		await n8n.ndv.clickBackToCanvasButton();

		// Save workflow
		await n8n.canvas.saveWorkflow();

		// Verify workflow saved successfully
		await expect(n8n.canvas.getWorkflowNameInput()).toHaveValue('Test Global Credential Workflow');

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
	});

	test('owner should be able to remove global sharing', async ({ n8n }) => {
		await n8n.api.signin('owner');

		// Navigate to credentials page
		await n8n.navigate.toCredentials();

		// Open the global credential
		await n8n.credentials.cards.getCredential('Global HTTP Header Cred').click();

		// Switch to Sharing tab
		await n8n.credentials.credentialModal.changeTab('Sharing');

		// Verify "All users" is in the sharing list
		await expect(
			n8n.credentials.credentialModal
				.getModal()
				.getByTestId('project-sharing-list-item')
				.filter({ hasText: 'All users' }),
		).toBeVisible();

		// Remove global sharing by clicking the remove button
		await n8n.credentials.credentialModal
			.getModal()
			.getByTestId('project-sharing-list-item')
			.filter({ hasText: 'All users' })
			.getByTestId('project-sharing-remove')
			.click();

		// Save the changes
		await n8n.credentials.credentialModal.save();
		await n8n.credentials.credentialModal.close();

		// Verify global badge is no longer visible
		await expect(
			n8n.credentials.cards
				.getCredential('Global HTTP Header Cred')
				.getByTestId('credential-global-badge'),
		).not.toBeVisible();
	});

	test('member should not see credential after global sharing removed', async ({ n8n }) => {
		await n8n.api.signin('member', 0);

		// Navigate to credentials page
		await n8n.navigate.toCredentials();

		// Verify credential is no longer visible to member
		await expect(n8n.credentials.cards.getCredential('Global HTTP Header Cred')).not.toBeVisible();
	});
});
