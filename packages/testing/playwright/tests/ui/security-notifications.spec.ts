import { test, expect } from '../../fixtures/base';

test.describe('Security Notifications', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should display security notification with correct messaging and styling', async ({
		page,
		n8n,
	}) => {
		// Mock the versions API to return a current version with security issue but no fix version
		await page.route('**/rest/settings', async (route) => {
			const response = await route.fetch();
			const settings = await response.json();
			settings.versionNotifications = {
				enabled: true,
				endpoint: 'https://test.api.n8n.io/api/versions/',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
				infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
			};
			await route.fulfill({ json: settings });
		});

		// Mock versions API - security issue without specific fix version
		// Dynamically handle any version in the URL path
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
					description: 'Current version with security issue',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: true,
					securityIssueFixVersion: '',
				},
				{
					name: nextPatchVersion,
					nodes: [],
					createdAt: '2025-06-25T00:00:00Z',
					description: 'Fixed version',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: true,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
			];
			await route.fulfill({ json: mockVersions });
		});

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
		await page.route('**/api/versions/**', async (route) => {
			// Extract current version from URL path
			const url = route.request().url();
			const currentVersion = url.split('/').pop() ?? '1.106.1';

			// Parse version to create next version
			const versionParts = currentVersion.split('.');
			const nextPatchVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;

			const mockVersionsWithFixVersion = [
				{
					name: currentVersion,
					nodes: [],
					createdAt: '2025-06-24T00:00:00Z',
					description: 'Current version with security issue',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: true,
					securityIssueFixVersion: nextPatchVersion,
				},
				{
					name: nextPatchVersion,
					nodes: [],
					createdAt: '2025-06-25T00:00:00Z',
					description: 'Fixed version',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: true,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
			];
			await route.fulfill({ json: mockVersionsWithFixVersion });
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
		// Setup mocks similar to previous test
		await page.route('**/rest/settings', async (route) => {
			const response = await route.fetch();
			const settings = await response.json();
			settings.versionNotifications = {
				enabled: true,
				endpoint: 'https://test.api.n8n.io/api/versions/',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
				infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
			};
			await route.fulfill({ json: settings });
		});

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
					description: 'Current version with security issue',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: true,
					securityIssueFixVersion: nextPatchVersion,
				},
				{
					name: nextPatchVersion,
					nodes: [],
					createdAt: '2025-06-25T00:00:00Z',
					description: 'Fixed version',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: true,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
			];
			await route.fulfill({ json: mockVersions });
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
	}) => {
		// Test 1: Notifications disabled
		await page.route('**/rest/settings', async (route) => {
			const response = await route.fetch();
			const settings = await response.json();
			settings.versionNotifications = {
				enabled: false,
				endpoint: 'https://test.api.n8n.io/api/versions/',
				whatsNewEnabled: false,
				whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
				infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
			};
			await route.fulfill({ json: settings });
		});

		await page.route('**/api/versions/**', async (route) => {
			// Extract current version from URL path
			const url = route.request().url();
			const currentVersion = url.split('/').pop() ?? '1.106.1';

			const mockVersions = [
				{
					name: currentVersion,
					nodes: [],
					createdAt: '2025-06-24T00:00:00Z',
					description: 'Current version with security issue',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: true,
					securityIssueFixVersion: '1.100.1',
				},
			];
			await route.fulfill({ json: mockVersions });
		});

		await page.reload();
		await page.waitForLoadState('networkidle');

		// Verify no security notification appears when disabled
		const notification = n8n.notifications.notificationContainerByText('Critical update available');
		await expect(notification).not.toBeVisible();

		// Test 2: No security issue
		await page.route('**/rest/settings', async (route) => {
			const response = await route.fetch();
			const settings = await response.json();
			settings.versionNotifications = {
				enabled: true,
				endpoint: 'https://test.api.n8n.io/api/versions/',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
				infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
			};
			await route.fulfill({ json: settings });
		});

		await page.route('**/api/versions/**', async (route) => {
			// Extract current version from URL path
			const url = route.request().url();
			const currentVersion = url.split('/').pop() ?? '1.106.1';

			const mockVersions = [
				{
					name: currentVersion,
					nodes: [],
					createdAt: '2025-06-24T00:00:00Z',
					description: 'Current version without security issue',
					documentationUrl: 'https://docs.n8n.io',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
			];
			await route.fulfill({ json: mockVersions });
		});

		await page.reload();
		await page.waitForLoadState('networkidle');

		// Verify no security notification appears when no security issue
		await expect(notification).not.toBeVisible();
	});

	test('should handle API failure gracefully', async ({ page, n8n }) => {
		// Enable notifications
		await page.route('**/rest/settings', async (route) => {
			const response = await route.fetch();
			const settings = await response.json();
			settings.versionNotifications = {
				enabled: true,
				endpoint: 'https://test.api.n8n.io/api/versions/',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
				infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
			};
			await route.fulfill({ json: settings });
		});

		// Mock API failure
		await page.route('**/api/versions/**', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'API Error' }),
			});
		});

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
