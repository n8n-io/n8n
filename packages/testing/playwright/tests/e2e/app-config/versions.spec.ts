import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	config: {
		settings: {
			releaseChannel: 'stable',
			versionCli: '1.0.0',
			versionNotifications: {
				enabled: true,
				endpoint: 'https://api.n8n.io/api/versions/',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://api.n8n.io/api/whats-new',
				infoUrl: 'https://docs.n8n.io/getting-started/installation/updating.html',
			},
		},
	},
	intercepts: {
		versions: {
			url: '**/api/versions/**',
			response: [
				{
					name: '1.0.0',
					nodes: [],
					createdAt: '2025-06-01T00:00:00Z',
					description: 'Current version',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
				{
					name: '1.0.1',
					nodes: [],
					createdAt: '2025-06-15T00:00:00Z',
					description: 'Version 1.0.1',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
				{
					name: '1.0.2',
					nodes: [],
					createdAt: '2025-06-30T00:00:00Z',
					description: 'Version 1.0.2',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
			],
		},
	},
};

test.describe('Versions', () => {
	test('should show updates in help section', async ({ n8n, setupRequirements }) => {
		await setupRequirements(requirements);
		await n8n.goHome();
		await n8n.sideBar.expand();
		await n8n.sideBar.clickHelpMenuItem();
		await expect(n8n.sideBar.getVersionUpdateItem()).toContainText('Update (2 versions behind)');
	});
});
