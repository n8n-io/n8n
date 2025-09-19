import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures/base';

test.describe('Security Notifications', () => {
	async function setupVersionsApiMock(
		page: Page,
		options: {
			hasSecurityIssue?: boolean;
			hasSecurityFix?: boolean;
			securityIssueFixVersion?: string;
		} = {},
	) {
		const {
			hasSecurityIssue = false,
			hasSecurityFix = false,
			securityIssueFixVersion = '',
		} = options;

		await page.route('**/api/versions/**', async (route) => {
			// Extract current version from URL path
			const url = route.request().url();
			const currentVersion = url.split('/').pop() ?? '1.106.1';

			// Parse version to create next version
			const versionParts = currentVersion.split('.');
			const nextPatchVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;

			const mockVersions = [
				{
					name: currentVersion,
					nodes: [],
					createdAt: '2025-06-24T00:00:00Z',
					description: hasSecurityIssue ? 'Current version with security issue' : 'Current version',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue,
					securityIssueFixVersion:
						securityIssueFixVersion === 'useNextPatch' ? nextPatchVersion : securityIssueFixVersion,
				},
				{
					name: nextPatchVersion,
					nodes: [],
					createdAt: '2025-06-25T00:00:00Z',
					description: hasSecurityFix ? 'Fixed version' : 'Next version',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
			];
			await route.fulfill({ json: mockVersions });
		});
	}

	async function setupApiFailure(page: Page) {
		await page.route('**/api/versions/**', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'API Error' }),
			});
		});
	}

	test.describe('Notifications disabled', () => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements({
				config: {
					settings: {
						versionNotifications: {
							enabled: false,
							endpoint: 'https://test.api.n8n.io/api/versions/',
							whatsNewEnabled: false,
							whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
							infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
						},
					},
				},
			});
		});

		test('should not check for versions if feature is disabled', async ({ page, n8n }) => {
			// Track whether any API requests are made to versions endpoint
			let versionsApiCalled = false;

			await page.route('**/api/versions/**', () => {
				versionsApiCalled = true;
			});

			await n8n.goHome();

			// Wait a moment for any potential API calls or notifications
			// eslint-disable-next-line playwright/no-networkidle
			await page.waitForLoadState('networkidle');

			// Verify no API request was made to versions endpoint when notifications are disabled
			expect(versionsApiCalled).toBe(false);
		});
	});

	test.describe('Notifications enabled', () => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements({
				config: {
					settings: {
						versionNotifications: {
							enabled: true,
							endpoint: 'https://test.api.n8n.io/api/versions/',
							whatsNewEnabled: true,
							whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
							infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
						},
					},
				},
			});
		});

		test('should display security notification with correct messaging and styling', async ({
			page,
			n8n,
		}) => {
			await setupVersionsApiMock(page, { hasSecurityIssue: true, hasSecurityFix: true });

			// Reload to trigger version check
			await page.reload();
			await n8n.goHome();

			// Verify security notification appears with default message
			const notification = n8n.notifications.getNotificationByTitle('Critical update available');
			await expect(notification).toBeVisible();
			await expect(notification).toContainText('Please update to latest version.');
			await expect(notification).toContainText('More info');

			// Verify warning styling
			await expect(n8n.notifications.getWarningNotifications()).toBeVisible();

			// Close the notification
			await n8n.notifications.closeNotificationByText('Critical update available');

			// Now test with specific fix version
			await setupVersionsApiMock(page, {
				hasSecurityIssue: true,
				hasSecurityFix: true,
				securityIssueFixVersion: 'useNextPatch',
			});

			// Reload to trigger new version check with fix version
			await n8n.goHome();

			// Verify notification shows specific fix version (dynamically generated)
			const notificationWithFixVersion = n8n.notifications.getNotificationByTitle(
				'Critical update available',
			);
			await expect(notificationWithFixVersion).toBeVisible();
			await expect(notificationWithFixVersion).toContainText('Please update to version');
			await expect(notificationWithFixVersion).toContainText('or higher.');
		});

		test('should open versions modal when clicking security notification', async ({
			page,
			n8n,
		}) => {
			await setupVersionsApiMock(page, {
				hasSecurityIssue: true,
				hasSecurityFix: true,
				securityIssueFixVersion: 'useNextPatch',
			});

			await n8n.goHome();

			// Wait for and click the security notification
			const notification = n8n.notifications.getNotificationByTitle('Critical update available');
			await expect(notification).toBeVisible();
			await notification.click();

			// Verify versions modal opens
			const versionsModal = n8n.versions.getVersionUpdatesPanel();
			await expect(versionsModal).toBeVisible();

			// Verify security update badge exists for the new version
			const versionCard = n8n.versions.getVersionCard().first();
			const securityBadge = versionCard.locator('.el-tag--danger').getByText('Security update');
			await expect(securityBadge).toBeVisible();
		});

		test('should not display security notification when theres no security issue', async ({
			page,
			n8n,
		}) => {
			await setupVersionsApiMock(page, { hasSecurityIssue: false });

			await n8n.goHome();

			// Verify no security notification appears when no security issue
			const notification = n8n.notifications.getNotificationByTitle('Critical update available');
			await expect(notification).toBeHidden();
		});

		test('should handle API failure gracefully', async ({ page, n8n }) => {
			// Enable notifications but mock API failure
			await setupApiFailure(page);

			await n8n.goHome();

			// Verify no security notification appears on API failure
			const notification = n8n.notifications.getNotificationByTitle('Critical update available');
			await expect(notification).toBeHidden();

			// Verify the app still functions normally
			await expect(n8n.workflows.getProjectName()).toBeVisible();
		});
	});
});
