import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Reproduction test for GHC-8030
 * Bug: Salesforce JWT credentials not showing up in credential dropdown
 *
 * User report:
 * - Created JWT Salesforce credential
 * - When opening another Salesforce action, credentials dropdown is empty
 * - Credential exists in Settings → Credentials
 * - Auto-increment naming (Salesforce account 2) confirms credential exists
 *
 * Root cause investigation:
 * - Salesforce node has two authentication modes: OAuth2 (default) and OAuth2 JWT
 * - JWT credentials only appear when authentication is set to 'jwt'
 * - User likely didn't change authentication mode from default OAuth2 to JWT
 */
test.describe(
	'Salesforce JWT Credential Visibility',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should show JWT credential when authentication mode is set to JWT', async ({
			n8n,
			api,
		}) => {
			await n8n.start.fromHome();

			// Step 1: Create a Salesforce JWT credential
			const jwtCredName = `Salesforce JWT ${nanoid()}`;
			await api.credentials.createCredential({
				name: jwtCredName,
				type: 'salesforceJwtApi',
				data: {
					environment: 'production',
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
				},
			});

			// Verify credential appears in Settings → Credentials
			await n8n.navigate.toCredentials();
			await expect(n8n.credentials.cards.getCredential(jwtCredName)).toBeVisible();

			// Step 2: Create a new workflow with Salesforce node
			await n8n.navigate.toWorkflow('new');
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Salesforce');
			await n8n.canvas.getFirstAction().click();

			// Step 3: Verify that with default OAuth2 authentication, JWT credential is NOT visible
			// (This is actually correct behavior - OAuth2 and JWT credentials are different types)
			const credSelect = n8n.ndv.getNodeCredentialsSelect();
			await credSelect.click();
			let credentialDropdown = n8n.ndv.getVisiblePopper();

			// JWT credential should NOT appear when authentication is OAuth2 (default)
			await expect(credentialDropdown.getByText(jwtCredName)).toBeHidden();

			// Close the dropdown
			await n8n.page.keyboard.press('Escape');

			// Step 4: Change authentication mode to JWT
			// Find the authentication parameter dropdown
			const authenticationSelect = n8n.ndv.container.locator('[data-test-id="parameter-input-authentication"]');
			await authenticationSelect.click();

			// Select "OAuth2 JWT" option
			const authDropdown = n8n.ndv.getVisiblePopper();
			await authDropdown.getByText('OAuth2 JWT').click();

			// Step 5: Now the JWT credential SHOULD appear in the dropdown
			await credSelect.click();
			credentialDropdown = n8n.ndv.getVisiblePopper();

			// This is where the bug might be - JWT credential should now be visible
			await expect(credentialDropdown.getByText(jwtCredName)).toBeVisible();
		});

		test('should not show OAuth2 credentials when authentication is set to JWT', async ({
			n8n,
			api,
		}) => {
			await n8n.start.fromHome();

			// Create both OAuth2 and JWT credentials
			const oauth2CredName = `Salesforce OAuth2 ${nanoid()}`;
			await api.credentials.createCredential({
				name: oauth2CredName,
				type: 'salesforceOAuth2Api',
				data: {
					environment: 'production',
					accessToken: 'test-access-token',
					instanceUrl: 'https://test.salesforce.com',
				},
			});

			const jwtCredName = `Salesforce JWT ${nanoid()}`;
			await api.credentials.createCredential({
				name: jwtCredName,
				type: 'salesforceJwtApi',
				data: {
					environment: 'production',
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
				},
			});

			// Create workflow with Salesforce node set to JWT authentication
			await n8n.navigate.toWorkflow('new');
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Salesforce');
			await n8n.canvas.getFirstAction().click();

			// Set authentication to JWT
			const authenticationSelect = n8n.ndv.container.locator('[data-test-id="parameter-input-authentication"]');
			await authenticationSelect.click();
			const authDropdown = n8n.ndv.getVisiblePopper();
			await authDropdown.getByText('OAuth2 JWT').click();

			// Verify only JWT credential appears, not OAuth2
			const credSelect = n8n.ndv.getNodeCredentialsSelect();
			await credSelect.click();
			const credentialDropdown = n8n.ndv.getVisiblePopper();

			await expect(credentialDropdown.getByText(jwtCredName)).toBeVisible();
			await expect(credentialDropdown.getByText(oauth2CredName)).toBeHidden();
		});

		test('should show OAuth2 credentials by default (when JWT credential exists)', async ({
			n8n,
			api,
		}) => {
			await n8n.start.fromHome();

			// Create both OAuth2 and JWT credentials
			const oauth2CredName = `Salesforce OAuth2 ${nanoid()}`;
			await api.credentials.createCredential({
				name: oauth2CredName,
				type: 'salesforceOAuth2Api',
				data: {
					environment: 'production',
					accessToken: 'test-access-token',
					instanceUrl: 'https://test.salesforce.com',
				},
			});

			const jwtCredName = `Salesforce JWT ${nanoid()}`;
			await api.credentials.createCredential({
				name: jwtCredName,
				type: 'salesforceJwtApi',
				data: {
					environment: 'production',
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
				},
			});

			// Create workflow with Salesforce node (default OAuth2)
			await n8n.navigate.toWorkflow('new');
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Salesforce');
			await n8n.canvas.getFirstAction().click();

			// Default authentication should be OAuth2, so only OAuth2 credential should show
			const credSelect = n8n.ndv.getNodeCredentialsSelect();
			await credSelect.click();
			const credentialDropdown = n8n.ndv.getVisiblePopper();

			await expect(credentialDropdown.getByText(oauth2CredName)).toBeVisible();
			await expect(credentialDropdown.getByText(jwtCredName)).toBeHidden();
		});
	},
);
