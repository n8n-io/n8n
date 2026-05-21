import { request } from '@playwright/test';

import { test, expect } from '../../fixtures/base';

const BASE_PATH = '/custom-path';

/**
 * Verifies that n8n serves both UI and API correctly when deployed under a
 * non-root base path (N8N_BASE_PATH). Runs in its own isolated container so
 * the env var only applies to this spec.
 */
test.use({
	capability: {
		env: { N8N_BASE_PATH: BASE_PATH, TEST_ISOLATION: 'custom-base-path' },
	},
});

test.describe('Custom Base Path', () => {
	test('serves the UI under the configured base path', async ({ n8n, baseURL }) => {
		expect(baseURL).toContain(BASE_PATH);

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

	test('serves node icons under the base path', async ({ baseURL, n8nContainer }) => {
		const iconPath = '/icons/n8n-nodes-base/dist/nodes/Webhook/webhook.svg';

		const prefixedCtx = await request.newContext({ baseURL });
		const prefixedRes = await prefixedCtx.get(iconPath);
		expect(prefixedRes.status()).toBe(200);
		expect(prefixedRes.headers()['content-type']).toContain('image/svg');
		expect((await prefixedRes.body()).length).toBeGreaterThan(0);
		await prefixedCtx.dispose();

		// The same path without the prefix must NOT serve the icon — proves the
		// route is bound to the configured base path and not accidentally exposed
		// at the root.
		const origin = new URL(n8nContainer.baseUrl).origin;
		const rootCtx = await request.newContext({ baseURL: origin });
		const rootRes = await rootCtx.get(iconPath);
		expect(rootRes.status()).not.toBe(200);
		await rootCtx.dispose();
	});

	test('webhook trigger routes are bound to the base path', async ({ baseURL, n8nContainer }) => {
		const unknownWebhook = '/webhook/__no_such_webhook_xyz__';

		// Under the prefix, the webhook router responds with a JSON 404 from the
		// webhook handler (not a generic Express miss), proving the trigger path
		// is mounted under N8N_BASE_PATH.
		const prefixedCtx = await request.newContext({ baseURL });
		const prefixedRes = await prefixedCtx.get(unknownWebhook);
		expect(prefixedRes.status()).toBe(404);
		expect(prefixedRes.headers()['content-type']).toContain('application/json');
		const body = (await prefixedRes.json()) as { message?: string };
		expect(body.message).toMatch(/webhook/i);
		await prefixedCtx.dispose();

		// Without the prefix the webhook router is not mounted; the request must
		// not be handled by the webhook layer.
		const origin = new URL(n8nContainer.baseUrl).origin;
		const rootCtx = await request.newContext({ baseURL: origin });
		const rootRes = await rootCtx.get(unknownWebhook);
		const rootContentType = rootRes.headers()['content-type'] ?? '';
		expect(rootContentType).not.toContain('application/json');
		await rootCtx.dispose();
	});
});
