import type { ConsoleMessage, Page } from '@playwright/test';

import { expect, test } from '../../fixtures/base';

/**
 * Smoke tests that catch app-wide regressions where the editor-ui fails to boot —
 * for example a workspace package whose import is silently broken in dev mode
 * (missing Vite alias, stale dist-only re-export, CJS interop failure, etc.).
 *
 * These tests visit a small set of representative routes and fail the suite if
 * any error-level console message or uncaught page error is observed during the
 * load. They are intentionally light — UI behaviour is covered elsewhere.
 *
 * These tests also fail on `[modals]` warnings. See `MODAL_WARNING_RE`.
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

/**
 * An unregistered modal key shows a closed modal. It does not throw an error
 * (CAT-3967). So a lost registration does not fail any test.
 *
 * This warning is the only signal. `import.meta.env.DEV` removes the warning from
 * the production bundle that the e2e job builds. Only this job starts the dev
 * server, so only this job can find the warning.
 *
 * Other warnings are not fatal. The dev server writes many warnings that are not
 * defects.
 */
const MODAL_WARNING_RE = /\[modals\]/;

const navigateAndAssertNoErrors = async (
	page: Page,
	label: string,
	navigate: () => Promise<void>,
) => {
	const consoleErrors: string[] = [];
	const modalWarnings: string[] = [];
	const pageErrors: string[] = [];

	const onConsole = (message: ConsoleMessage) => {
		const text = message.text();
		const at = `(at ${message.location().url ?? '<unknown>'})`;

		if (message.type() === 'warning') {
			if (MODAL_WARNING_RE.test(text)) modalWarnings.push(`${text} ${at}`);
			return;
		}

		if (message.type() !== 'error') return;
		if (isBenign(text)) return;
		consoleErrors.push(`${text} ${at}`);
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

	if (pageErrors.length > 0 || consoleErrors.length > 0 || modalWarnings.length > 0) {
		const sections = [
			pageErrors.length > 0 && `Uncaught page errors:\n  ${pageErrors.join('\n  ')}`,
			consoleErrors.length > 0 && `Error-level console messages:\n  ${consoleErrors.join('\n  ')}`,
			modalWarnings.length > 0 &&
				`Modal keys nothing defines — the modal will not open, it will not throw:\n  ${modalWarnings.join(
					'\n  ',
				)}`,
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
			{ type: 'owner', description: 'Catalysts' },
			{
				type: 'description',
				description:
					'Boots representative routes against the Vite dev server and fails on any error-level console message, uncaught page error, or [modals] unknown-key warning during load.',
			},
		],
	},
	() => {
		test('home page boots cleanly', async ({ n8n }) => {
			await navigateAndAssertNoErrors(n8n.page, 'home', async () => {
				await n8n.start.fromHome();
			});
		});

		// The dev frontend derives its REST base from N8N_PORT. "Boots cleanly" is
		// not enough on its own: on the default ports a hardcoded 5678 would be
		// indistinguishable from correct derivation, so assert the origin directly.
		test('REST calls go to the configured backend', async ({ n8n }) => {
			const restOrigins = new Set<string>();
			n8n.page.on('request', (request) => {
				const url = new URL(request.url());
				if (url.pathname.startsWith('/rest/')) restOrigins.add(url.origin);
			});

			await n8n.start.fromHome();

			const backendOrigin = new URL(process.env.N8N_BASE_URL!).origin;
			expect([...restOrigins]).toEqual([backendOrigin]);
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
