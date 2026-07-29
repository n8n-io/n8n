import { expect, test } from '../../../../fixtures/base';
import type { n8nPage } from '../../../../pages/n8nPage';
import {
	buildRepoUrl,
	generateUniqueRepoName,
	initSourceControl,
} from '../../../../utils/source-control-helper';

test.use({ capability: 'source-control' });

async function saveSettings(n8n: n8nPage) {
	await Promise.all([
		n8n.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/source-control/preferences') &&
				response.request().method() === 'PATCH',
		),
		n8n.settingsEnvironment.getSaveButton().click(),
	]);
}

async function connectRepository(n8n: n8nPage) {
	await expect(n8n.settingsEnvironment.getConnectButton()).toBeEnabled();
	await Promise.all([
		n8n.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/source-control/preferences') &&
				response.request().method() === 'POST',
		),
		n8n.settingsEnvironment.getConnectButton().click(),
	]);
}

async function disconnectRepository(n8n: n8nPage) {
	await Promise.all([
		n8n.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/source-control/disconnect') &&
				response.request().method() === 'POST',
		),
		n8n.settingsEnvironment.disconnect(),
	]);
}

// Exercises global source-control preferences, so keep the cases serialized.
// https://linear.app/n8n/issue/PAY-4365/bug-source-control-operations-fail-in-multi-main-deployment
test.describe(
	'Source Control Settings @capability:source-control @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		let repoUrl: string;
		let repoName: string;

		test.beforeEach(async ({ n8n, api, services }) => {
			await api.enableFeature('sourceControl');
			const gitea = services.gitea;
			await initSourceControl({ n8n, api, gitea });

			// Create unique repo with branches via API (not UI)
			repoName = generateUniqueRepoName();
			await gitea.createRepo(repoName);

			repoUrl = buildRepoUrl(repoName);
		});

		test('should connect to Git repository using SSH', async ({ n8n }) => {
			// Test UI connection flow with unique repo
			await n8n.navigate.toEnvironments();

			await n8n.settingsEnvironment.waitForConnectForm();
			await n8n.settingsEnvironment.fillRepoUrl(repoUrl);
			await connectRepository(n8n);

			await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
			await expect(n8n.settingsEnvironment.getBranchSelect()).toBeVisible();

			await n8n.settingsEnvironment.getBranchSelect().click();
			await expect(n8n.settingsEnvironment.getVisiblePopoverOption('main')).toBeVisible();

			// Verify source control connected indicator is visible
			await n8n.navigate.toHome();
			await expect(n8n.sideBar.getSourceControlConnectedIndicator()).toBeVisible();
		});

		test('should switch between branches', async ({ n8n, api, services }) => {
			const gitea = services.gitea;
			await gitea.createBranch(repoName, 'development');
			await gitea.createBranch(repoName, 'staging');
			await gitea.createBranch(repoName, 'production');

			await api.sourceControl.connect({ repositoryUrl: repoUrl });

			await n8n.navigate.toEnvironments();

			// Switch to 'development' branch
			await n8n.settingsEnvironment.getBranchSelect().click();
			await expect(n8n.settingsEnvironment.getVisiblePopoverOption('main')).toBeVisible();
			await expect(n8n.settingsEnvironment.getVisiblePopoverOption('development')).toBeVisible();
			await expect(n8n.settingsEnvironment.getVisiblePopoverOption('staging')).toBeVisible();
			await expect(n8n.settingsEnvironment.getVisiblePopoverOption('production')).toBeVisible();
			await n8n.settingsEnvironment.getVisiblePopoverOption('development').click();
			await saveSettings(n8n);

			// Verify branch switched by checking preferences
			let preferences = await api.sourceControl.getPreferences();
			expect(preferences.branchName).toBe('development');

			// Switch back to 'main'
			await n8n.settingsEnvironment.selectBranch('main');
			await saveSettings(n8n);

			// Verify switched back
			preferences = await api.sourceControl.getPreferences();
			expect(preferences.branchName).toBe('main');
		});

		test('should enable read-only mode and restrict operations', async ({ n8n, api }) => {
			await api.sourceControl.connect({ repositoryUrl: repoUrl });

			await n8n.navigate.toEnvironments();

			await n8n.settingsEnvironment.enableReadOnlyMode();
			await saveSettings(n8n);

			// Verify push button is disabled in read-only mode
			await n8n.navigate.toHome();
			await expect(n8n.sideBar.getSourceControlPushButton()).toBeDisabled();
			await expect(n8n.sideBar.getSourceControlPullButton()).toBeEnabled();

			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.disableReadOnlyMode();
			await saveSettings(n8n);

			// Verify push button is enabled again
			await n8n.navigate.toHome();
			await expect(n8n.sideBar.getSourceControlPushButton()).toBeEnabled();
			await expect(n8n.sideBar.getSourceControlPullButton()).toBeEnabled();
		});

		test('should disconnect and reconnect with existing keys', async ({ n8n, api }) => {
			await api.sourceControl.connect({ repositoryUrl: repoUrl });

			await n8n.navigate.toEnvironments();
			await disconnectRepository(n8n);

			// check that source control is disconnected
			await n8n.navigate.toHome();
			await expect(n8n.sideBar.getSourceControlConnectedIndicator()).toBeHidden();

			// Reconnect
			await n8n.navigate.toEnvironments();
			await n8n.settingsEnvironment.waitForConnectForm();
			await n8n.settingsEnvironment.fillRepoUrl(repoUrl);
			await connectRepository(n8n);

			await expect(n8n.settingsEnvironment.getDisconnectButton()).toBeVisible();
			await expect(n8n.settingsEnvironment.getBranchSelect()).toBeVisible();

			// check that source control is connected
			await n8n.navigate.toHome();
			await expect(n8n.sideBar.getSourceControlConnectedIndicator()).toBeVisible();
		});
	},
);
