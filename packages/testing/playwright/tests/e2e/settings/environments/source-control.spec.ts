import { addGiteaSSHKey } from 'n8n-containers/n8n-test-container-gitea';

import { expect, test } from '../../../../fixtures/base';
import type { n8nPage } from '../../../../pages/n8nPage';
import { initSourceControlPreferences } from '../../../../utils/source-control-helper';

test.use({
	addContainerCapability: {
		sourceControl: true,
	},
});

async function saveSettings(n8n: n8nPage) {
	await n8n.settingsEnvironment.getSaveButton().click();
	await n8n.page.waitForResponse(
		(response) =>
			response.url().includes('/rest/source-control/preferences') &&
			response.request().method() === 'PATCH',
	);
}

test.describe('Source Control Settings @capability:source-control', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeEach(async ({ n8n }) => {
		await n8n.api.enableFeature('sourceControl');
	});

	test('should connect to Git repository using SSH', async ({ n8n, n8nContainer }) => {
		await initSourceControlPreferences(n8n);

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

		// Verify source control connected indicator is visible
		await n8n.navigate.toHome();
		await expect(n8n.sideBar.getSourceControlConnectedIndicator()).toBeVisible();
	});

	test('should switch between branches', async ({ n8n }) => {
		await n8n.navigate.toEnvironments();

		// Switch to 'development' branch
		await n8n.settingsEnvironment.selectBranch('development');
		await saveSettings(n8n);

		// Verify branch switched by checking preferences
		let preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
		let preferences = await preferencesResponse.json();
		expect(preferences.data.branchName).toBe('development');

		// Switch back to 'main'
		await n8n.settingsEnvironment.selectBranch('main');
		await saveSettings(n8n);

		// Verify switched back
		preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
		preferences = await preferencesResponse.json();
		expect(preferences.data.branchName).toBe('main');
	});

	test('should enable read-only mode and restrict operations', async ({ n8n }) => {
		await n8n.navigate.toEnvironments();

		await n8n.settingsEnvironment.enableReadOnlyMode();
		await saveSettings(n8n);

		// Verify push button is disabled in read-only mode
		await n8n.navigate.toHome();
		await expect(n8n.sideBar.getSourceControlPushButton()).toBeDisabled();

		await n8n.navigate.toEnvironments();
		await n8n.settingsEnvironment.disableReadOnlyMode();
		await saveSettings(n8n);

		// Verify push button is enabled again
		await n8n.navigate.toHome();
		await expect(n8n.sideBar.getSourceControlPushButton()).toBeEnabled();
	});

	test('should disconnect and reconnect with existing keys', async ({ n8n }) => {
		await n8n.navigate.toEnvironments();
		await n8n.settingsEnvironment.disconnect();

		// check that source control is disconnected
		await n8n.navigate.toHome();
		await expect(n8n.sideBar.getSourceControlConnectedIndicator()).not.toBeVisible();

		// Reconnect
		await n8n.navigate.toEnvironments();
		await n8n.settingsEnvironment.fillRepoUrl('ssh://git@gitea/giteaadmin/n8n-test-repo.git');
		await expect(n8n.settingsEnvironment.getConnectButton()).toBeEnabled();
		await n8n.settingsEnvironment.getConnectButton().click();

		await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
		await expect(n8n.settingsEnvironment.getBranchSelect()).toBeVisible();

		// check that source control is connected
		await n8n.navigate.toHome();
		await expect(n8n.sideBar.getSourceControlConnectedIndicator()).toBeVisible();
	});
});
