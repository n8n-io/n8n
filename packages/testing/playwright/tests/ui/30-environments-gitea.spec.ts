import { addGiteaSSHKey } from 'n8n-containers/n8n-test-container-gitea';

import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

test.use({
	containerConfig: {
		gitea: true,
		env: {
			E2E_TESTS: 'true',
		},
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

test.describe('Environments - Gitea Integration @capability:gitea', () => {
	test('should connect to Gitea repository using SSH', async ({ n8n, n8nContainer }) => {
		await setupSourceControl(n8n);
		await n8n.navigate.toEnvironments();

		const sshKey = await n8n.settingsEnvironment.getSSHKeyValue().textContent();

		expect(sshKey).toContain('ssh-');

		// Get the Gitea container
		const giteaContainer = n8nContainer.containers.find((c) => c.getName().includes('gitea'));
		expect(giteaContainer).toBeDefined();
		await addGiteaSSHKey(giteaContainer!, 'n8n-environments', sshKey!);

		await n8n.settingsEnvironment.fillRepoUrl('ssh://git@gitea/giteaadmin/n8n-test-repo.git');
		await expect(n8n.settingsEnvironment.getConnectButton()).toBeEnabled();
		await n8n.settingsEnvironment.getConnectButton().click();

		await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
		await expect(n8n.settingsEnvironment.getBranchSelect()).toBeVisible();
		await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
	});
});
