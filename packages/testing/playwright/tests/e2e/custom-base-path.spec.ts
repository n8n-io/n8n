import { test, expect } from '../../fixtures/base';

/**
 * Verifies that n8n serves both UI and API correctly when deployed under a
 * non-root base path (N8N_BASE_PATH). Runs in its own isolated container so
 * the env var only applies to this spec.
 */
test.use({
	capability: {
		env: { N8N_BASE_PATH: '/custom-path', TEST_ISOLATION: 'custom-base-path' },
	},
});

test.describe('Custom Base Path', () => {
	test('serves the UI under the configured base path', async ({ n8n, baseURL }) => {
		expect(baseURL).toContain('/custom-path');

		await n8n.start.fromHome();

		await expect(n8n.page).toHaveURL(/\/custom-path\/.*workflow/);
	});

	test('navigation preserves the base path prefix', async ({ n8n }) => {
		await n8n.start.fromHome();

		await n8n.sideBar.clickHomeButton();

		await expect(n8n.page).toHaveURL(/\/custom-path\/.*home\/workflows/);
	});

	test('healthz is reachable under the base path', async ({ api }) => {
		expect(await api.isHealthy()).toBe(true);
	});
});
