import type { ConsoleMessage, Page } from '@playwright/test';

import { test, expect } from '../../../fixtures/base';

/**
 * Smoke tests that catch app-wide regressions where the editor-ui fails to boot —
 * for example a workspace package whose import is silently broken in dev mode
 * (missing Vite alias, stale dist-only re-export, CJS interop failure, etc.).
 *
 * These tests visit a small set of representative routes and fail the suite if
 * **any** error-level console message or uncaught page error is observed during
 * the load. They are intentionally light — UI behaviour is covered elsewhere.
 *
 * Run them in dev mode (`pnpm --filter=n8n-playwright dev`) to catch issues that
 * only surface against the Vite dev server (e.g. a missing alias).
 */
test.describe(
	'Editor-UI smoke',
	{
		annotation: [
			{
				type: 'description',
				description: 'Asserts the app boots with no console errors on a few representative routes.',
			},
		],
	},
	() => {
		const navigateAndAssertNoErrors = async (page: Page, navigate: () => Promise<void>) => {
			const consoleErrors: string[] = [];
			const pageErrors: string[] = [];

			const onConsole = (message: ConsoleMessage) => {
				if (message.type() === 'error') {
					consoleErrors.push(`${message.text()} (${message.location().url})`);
				}
			};
			const onPageError = (error: Error) => {
				pageErrors.push(`${error.name}: ${error.message}`);
			};

			page.on('console', onConsole);
			page.on('pageerror', onPageError);

			try {
				await navigate();
				// Give late-firing imports / lazy chunks a moment to settle.
				await page.waitForLoadState('domcontentloaded');
			} finally {
				page.off('console', onConsole);
				page.off('pageerror', onPageError);
			}

			expect(
				pageErrors,
				`Uncaught page errors during navigation:\n${pageErrors.join('\n')}`,
			).toEqual([]);
			expect(
				consoleErrors,
				`Error-level console messages during navigation:\n${consoleErrors.join('\n')}`,
			).toEqual([]);
		};

		test('home page loads cleanly', async ({ n8n }) => {
			await navigateAndAssertNoErrors(n8n.page, async () => {
				await n8n.start.fromHome();
			});
		});

		test('blank canvas loads cleanly', async ({ n8n }) => {
			await navigateAndAssertNoErrors(n8n.page, async () => {
				await n8n.start.fromBlankCanvas();
			});
		});

		test('credentials page loads cleanly', async ({ n8n }) => {
			await navigateAndAssertNoErrors(n8n.page, async () => {
				await n8n.start.fromHome();
				await n8n.navigate.toCredentials();
			});
		});
	},
);
