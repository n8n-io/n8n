import { test, expect } from '../../../fixtures/base';

test.describe(
	'Credential Dropdown',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should open credential modal when clicking create new from dropdown with no credentials set @mode:sqlite', async ({
			n8n,
		}) => {
			await n8n.start.fromNewProjectBlankCanvas();

			// Add a node that requires credentials
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Append a block' });

			// At this point, no credentials are set
			// The credential dropdown should show a placeholder

			// Click the credential select dropdown
			await n8n.ndv.getCredentialSelect().click();

			// Click "Create new credential" option in the dropdown
			await n8n.page.getByTestId('node-credentials-select-item-new').click();

			// The credential modal should open
			await expect(n8n.canvas.credentialModal.getModal()).toBeVisible({ timeout: 5000 });
		});

		test('should open credential modal when clicking dropdown for node with no existing credentials @mode:sqlite', async ({
			n8n,
		}) => {
			await n8n.start.fromNewProjectBlankCanvas();

			// Add a node that requires credentials
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Trello', { action: 'Create a card' });

			// Verify no credential is selected
			await expect(n8n.ndv.getCredentialSelect()).not.toHaveValue(/.+/);

			// Click the credential dropdown
			await n8n.ndv.getCredentialSelect().click();

			// Verify the dropdown opens with "Create new" option
			await expect(n8n.page.getByTestId('node-credentials-select-item-new')).toBeVisible();

			// Click "Create new credential"
			await n8n.page.getByTestId('node-credentials-select-item-new').click();

			// Credential modal should open
			await expect(n8n.canvas.credentialModal.getModal()).toBeVisible({ timeout: 5000 });
		});

		test('should open credential modal when clicking dropdown with empty credential list @mode:sqlite', async ({
			n8n,
		}) => {
			await n8n.start.fromNewProjectBlankCanvas();

			// Ensure no credentials exist for this credential type
			const existingCreds = await n8n.api.credentials.getCredentials();
			const notionCreds = existingCreds.filter((c) => c.type === 'notionApi');
			for (const cred of notionCreds) {
				await n8n.api.credentials.deleteCredential(cred.id);
			}

			// Add a node requiring Notion credentials
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Append a block' });

			// Click credential dropdown (should be empty except for "Create new")
			await n8n.ndv.getCredentialSelect().click();

			// The "Create new" button should be visible
			await expect(n8n.page.getByTestId('node-credentials-select-item-new')).toBeVisible();

			// Click it
			await n8n.page.getByTestId('node-credentials-select-item-new').click();

			// Modal should open
			await expect(n8n.canvas.credentialModal.getModal()).toBeVisible({ timeout: 5000 });
		});

		test('should open credential modal when no credentials exist and dropdown shows placeholder @mode:sqlite', async ({
			n8n,
		}) => {
			await n8n.start.fromNewProjectBlankCanvas();

			// Add nodes
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Append a block' });

			// Verify the credential select is showing placeholder (no credential selected)
			const credSelect = n8n.ndv.getCredentialSelect();

			// If there's no value or empty value, it means no credential is selected
			// This represents the "No credentials set" state
			await expect(credSelect).toHaveValue('');

			// Now click on the select to open the dropdown
			await credSelect.click();

			// Wait for dropdown to be visible
			await n8n.page.waitForTimeout(500);

			// Try to click "Create new" from the dropdown
			const createNewBtn = n8n.page.getByTestId('node-credentials-select-item-new');
			await expect(createNewBtn).toBeVisible({ timeout: 3000 });
			await createNewBtn.click();

			// The modal should open
			await expect(n8n.canvas.credentialModal.getModal()).toBeVisible({ timeout: 5000 });
		});

	},
);
