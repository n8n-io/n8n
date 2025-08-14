import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures/base';
import type { ApiHelpers } from '../../services/api-helper';

test.describe('Security Notifications', () => {
	// Helper function to setup version notification settings via environment variables
	async function setupVersionNotificationSettings(
		api: ApiHelpers,
		{ enabled }: { enabled: boolean } = { enabled: true },
	) {
		await api.setEnvFeatureFlags({
			N8N_VERSION_NOTIFICATIONS_ENABLED: enabled.toString(),
			N8N_VERSION_NOTIFICATIONS_ENDPOINT: 'https://test.api.n8n.io/api/versions/',
			N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED: enabled.toString(),
			N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT: 'https://test.api.n8n.io/api/whats-new',
			N8N_VERSION_NOTIFICATIONS_INFO_URL: 'https://test.docs.n8n.io/hosting/installation/updating/',
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

	test.describe('Notifications disabled', () => {
		test.beforeEach(async ({ api }) => {
			// Test notifications disabled
			await setupVersionNotificationSettings(api, { enabled: false });
		});

		test('should not display security notification when disabled', async ({ page, n8n, api }) => {
			// Even with security issue in API, notification shouldn't show when disabled
			await setupVersionsApiMock(page, { hasSecurityIssue: true });

			await n8n.goHome();

			// Wait a moment for any potential notifications to appear
			await page.waitForTimeout(1000);

			// Verify no security notification appears when disabled
			const notification = n8n.notifications.notificationContainerByText(
				'Critical update available',
			);
			await expect(notification).not.toBeVisible();
		});
	});

	test.describe('Notifications enabled', () => {
		test.beforeEach(async ({ api }) => {
			await setupVersionNotificationSettings(api, { enabled: true });
		});

		test('should display security notification with correct messaging and styling', async ({
			page,
			n8n,
		}) => {
			await setupVersionsApiMock(page, { hasSecurityIssue: true, hasSecurityFix: true });

			// Reload to trigger version check
			await n8n.goHome();

			// Verify security notification appears with default message
			const notification = n8n.notifications.notificationContainerByText(
				'Critical update available',
			);
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
			await n8n.goHome();

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

		test('should open versions modal when clicking security notification', async ({
			page,
			n8n,
			api,
		}) => {
			await setupVersionsApiMock(page, {
				hasSecurityIssue: true,
				hasSecurityFix: true,
				securityIssueFixVersion: 'useNextPatch',
			});

			await n8n.goHome();

			// Wait for and click the security notification
			const notification = n8n.notifications.notificationContainerByText(
				'Critical update available',
			);
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

		test('should not display security notification when theres no security issue', async ({
			page,
			n8n,
		}) => {
			await setupVersionsApiMock(page, { hasSecurityIssue: false });

			await n8n.goHome();

			// Wait a moment for any potential notifications to appear
			await page.waitForTimeout(1000);

			// Verify no security notification appears when no security issue
			const notification = n8n.notifications.notificationContainerByText(
				'Critical update available',
			);
			await expect(notification).not.toBeVisible();
		});

		test('should handle API failure gracefully', async ({ page, n8n }) => {
			// Enable notifications but mock API failure
			await setupApiFailure(page);

			await n8n.goHome();

			// Wait a bit for any potential notifications
			await page.waitForTimeout(2000);

			// Verify no security notification appears on API failure
			const notification = n8n.notifications.notificationContainerByText(
				'Critical update available',
			);
			await expect(notification).not.toBeVisible();

			// Verify the app still functions normally
			await expect(page.locator('[data-test-id="new-workflow-card"]')).toBeVisible();
		});
	});
});
