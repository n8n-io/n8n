import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { fixtures as currentsFixtures } from '@currents/playwright';
import { test as base, expect, request } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { N8NConfig, N8NProcessUrl, N8NStack } from 'n8n-containers/stack';

import { a11yFixtures, type A11yTestFixtures } from './a11y';
import { shouldSkipContainerRequirement, type CapabilityOption } from './capabilities';
import { watchConsoleErrors } from './console-error-monitor';
import { engineParityDisposition, workflowSettingsFor } from './engine-parity';
import { resolveConfig } from './resolve-config';
import { roleFromTags, signIn, wantsReset, type StorageState } from './session';
import { startSut, type Sut } from './sut';
import { setupDefaultInterceptors } from '../config/intercepts';
import { backendV8CoverageFixtures } from '../fixtures/backend-v8-coverage';
import { observabilityFixtures, type ObservabilityTestFixtures } from '../fixtures/observability';
import {
	quarantineFixtures,
	type QuarantineTestFixtures,
	type QuarantineWorkerFixtures,
} from '../fixtures/quarantine';
import { v8CoverageFixtures } from '../fixtures/v8-coverage';
import { n8nPage } from '../pages/n8nPage';
import { ApiHelpers, type ApiHelpersOptions } from '../services/api-helper';
import { TestError, type TestRequirements } from '../Types';
import { setupTestRequirements } from '../utils/requirements';

type TestFixtures = {
	n8n: n8nPage;
	/** An isolated API client with its own cookies, signed in as the test's role. */
	api: ApiHelpers;
	baseURL: string;
	/** Reset (with `@db:reset`), default features, then one sign-in. */
	session: StorageState;
	setupRequirements: (requirements: TestRequirements) => Promise<void>;
	/** Type-safe service helpers (mailpit, gitea, proxy, observability, etc.) */
	services: ServiceHelpers;
	/**
	 * Direct URLs to each main instance (bypasses load balancer).
	 * Empty unless the SUT exposes its mains. Index 0 = main-1, Index 1 = main-2, etc.
	 */
	mainUrls: string[];
	/**
	 * Direct URL of every n8n process (mains, workers, webhook procs). Outside
	 * container mode this is the backend URL as a single main.
	 */
	processUrls: N8NProcessUrl[];
	/**
	 * Create an API helper for a specific main instance (bypasses load balancer).
	 * @param mainIndex - 0-based index of the main (0 = main-1, 1 = main-2, etc.)
	 */
	createApiForMain: (mainIndex: number) => Promise<ApiHelpers>;
	/** The Docker stack. Skips the test when the SUT has none, for example when attached. */
	n8nContainer: N8NStack;
	/** Internal auto fixture: per-spec backend V8 coverage (DEVP-370). No-op
	 *  unless COVERAGE_ENABLED. */
	backendCoverage: undefined;
	containerRequirement: undefined;
	/** Internal auto fixture: sorts a test into its engine v2 parity bucket by tag. */
	engineParity: undefined;
};

type WorkerFixtures = {
	containerConfig: N8NConfig;
	capability?: CapabilityOption;
	n8nStackConfig: N8NConfig;
	sut: Sut;
	apiOptions: ApiHelpersOptions;
	backendUrl: string;
	frontendUrl: string;
	internalUrl: string;
};

export const test = base.extend<
	TestFixtures &
		CurrentsFixtures &
		ObservabilityTestFixtures &
		QuarantineTestFixtures &
		A11yTestFixtures,
	WorkerFixtures & CurrentsWorkerFixtures & QuarantineWorkerFixtures
