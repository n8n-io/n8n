/**
 * Tests for backend connection status tracking and health endpoint handling.
 *
 * GHC-7815: Tests that verify the frontend correctly handles various health endpoint responses,
 * including edge cases like non-JSON responses from reverse proxies.
 */

import { test, expect } from '../../fixtures/base';

test.describe(
	'Backend Connection Health Check',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should handle non-JSON health endpoint response gracefully', async ({ n8n }) => {
			// GHC-7815: When a reverse proxy (nginx) returns plaintext "ok" instead of JSON {"status":"ok"},
			// the frontend should not incorrectly show "Offline" / "Connection Lost"

			// Start from a blank canvas
			await n8n.start.fromBlankCanvas();

			// Intercept the health endpoint to return plaintext instead of JSON
			// This simulates the scenario where a reverse proxy has a conflicting healthz endpoint
			await n8n.page.route('**/healthz', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'text/plain',
					body: 'ok',
				});
			});

			// Wait for the next health check cycle (health checks run every 10 seconds)
			// The health check should fail to parse the non-JSON response
			await n8n.page.waitForTimeout(12000);

			// The UI should incorrectly show "Offline" because it can't parse the plaintext response
			// This is the bug - the frontend should handle non-JSON responses gracefully
			const connectionTracker = n8n.page.locator('.connection-lost');
			await expect(connectionTracker).toBeVisible({ timeout: 5000 });

			// Verify the error message is displayed
			const offlineText = n8n.page.getByText('Offline');
			await expect(offlineText).toBeVisible();
		});

		test('should correctly handle JSON health endpoint response', async ({ n8n }) => {
			// Verify the normal case works correctly

			await n8n.start.fromBlankCanvas();

			// Intercept the health endpoint to return proper JSON
			await n8n.page.route('**/healthz', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ status: 'ok' }),
				});
			});

			// Wait for the health check cycle
			await n8n.page.waitForTimeout(12000);

			// The UI should NOT show "Offline"
			const connectionTracker = n8n.page.locator('.connection-lost');
			await expect(connectionTracker).not.toBeVisible();
		});

		test('should show offline status when health endpoint returns error', async ({ n8n }) => {
			// Verify that legitimate failures are correctly detected

			await n8n.start.fromBlankCanvas();

			// Intercept the health endpoint to return an error
			await n8n.page.route('**/healthz', async (route) => {
				await route.fulfill({
					status: 503,
					contentType: 'application/json',
					body: JSON.stringify({ status: 'error' }),
				});
			});

			// Wait for the health check cycle
			await n8n.page.waitForTimeout(12000);

			// The UI should show "Offline"
			const connectionTracker = n8n.page.locator('.connection-lost');
			await expect(connectionTracker).toBeVisible({ timeout: 5000 });

			const offlineText = n8n.page.getByText('Offline');
			await expect(offlineText).toBeVisible();
		});

		test('should show offline status when health endpoint is unreachable', async ({ n8n }) => {
			// Verify network errors are correctly detected

			await n8n.start.fromBlankCanvas();

			// Intercept the health endpoint to simulate network failure
			await n8n.page.route('**/healthz', async (route) => {
				await route.abort('failed');
			});

			// Wait for the health check cycle
			await n8n.page.waitForTimeout(12000);

			// The UI should show "Offline"
			const connectionTracker = n8n.page.locator('.connection-lost');
			await expect(connectionTracker).toBeVisible({ timeout: 5000 });

			const offlineText = n8n.page.getByText('Offline');
			await expect(offlineText).toBeVisible();
		});
	},
);
