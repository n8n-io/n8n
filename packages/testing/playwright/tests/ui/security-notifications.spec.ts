import { test, expect } from '../../fixtures/base';
import type { Page } from '@playwright/test';

test.describe('Security Notifications', () => {
	// Helper function to setup version notification settings
	async function setupVersionNotificationSettings(page: Page, enabled = true) {
		await page.route('**/rest/settings', async (route) => {
			const response = await route.fetch();
			const settings = await response.json();
			settings.versionNotifications = {
				enabled,
				endpoint: 'https://test.api.n8n.io/api/versions/',
				whatsNewEnabled: enabled,
				whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
				infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
			};
			await route.fulfill({ json: settings });
		});
	}

	// Helper function to setup versions API mock
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

	// Helper function to setup API failure mock
	async function setupApiFailure(page: Page) {
		await page.route('**/api/versions/**', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'API Error' }),
			});
		});
	}

	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should display security notification with correct messaging and styling', async ({
		page,
		n8n,
	}) => {
		// Setup enabled notifications and security issue without specific fix version
		await setupVersionNotificationSettings(page, true);
		await setupVersionsApiMock(page, { hasSecurityIssue: true, hasSecurityFix: true });

		// Reload to trigger version check
		await page.reload();
		await page.waitForLoadState('networkidle');

		// Verify security notification appears with default message
		const notification = n8n.notifications.notificationContainerByText('Critical update available');
		await expect(notification).toBeVisible();
		await expect(notification).toContainText('Please update to latest version.');
		await expect(notification).toContainText('More info');

		// Verify warning styling
		await expect(notification.locator('.el-notification--warning')).toBeVisible();

		// Close the notification
		await n8n.notifications.closeNotificationByText('Critical update available');

		// Now test with specific fix version
		await setupVersionsApiMock(page, {
			hasSecurityIssue: true,
			hasSecurityFix: true,
			securityIssueFixVersion: 'useNextPatch',
		});

		// Reload to trigger new version check with fix version
		await page.reload();
		await page.waitForLoadState('networkidle');

		// Verify notification shows specific fix version (dynamically generated)
		const notificationWithFixVersion = n8n.notifications.notificationContainerByText(
			'Critical update available',
		);
		await expect(notificationWithFixVersion).toBeVisible();
		await expect(notificationWithFixVersion).toContainText('Please update to version');
		await expect(notificationWithFixVersion).toContainText('or higher.');

		// Verify notification persists (doesn't auto-close)
		await page.waitForTimeout(3000);
		await expect(notificationWithFixVersion).toBeVisible();
	});

	test('should open versions modal when clicking security notification', async ({ page, n8n }) => {
		// Setup enabled notifications and security issue with fix version
		await setupVersionNotificationSettings(page, true);
		await setupVersionsApiMock(page, {
			hasSecurityIssue: true,
			hasSecurityFix: true,
			securityIssueFixVersion: 'useNextPatch',
		});

		await page.reload();
		await page.waitForLoadState('networkidle');

		// Wait for and click the security notification
		const notification = n8n.notifications.notificationContainerByText('Critical update available');
		await expect(notification).toBeVisible();
		await notification.click();

		// Verify versions modal opens
		const versionsModal = page.locator('[data-test-id="version-updates-panel"]');
		await expect(versionsModal).toBeVisible();

		// Verify security update badge exists for the new version
		const versionCard = versionsModal.locator('[data-test-id="version-card"]').first();
		const securityBadge = versionCard.locator('.el-tag--danger').getByText('Security update');
		await expect(securityBadge).toBeVisible();
	});

	test('should not display security notification when disabled or no security issue', async ({
		page,
		n8n,
		api,
	}) => {
		// N8N_VERSION_NOTIFICATIONS_ENABLED
		await api.setEnvFeatureFlags({
			N8N_VERSION_NOTIFICATIONS_ENABLED: 'true',
		});

		await page.reload();
		await page.waitForLoadState('networkidle');

		// Wait a moment for any potential notifications to appear
		await page.waitForTimeout(1000);

		// Verify no security notification appears when disabled
		const notification = n8n.notifications.notificationContainerByText('Critical update available');
		await expect(notification).not.toBeVisible();
	});

	test('should not display security notification when theres no security issue', async ({
		page,
		n8n,
		api,
	}) => {
		await setupVersionNotificationSettings(page, true);
		await setupVersionsApiMock(page, { hasSecurityIssue: false });

		await page.reload();
		await page.waitForLoadState('networkidle');

		// Wait a moment for any potential notifications to appear
		await page.waitForTimeout(1000);

		// Verify no security notification appears when no security issue (create fresh locator)
		const notification = n8n.notifications.notificationContainerByText('Critical update available');
		await expect(notification).not.toBeVisible();
	});

	test('should handle API failure gracefully', async ({ page, n8n }) => {
		// Enable notifications but mock API failure
		await setupVersionNotificationSettings(page, true);
		await setupApiFailure(page);

		await page.reload();
		await page.waitForLoadState('networkidle');

		// Wait a bit for any potential notifications
		await page.waitForTimeout(2000);

		// Verify no security notification appears on API failure
		const notification = n8n.notifications.notificationContainerByText('Critical update available');
		await expect(notification).not.toBeVisible();

		// Verify the app still functions normally
		await expect(page.locator('[data-test-id="new-workflow-card"]')).toBeVisible();
	});
});