>({
	...currentsFixtures.baseFixtures,
	...v8CoverageFixtures,
	...backendV8CoverageFixtures,
	...currentsFixtures.actionFixtures,
	...observabilityFixtures,
	...quarantineFixtures,
	...a11yFixtures,

	// --- Worker: what to run, and the SUT that runs it ---

	containerConfig: [{}, { scope: 'worker', option: true }],
	capability: [undefined, { scope: 'worker', option: true }],

	n8nStackConfig: [
		async ({ containerConfig, capability }, use) => {
			await use(resolveConfig(containerConfig, capability, process.env));
		},
		{ scope: 'worker', box: true },
	],

	sut: [
		async ({ n8nStackConfig }, use) => {
			const sut = await startSut(n8nStackConfig);
			await use(sut);
			await sut.stop();
		},
		{ scope: 'worker', box: true, title: 'SUT' },
	],

	apiOptions: [
		async ({ n8nStackConfig }, use) => {
			await use({ workflowSettings: workflowSettingsFor(n8nStackConfig) });
		},
		{ scope: 'worker', box: true },
	],

	backendUrl: [async ({ sut }, use) => await use(sut.url), { scope: 'worker' }],
	frontendUrl: [async ({ sut }, use) => await use(sut.editorUrl), { scope: 'worker' }],
	// n8n as seen from inside the stack, for specs that make n8n call itself
	// (an HTTP Request node, a webhook destination).
	internalUrl: [async ({ sut }, use) => await use(sut.internalUrl), { scope: 'worker' }],

	// --- Test: which tests run here ---

	// Rejects an unknown @engine:* tag anywhere; only an engine v2 stack skips or
	// expects failure. See fixtures/engine-parity.ts for the tags.
	engineParity: [
		async ({ n8nStackConfig }, use, testInfo) => {
			const disposition = engineParityDisposition(testInfo.tags, n8nStackConfig.engine);
			if (disposition.action === 'skip') testInfo.skip(true, disposition.reason);
			if (disposition.action === 'expect-fail') testInfo.fail(true, disposition.reason);
			await use(undefined);
		},
		{ auto: true },
	],

	// Service requirements come from test.use(), so projects cannot filter them by title.
	containerRequirement: [
		async ({ capability, sut }, use, testInfo) => {
			testInfo.skip(
				shouldSkipContainerRequirement(capability, !sut.stack),
				'This test requires container services',
			);
			await use(undefined);
		},
		{ auto: true },
	],

	// --- Test: known state, identity, and clients ---

	session: async ({ sut }, use, { tags }) => {
		if (wantsReset(tags)) await sut.reset();
		await sut.applyDefaults();
		await use(await signIn(sut.url, roleFromTags(tags)));
	},

	baseURL: async ({ sut }, use) => await use(sut.editorUrl),

	page: async ({ page, session }, use, testInfo) => {
		const consoleErrors = watchConsoleErrors(page.context());
		await setupDefaultInterceptors(page.context());
		// 1 keeps normal debounce timing. Lower values speed tests up, but 0 causes races.
		await page.addInitScript(() => sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '1'));
		await page.context().setStorageState(session);
		await use(page);
		await consoleErrors.report(testInfo);
	},

	api: async ({ sut, session, apiOptions }, use) => {
		await using context = await request.newContext({ baseURL: sut.url, storageState: session });
		await use(new ApiHelpers(context, apiOptions));
	},

	// n8n.api shares the page's cookies, so API and UI sign-in change the same session.
	n8n: async ({ page, apiOptions }, use) => {
		await use(new n8nPage(page, ApiHelpers.forPage(page, apiOptions)));
	},

	mainUrls: async ({ sut }, use) => await use(sut.mainUrls),
	processUrls: async ({ sut }, use) => await use(sut.processUrls),

	n8nContainer: async ({ sut: { stack } }, use, testInfo) => {
		if (!stack) return testInfo.skip(true, 'Needs a Docker stack that the harness controls');
		await use(stack);
	},

	createApiForMain: async ({ sut, session, apiOptions }, use) => {
		await using contexts = new AsyncDisposableStack();
		await use(async (mainIndex) => {
			const url = sut.mainUrls[mainIndex];
			if (!url) {
				throw new TestError(
					`Invalid main index ${mainIndex}. Available mains: ${sut.mainUrls.length}. ` +
						'Ensure you are running in multi-main container mode.',
				);
			}
			const context = contexts.use(
				await request.newContext({ baseURL: url, storageState: session }),
			);
			return new ApiHelpers(context, apiOptions);
		});
	},

	setupRequirements: async ({ n8n, context }, use) => {
		await use(async (requirements) => await setupTestRequirements(n8n, context, requirements));
	},

	services: async ({ sut }, use) => await use(sut.services),
});

export { expect };
export { A11Y_BUCKETS, DEFAULT_A11Y_TAGS } from './a11y';
export type { A11yBucket, A11yCheckOptions, A11yViolation } from './a11y';

/*
Fixture Dependency Graph:
Worker: containerConfig + capability → n8nStackConfig → [sut, apiOptions]
        sut → [backendUrl, frontendUrl, internalUrl]
Test:   sut → session → [api, page] → n8n
        sut → [baseURL, services, mainUrls, processUrls, n8nContainer]
        sut + session → createApiForMain

sut:     the instance under test (Docker stack per worker, or an attached instance)
session: reset with @db:reset, default features, then one sign-in as a storage state
*/
