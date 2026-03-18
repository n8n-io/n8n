import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-5547: NodeCredentials have internally only one `credentialType`
 *
 * Bug Description:
 * When a node supports multiple credential types and the user tries to create a new credential
 * of a secondary type (when no credentials of that type exist yet), the credential creation
 * modal incorrectly displays fields for the first/primary credential type instead of the
 * requested type.
 *
 * Root Cause:
 * In CredentialEdit.vue, the selectedCredentialType computed property falls back to selecting
 * the first credential type from the node's credentials array when selectedCredential.value is
 * empty and requiredCredentials.value is true, instead of using props.activeId which contains
 * the correct credential type name.
 *
 * Reproduction Steps:
 * 1. Add a node that supports multiple authentication types (HTTP Request with different auth methods)
 * 2. Create a credential for the first auth type (e.g., Basic Auth)
 * 3. Change to a different auth type (e.g., Digest Auth)
 * 4. Try to create a new credential for the second auth type
 * 5. BUG: Modal opens with fields for the first auth type instead of the selected one
 *
 * Expected:
 * Modal should show fields for the credential type corresponding to the selected authentication method
 *
 * Actual:
 * Modal shows fields for the first credential type in the node's credentials array
 *
 * @see https://github.com/n8n-io/n8n/issues/22008
 */
test.describe(
	'Credential Type Selection Bug (GHC-5547) @flaky',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should open credential modal with correct type when creating secondary credential @flaky', async ({
			n8n,
		}) => {
			await n8n.start.fromNewProjectBlankCanvas();

			// Add Manual Trigger and HTTP Request nodes
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('HTTP Request');

			// Step 1: Set authentication to Basic Auth and create a credential for it
			const basicAuthCredName = `Basic Auth ${nanoid()}`;

			// Select Generic Credential Type authentication
			const authParam = n8n.ndv.getByTestId('parameter-input-authentication');
			await authParam.locator('.parameter-input').click();
			await n8n.ndv.page.getByRole('menuitem', { name: 'Generic Credential Type' }).click();

			// Select Basic Auth as the credential type
			const credTypeParam = n8n.ndv.getByTestId('parameter-input-genericAuthType');
			await credTypeParam.locator('.parameter-input').click();
			await n8n.ndv.page
				.getByRole('menuitem')
				.filter({ hasText: 'Basic Auth' })
				.first()
				.click();

			// Create Basic Auth credential
			await n8n.ndv.clickCreateNewCredential();
			await n8n.canvas.credentialModal.waitForModal();

			// Verify we see Basic Auth fields (user and password)
			await expect(n8n.canvas.credentialModal.getFieldInput('user')).toBeVisible();
			await expect(n8n.canvas.credentialModal.getFieldInput('password')).toBeVisible();

			// Fill and save the Basic Auth credential
			await n8n.canvas.credentialModal.addCredential(
				{
					user: 'testuser',
					password: 'testpass',
				},
				{ name: basicAuthCredName },
			);

			// Step 2: Change authentication type to Digest Auth (a different credential type)
			await credTypeParam.locator('.parameter-input').click();
			await n8n.ndv.page
				.getByRole('menuitem')
				.filter({ hasText: 'Digest Auth' })
				.first()
				.click();

			// Step 3: Try to create a new credential for Digest Auth
			// At this point, there are no Digest Auth credentials, so the dropdown should be empty
			await n8n.ndv.clickCreateNewCredential();
			await n8n.canvas.credentialModal.waitForModal();

			// Step 4: EXPECTED: Modal should show Digest Auth fields (user, password, realm, nonce, etc.)
			// ACTUAL BUG: Modal shows Basic Auth fields because it selects the first credential type
			// from the node's credentials array instead of the requested type

			// This assertion SHOULD pass but WILL FAIL due to the bug
			// Digest Auth has different fields than Basic Auth
			await expect(n8n.canvas.credentialModal.getFieldInput('user')).toBeVisible();
			await expect(n8n.canvas.credentialModal.getFieldInput('password')).toBeVisible();

			// The bug is that it shows the Basic Auth credential form instead of Digest Auth
			// We can verify this by checking that the modal title or credential type indicator
			// shows "Digest Auth" not "Basic Auth"

			// Get the credential modal root and check for Digest Auth indicators
			const modalContent = n8n.canvas.credentialModal.getModal();

			// The credential type name should be visible in the modal
			// This will fail because it shows "Basic Auth" instead of "Digest Auth"
			await expect(modalContent.getByText('Digest Auth')).toBeVisible();

			// Close modal without saving
			await n8n.canvas.credentialModal.close();
		});

		test('should display correct credential fields for second credential type in multi-credential nodes @flaky', async ({
			n8n,
		}) => {
			await n8n.start.fromNewProjectBlankCanvas();

			// Add Manual Trigger and HTTP Request nodes
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('HTTP Request');

			// Step 1: Set to use Header Auth first
			const authParam = n8n.ndv.getByTestId('parameter-input-authentication');
			await authParam.locator('.parameter-input').click();
			await n8n.ndv.page.getByRole('menuitem', { name: 'Generic Credential Type' }).click();

			const credTypeParam = n8n.ndv.getByTestId('parameter-input-genericAuthType');
			await credTypeParam.locator('.parameter-input').click();
			await n8n.ndv.page
				.getByRole('menuitem')
				.filter({ hasText: 'Header Auth' })
				.first()
				.click();

			// Create a Header Auth credential
			const headerAuthCredName = `Header Auth ${nanoid()}`;
			await n8n.ndv.clickCreateNewCredential();
			await n8n.canvas.credentialModal.waitForModal();

			// Verify Header Auth fields are present
			await expect(n8n.canvas.credentialModal.getFieldInput('name')).toBeVisible();
			await expect(n8n.canvas.credentialModal.getFieldInput('value')).toBeVisible();

			await n8n.canvas.credentialModal.addCredential(
				{
					name: 'X-API-Key',
					value: 'test-api-key',
				},
				{ name: headerAuthCredName },
			);

			// Step 2: Switch to Query Auth (different credential type)
			await credTypeParam.locator('.parameter-input').click();
			await n8n.ndv.page
				.getByRole('menuitem')
				.filter({ hasText: 'Query Auth' })
				.first()
				.click();

			// Step 3: Try to create Query Auth credential
			await n8n.ndv.clickCreateNewCredential();
			await n8n.canvas.credentialModal.waitForModal();

			// EXPECTED: Should show Query Auth fields (key and value)
			// ACTUAL BUG: Shows Header Auth fields (name and value) from the first created credential type

			// Verify modal shows "Query Auth" credential type
			const modalContent = n8n.canvas.credentialModal.getModal();
			await expect(modalContent.getByText('Query Auth')).toBeVisible();

			// Query Auth has 'key' and 'value' fields
			await expect(n8n.canvas.credentialModal.getFieldInput('key')).toBeVisible();
			await expect(n8n.canvas.credentialModal.getFieldInput('value')).toBeVisible();

			// Close modal
			await n8n.canvas.credentialModal.close();
		});
	},
);
