import { test, expect } from '../../../fixtures/base';

test.describe(
	'OAuth Credentials',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should create and connect with Google OAuth2', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProjectBlankCanvas();
			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.emptyListCreateCredentialButton.click();
			await n8n.credentials.createCredentialFromCredentialPicker(
				'Google OAuth2 API',
				{
					clientId: 'test-key',
					clientSecret: 'test-secret',
				},
				{ closeDialog: false, skipSave: true },
			);

			const popupPromise = n8n.page.waitForEvent('popup');
			await n8n.credentials.credentialModal.oauthConnectButton.click();

			const popup = await popupPromise;
			const popupUrl = popup.url();
			expect(popupUrl).toContain('accounts.google.com');
			expect(popupUrl).toContain('client_id=test-key');

			await popup.close();

			await n8n.page.evaluate(() => {
				const channel = new BroadcastChannel('oauth-callback');
				channel.postMessage('success');
			});

			await expect(n8n.credentials.credentialModal.oauthConnectSuccessBanner).toContainText(
				'Account connected',
			);
		});

		test('should connect when the callback notifies via window.opener postMessage', async ({
			n8n,
		}) => {
			const projectId = await n8n.start.fromNewProjectBlankCanvas();
			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.emptyListCreateCredentialButton.click();
			await n8n.credentials.createCredentialFromCredentialPicker(
				'Google OAuth2 API',
				{
					clientId: 'test-key',
					clientSecret: 'test-secret',
				},
				{ closeDialog: false, skipSave: true },
			);

			const popupPromise = n8n.page.waitForEvent('popup');
			await n8n.credentials.credentialModal.oauthConnectButton.click();

			const popup = await popupPromise;
			await popup.close();

			// Embed setups can't use BroadcastChannel (cross-origin). The callback page
			// also notifies the opener via postMessage; simulate that path here.
			await n8n.page.evaluate(() => {
				window.dispatchEvent(
					new MessageEvent('message', { data: 'success', origin: window.location.origin }),
				);
			});

			await expect(n8n.credentials.credentialModal.oauthConnectSuccessBanner).toContainText(
				'Account connected',
			);
		});
	},
);
