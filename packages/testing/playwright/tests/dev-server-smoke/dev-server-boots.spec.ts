import type { ConsoleMessage, Page } from '@playwright/test';

import { test } from '../../fixtures/base';

/**
 * Smoke tests that catch app-wide regressions where the editor-ui fails to boot —
 * for example a workspace package whose import is silently broken in dev mode
 * (missing Vite alias, stale dist-only re-export, CJS interop failure, etc.).
 *
 * These tests visit a small set of representative routes and fail the suite if
 * any error-level console message or uncaught page error is observed during the
 * load. They are intentionally light — UI behaviour is covered elsewhere.
 *
 * Must run against the Vite dev server (`N8N_EDITOR_URL` set), which is what the
 * `test:dev-server-smoke` script wires up.
 */

const BENIGN_PATTERNS: Array<{ messageRe: RegExp; reason: string }> = [
	{
		messageRe: /\[vite\] (server connection lost|connecting\.\.\.)/,
		reason: 'HMR transport noise',
	},
];

const isBenign = (text: string) => BENIGN_PATTERNS.some((p) => p.messageRe.test(text));

const navigateAndAssertNoErrors = async (
	page: Page,
	label: string,
	navigate: () => Promise<void>,
) => {
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];

	const onConsole = (message: ConsoleMessage) => {
		if (message.type() !== 'error') return;
		if (isBenign(message.text())) return;
		consoleErrors.push(`${message.text()} (at ${message.location().url ?? '<unknown>'})`);
	};
	const onPageError = (error: Error) => {
		const firstFrame = error.stack?.split('\n')[1]?.trim() ?? '';
		pageErrors.push(`${error.name}: ${error.message}\n  ${firstFrame}`);
	};

	page.on('console', onConsole);
	page.on('pageerror', onPageError);

	// When dev-mode module resolution is broken, the JS app never bootstraps —
	// so entry points like `fromHome()` time out waiting for the post-redirect
	// URL. That timeout would mask the real cause (the SyntaxError captured
	// below). Capture any navigation failure and surface page/console errors
	// as the primary diagnostic when both happened.
	let navigationError: Error | undefined;
	try {
		await navigate();
		// `load` (and not `networkidle`) is the project convention; entry points
		// already wait for landing-zone elements, so by the time `load` fires all
		// initial module evaluation has completed and any SyntaxError-on-import
		// has surfaced to either pageerror or console.error.
		await page.waitForLoadState('load', { timeout: 15_000 });
	} catch (error) {
		navigationError = error instanceof Error ? error : new Error(String(error));
	} finally {
		page.off('console', onConsole);
		page.off('pageerror', onPageError);
	}

	if (pageErrors.length > 0 || consoleErrors.length > 0) {
		const sections = [
			pageErrors.length > 0 && `Uncaught page errors:\n  ${pageErrors.join('\n  ')}`,
			consoleErrors.length > 0 && `Error-level console messages:\n  ${consoleErrors.join('\n  ')}`,
			navigationError &&
				`Navigation also failed (likely a downstream effect): ${navigationError.message.split('\n')[0]}`,
		].filter(Boolean);
		throw new Error(`[${label}] dev-server boot failed.\n\n${sections.join('\n\n')}`);
	}

	if (navigationError) throw navigationError;
};

test.describe(
	'Dev-server boot smoke',
	{
		annotation: [
			{
				type: 'description',
				description:
					'Boots representative routes against the Vite dev server and fails on any error-level console message or uncaught page error during load.',
			},
		],
	},
	() => {
		test('home page boots cleanly', async ({ n8n }) => {
			await navigateAndAssertNoErrors(n8n.page, 'home', async () => {
				await n8n.start.fromHome();
			});
		});

		test('blank canvas boots cleanly', async ({ n8n }) => {
			await navigateAndAssertNoErrors(n8n.page, 'blank-canvas', async () => {
				await n8n.start.fromBlankCanvas();
			});
		});

		test('credentials page boots cleanly', async ({ n8n }) => {
			await navigateAndAssertNoErrors(n8n.page, 'credentials', async () => {
				await n8n.start.fromHome();
				await n8n.navigate.toCredentials();
			});
		});
	},
);
