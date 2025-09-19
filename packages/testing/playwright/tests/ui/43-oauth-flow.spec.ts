import { test, expect } from '../../fixtures/base';

test.describe('OAuth Credentials', () => {
	test('should create and connect with Google OAuth2', async ({ n8n, page }) => {
		const projectId = await n8n.start.fromNewProjectBlankCanvas();
		await page.goto(`projects/${projectId}/credentials`);
		await n8n.credentials.emptyListCreateCredentialButton.click();
		await n8n.credentials.createCredentialFromCredentialPicker(
			'Google OAuth2 API',
			{
				clientId: 'test-key',
				clientSecret: 'test-secret',
			},
			{ closeDialog: false },
		);

		const popupPromise = page.waitForEvent('popup');
		await n8n.credentials.credentialModal.oauthConnectButton.click();

		const popup = await popupPromise;
		const popupUrl = popup.url();
		expect(popupUrl).toContain('accounts.google.com');
		expect(popupUrl).toContain('client_id=test-key');

		await popup.close();

		await page.evaluate(() => {
			const channel = new BroadcastChannel('oauth-callback');
			channel.postMessage('success');
		});

		await expect(n8n.credentials.credentialModal.oauthConnectSuccessBanner).toContainText(
			'Account connected',
		);
	});
});
