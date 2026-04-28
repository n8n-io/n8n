import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'frontend-builder',
			TEST_ISOLATION: 'frontend-builder-smoke',
		},
	},
});

test.describe(
	'Frontend builder smoke',
	{
		annotation: [{ type: 'owner', description: 'Frontend Builder' }],
	},
	() => {
		test('drawer generates a preview, persists across reload', async ({ n8n, page }) => {
			// FakeV0Client returns this URL — point it at a fake page so the iframe load is observable
			// without depending on `example.invalid` resolving from CI.
			await page.route(
				/example\.invalid\/fake-demo\/.*/,
				async (route) =>
					await route.fulfill({
						status: 200,
						contentType: 'text/html',
						body: '<!doctype html><h1 data-testid="fake-demo">fake demo</h1>',
					}),
			);

			await n8n.start.fromBlankCanvas();
			await n8n.canvas.setWorkflowName(`fe-builder smoke ${nanoid(6)}`);
			await n8n.canvas.addNode('Webhook', { closeNDV: true });
			await n8n.canvas.publishWorkflow();

			await n8n.canvas.clickCreateFrontendButton();
			await expect(n8n.frontendBuilderDrawer.getDrawer()).toBeVisible();

			await n8n.frontendBuilderDrawer.sendPrompt('hello world form');

			const fakeDemoHeading = n8n.frontendBuilderDrawer.getPreviewElementByTestId('fake-demo');
			await expect(fakeDemoHeading).toHaveText('fake demo');

			// Reload and confirm the drawer rehydrates.
			await page.reload();
			await n8n.canvas.clickCreateFrontendButton();
			await expect(fakeDemoHeading).toHaveText('fake demo');
		});
	},
);
