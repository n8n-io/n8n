import type { ConsoleMessage, Page } from '@playwright/test';

import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';
import simpleWorkflow from '../../../workflows/Manual_wait_set.json';

/**
 * Preview mode is one of three paths that never reach the post-login modal
 * registration in `editor-ui/src/app/init/index.ts` — the others are any
 * unauthenticated route and a navigation that throws before it.
 *
 * The mechanism, and it is not the one the name suggests: preview mode makes the
 * demo routes bypass the `authenticated` middleware (`app/router.ts`), so the page
 * loads with no current user. `initializeAuthenticatedFeatures()` returns early on
 * `!usersStore.currentUser`, so `registerModuleModals()` never runs and the registry
 * holds only what `registerEagerModals()` put there pre-mount (`app/modals.manifest.ts`).
 * That is why these tests are `@auth:none` — an authenticated preview session registers
 * both phases and proves nothing.
 *
 * What these tests assert, and what they deliberately do not:
 *
 * - They assert the app boots on both preview entry points with no console error and no
 *   page error. Registration runs pre-mount, so a broken registry surfaces here as a
 *   failed boot rather than as a dead click.
 * - They do NOT assert that a modal opens, because no keyed modal is reachable in
 *   preview mode today: the demo canvas is read-only (`isCanvasReadOnly` includes the
 *   demo route in `app/views/NodeView.vue`), which disables the parameter controls that
 *   open one, and `DemoDiffView.vue` renders `WorkflowDiffView` inline instead of through
 *   the `workflowDiff` key. The registration property itself stays pinned by
 *   `editor-ui/src/app/modals.manifest.test.ts`.
 *
 * If a later seam moves a modal that preview mode CAN reach, add the open-and-close
 * assertion here — that is the case this file exists to catch.
 *
 * Scope is one entry point on purpose. `registerEagerModals()` runs once pre-mount in
 * `main.ts`, so it is route-independent: `/workflows/demo/diff` would exercise the same
 * registration a second time and only add what `demo-diff.spec.ts` already asserts.
 */
const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

/**
 * Console noise that says nothing about whether the app booted: the Vite dev client, and
 * failed HTTP requests. The latter is deliberate rather than lazy — an unauthenticated
 * preview session still calls authenticated endpoints (`/types/nodes.json`,
 * `/rest/community-node-types`, `/rest/workflows/new` all answer 401 today), and the
 * browser logs each one as a console error. Asserting on those would pin existing
 * request behaviour, not the JS-level failure this file is about.
 */
const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
	/\[vite\] (server connection lost|connecting\.\.\.)/,
	/has been externalized for browser compatibility/,
	/Failed to load resource/,
];

type PageProblems = { consoleErrors: string[]; pageErrors: string[] };

/**
 * Collect JS-level console errors and uncaught page errors for the lifetime of the page.
 * Attached before the first navigation, because registration runs pre-mount and a broken
 * registry throws during boot.
 */
function watchForPageProblems(page: Page): PageProblems {
	const problems: PageProblems = { consoleErrors: [], pageErrors: [] };

	page.on('console', (message: ConsoleMessage) => {
		if (message.type() !== 'error') return;
		const text = message.text();
		if (IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) return;
		problems.consoleErrors.push(`${text} (at ${message.location().url})`);
	});

	page.on('pageerror', (error: Error) => {
		problems.pageErrors.push(`${error.name}: ${error.message}`);
	});

	return problems;
}

test.describe(
	'Preview mode: modal registration',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		test('boots the demo canvas with no current user @auth:none', async ({ n8n }) => {
			const problems = watchForPageProblems(n8n.page);

			await n8n.demo.goto();
			await n8n.demo.importWorkflow(simpleWorkflow);

			// Deliberately no notification assertion, unlike the authenticated demo tests in
			// `demo.spec.ts`: an unauthenticated preview session raises one "Init Problem" toast
			// today, from the 401 on credential loading in `useWorkflowInitialization.ts`. That
			// predates the modal work and is not what this file guards, so pinning it either way
			// would put an unrelated bug in a modal test's failure message.
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
			expect(problems.pageErrors).toEqual([]);
			expect(problems.consoleErrors).toEqual([]);
		});
	},
);
