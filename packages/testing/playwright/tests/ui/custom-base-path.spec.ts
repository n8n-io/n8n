import { test, expect } from '../../fixtures/base';

/**
 * Tests for N8N_BASE_PATH functionality.
 * These tests verify that n8n works correctly when deployed under a custom base path.
 *
 * The @mode:custom-base-path tag ensures these tests only run with the custom-base-path
 * container configuration which sets N8N_BASE_PATH=/custom-path
 */
test.describe('Custom Base Path @mode:custom-base-path', () => {
	test('should load n8n at the custom base path', async ({ n8n, baseURL }) => {
		// Verify the base URL includes the custom path
		expect(baseURL).toContain('/custom-path');

		// Navigate to home and verify it loads correctly
		await n8n.goHome();

		// Should be redirected to workflows page under the custom path
		await expect(n8n.page).toHaveURL(/custom-path.*workflow/);
	});

	test('should authenticate and maintain session with custom base path', async ({ n8n }) => {
		// Navigate to home (which triggers authentication)
		await n8n.goHome();

		// Verify we're authenticated and on the workflows page
		await expect(n8n.page).toHaveURL(/workflow/);

		// Verify the sidebar is visible (indicates successful auth)
		await expect(n8n.sideBar.getContainer()).toBeVisible();
	});

	test('should load static assets correctly under custom base path', async ({ n8n }) => {
		await n8n.goHome();

		// Wait for the page to fully load
		await n8n.page.waitForLoadState('networkidle');

		// Check that CSS is loaded (page should have styled elements)
		const body = n8n.page.locator('body');
		await expect(body).toBeVisible();

		// Verify no 404 errors for assets by checking the page rendered correctly
		// If assets failed to load, the page would look broken
		const mainContent = n8n.page.locator('[data-test-id="main-content"], main, #app');
		await expect(mainContent.first()).toBeVisible();
	});

	test('should handle REST API endpoints under custom base path', async ({ api }) => {
		// Test that the REST API works under the custom base path
		const response = await api.getSettings();

		// Verify we got a valid response
		expect(response.status()).toBe(200);
	});

	test('should create and save workflow under custom base path', async ({ n8n }) => {
		await n8n.goHome();

		// Create a new workflow
		await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

		// Verify we're on the workflow editor page
		await expect(n8n.page).toHaveURL(/workflow/);

		// Verify the canvas is visible
		await expect(n8n.canvas.getContainer()).toBeVisible();
	});

	test('should navigate between pages correctly under custom base path', async ({ n8n }) => {
		await n8n.goHome();

		// Navigate to home
		await n8n.sideBar.clickHomeButton();
		await expect(n8n.page).toHaveURL(/home/);

		// All URLs should include the custom base path
		const currentUrl = n8n.page.url();
		expect(currentUrl).toContain('/custom-path');
	});

	test('should handle healthz endpoint under custom base path', async ({ baseURL, request }) => {
		// The healthz endpoint should be accessible under the custom base path
		const response = await request.get(`${baseURL}/healthz`);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.status).toBe('ok');
	});
});
