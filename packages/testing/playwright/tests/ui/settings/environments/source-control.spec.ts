import { addGiteaSSHKey } from 'n8n-containers/n8n-test-container-gitea';

import { test, expect } from '../../../../fixtures/base';
import type { n8nPage } from '../../../../pages/n8nPage';

test.use({
	addContainerCapability: {
		sourceControl: true,
	},
});

async function setupSourceControl(n8n: n8nPage) {
	await n8n.api.enableFeature('sourceControl');
	// This is needed because the DB reset wipes out source control preferences
	await n8n.page.request.post('/rest/source-control/preferences', {
		data: {
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
		},
	});
}

test.describe('Source Control Integration @capability:source-control', () => {
	test('should connect to Git repository using SSH', async ({ n8n, n8nContainer }) => {
		await setupSourceControl(n8n);

		const preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
		const preferences = await preferencesResponse.json();
		const sshKey = preferences.data.publicKey;

		expect(sshKey).toBeTruthy();
		expect(sshKey).toContain('ssh-');

		// Get the source control container
		const sourceControlContainer = n8nContainer.containers.find((c) =>
			c.getName().includes('gitea'),
		);
		expect(sourceControlContainer).toBeDefined();
		await addGiteaSSHKey(sourceControlContainer!, 'n8n-source-control', sshKey);

		await n8n.navigate.toEnvironments();

		await n8n.settingsEnvironment.fillRepoUrl('ssh://git@gitea/giteaadmin/n8n-test-repo.git');
		await expect(n8n.settingsEnvironment.getConnectButton()).toBeEnabled();
		await n8n.settingsEnvironment.getConnectButton().click();

		await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
		await expect(n8n.settingsEnvironment.getBranchSelect()).toBeVisible();

		await n8n.settingsEnvironment.getBranchSelect().click();
		await expect(n8n.page.getByRole('option', { name: 'main' })).toBeVisible();
		await expect(n8n.page.getByRole('option', { name: 'development' })).toBeVisible();
		await expect(n8n.page.getByRole('option', { name: 'staging' })).toBeVisible();
		await expect(n8n.page.getByRole('option', { name: 'production' })).toBeVisible();
	});
});
