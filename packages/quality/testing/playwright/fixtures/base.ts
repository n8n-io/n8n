import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { fixtures as currentsFixtures } from '@currents/playwright';
import { test as base, expect, request } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { N8NProcessUrl } from 'n8n-containers/stack';

import { a11yFixtures, type A11yTestFixtures } from './a11y';
import { shouldSkipContainerRequirement } from './capabilities';
import { consoleErrorFixtures } from './console-error-monitor';
import { containerFixtures, type ContainerWorkerFixtures } from './containers';
import {
	type CanvasRunGuard,
	engineParityDisposition,
	watchCanvasRuns,
	workflowSettingsFor,
} from './engine-parity';
import { N8N_AUTH_COOKIE } from '../config/constants';
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
import { ApiHelpers } from '../services/api-helper';
import { TestError, type TestRequirements } from '../Types';
import { setupTestRequirements } from '../utils/requirements';
import { getBackendUrl, getFrontendUrl } from '../utils/url-helper';

type TestFixtures = {
	n8n: n8nPage;
	api: ApiHelpers;
	baseURL: string;
	setupRequirements: (requirements: TestRequirements) => Promise<void>;
	/** Type-safe service helpers (mailpit, gitea, proxy, observability, etc.) */
	services: ServiceHelpers;
	/**
	 * Direct URLs to each main instance (bypasses load balancer).
	 * Only available in container mode with multi-main setup.
	 * Index 0 = main-1, Index 1 = main-2, etc.
	 */
	mainUrls: string[];
	/**
	 * Direct URL of every n8n process (mains, workers, webhook procs). Outside
	 * container mode this is the backend URL as a single main.
	 */
	processUrls: N8NProcessUrl[];
	/**
	 * Create an API helper for a specific main instance (bypasses load balancer).
	 * Useful for multi-main testing scenarios.
	 * @param mainIndex - 0-based index of the main (0 = main-1, 1 = main-2, etc.)
	 */
	createApiForMain: (mainIndex: number) => Promise<ApiHelpers>;
	/** Internal auto fixture: per-spec backend V8 coverage (DEVP-370). No-op
	 *  unless COVERAGE_ENABLED. */
	backendCoverage: undefined;
	containerRequirement: undefined;
	/** Internal auto fixture: sorts a test into its engine v2 parity bucket by tag. */
	engineParity: undefined;
	/**
	 * Watches the runs the page starts and fails the test after it when one
	 * stayed on the legacy engine. A test that runs the legacy engine on purpose
	 * calls `allowLegacyRuns()`.
	 */
	canvasRuns: CanvasRunGuard;
};

type WorkerFixtures = ContainerWorkerFixtures & {
	n8nUrl: string;
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
	...containerFixtures,
	...observabilityFixtures,
	...consoleErrorFixtures,
	...quarantineFixtures,
	...a11yFixtures,

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

	// Service requirements now come from test.use(), so local projects cannot filter them by title.
	containerRequirement: [
		async ({ capability }, use, testInfo) => {
			testInfo.skip(
				shouldSkipContainerRequirement(capability, !!getBackendUrl()),
				'This test requires container services',
			);
			await use(undefined);
		},
		{ auto: true },
	],

	n8nUrl: [
		async ({ n8nContainer }, use) => {
			const envBaseURL = process.env.N8N_BASE_URL ?? n8nContainer?.baseUrl;
			await use(envBaseURL);
		},
		{ scope: 'worker' },
	],

	backendUrl: [
		async ({ n8nContainer }, use) => {
			const envBackendURL = getBackendUrl() ?? n8nContainer?.baseUrl;
			await use(envBackendURL);
		},
		{ scope: 'worker' },
	],

	frontendUrl: [
		async ({ n8nContainer }, use) => {
			const envFrontendURL = getFrontendUrl() ?? n8nContainer?.baseUrl;
			await use(envFrontendURL);
		},
		{ scope: 'worker' },
	],

	// The n8n URL as seen from *inside* the stack, for specs that make n8n itself
	// call it (an HTTP Request node, a webhook destination). Under container
	// projects the node runs in a main or worker container, where the host-mapped
	// `backendUrl` port does not exist - use the network alias instead. Locally
	// there are no containers and n8n shares the host's loopback, so they match.
	internalUrl: [
		async ({ n8nContainer, backendUrl }, use) => {
			await use(n8nContainer?.internalMainUrls[0] ?? backendUrl);
		},
		{ scope: 'worker' },
	],

	baseURL: async ({ frontendUrl, dbSetup }, use) => {
		void dbSetup; // Ensure dbSetup runs first
		await use(frontendUrl);
	},

	canvasRuns: async ({ context, n8nStackConfig }, use) => {
		const guard = await watchCanvasRuns(context, workflowSettingsFor(n8nStackConfig));
		await use(guard);
		guard.assertRoutedToEngine();
	},

	// `canvasRuns` installs its route before this fixture opens the page.
	n8n: async ({ context, n8nStackConfig, canvasRuns }, use, testInfo) => {
		void canvasRuns;
		const apiOptions = { workflowSettings: workflowSettingsFor(n8nStackConfig) };
		await setupDefaultInterceptors(context, apiOptions);
		const page = await context.newPage();

		// Set debounce multiplier for E2E tests - 1 means normal timing (no change)
		// Can be lowered (e.g. 0.5) to speed up tests, but avoid 0 as it causes race conditions
		await page.addInitScript(() => {
			sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '1');
		});

		const n8nInstance = new n8nPage(page, new ApiHelpers(page.context().request, apiOptions));
		await n8nInstance.api.setupFromTags(testInfo.tags);

		// Auth fallback: untagged tests establish the owner session
		const hasAuthTag = testInfo.tags.some((tag) => tag.startsWith('@auth:'));
		const cookies = await context.cookies();
		const authCookie = cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);
		if (!hasAuthTag && !authCookie) {
			await n8nInstance.api.signin('owner');
		}

		if (!testInfo.tags.includes('@auth:none')) {
			await n8nInstance.start.withProjectFeatures();
		}
		await use(n8nInstance);
	},

	api: async ({ backendUrl, n8nStackConfig }, use, testInfo) => {
		const context = await request.newContext({ baseURL: backendUrl });
		const api = new ApiHelpers(context, { workflowSettings: workflowSettingsFor(n8nStackConfig) });
		await api.setupFromTags(testInfo.tags);

		const hasAuthTag = testInfo.tags.some((tag) => tag.startsWith('@auth:'));
		const apiCookies = await context.storageState();
		const authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);

		if (!hasAuthTag && !authCookie) {
			await api.signin('owner');
		}

		await use(api);
		await context.dispose();
	},

	mainUrls: async ({ n8nContainer }, use) => {
		const urls = n8nContainer?.mainUrls ?? [];
		await use(urls);
	},

	processUrls: async ({ n8nContainer, backendUrl }, use) => {
		await use(n8nContainer?.processUrls ?? [{ role: 'main', name: 'main', url: backendUrl }]);
	},

	createApiForMain: async ({ n8nContainer, n8nStackConfig }, use, testInfo) => {
		const contexts: Array<{ dispose: () => Promise<void> }> = [];

		const createApi = async (mainIndex: number): Promise<ApiHelpers> => {
			const mainUrls = n8nContainer?.mainUrls ?? [];
			if (mainIndex < 0 || mainIndex >= mainUrls.length) {
				throw new TestError(
					`Invalid main index ${mainIndex}. Available mains: ${mainUrls.length}. ` +
						'Ensure you are running in multi-main container mode.',
				);
			}

			const context = await request.newContext({ baseURL: mainUrls[mainIndex] });
			contexts.push(context);

			const api = new ApiHelpers(context, {
				workflowSettings: workflowSettingsFor(n8nStackConfig),
			});
			await api.setupFromTags(testInfo.tags.filter((tag) => tag.toLowerCase() !== '@db:reset'));

			const hasAuthTag = testInfo.tags.some((tag) => tag.startsWith('@auth:'));
			const apiCookies = await context.storageState();
			const authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);

			if (!hasAuthTag && !authCookie) {
				await api.signin('owner');
			}

			return api;
		};

		await use(createApi);

		// Cleanup all created contexts
		for (const ctx of contexts) {
			await ctx.dispose();
		}
	},

	setupRequirements: async ({ n8n, context }, use) => {
		const setupFunction = async (requirements: TestRequirements): Promise<void> => {
			await setupTestRequirements(n8n, context, requirements);
		};

		await use(setupFunction);
	},

	services: async ({ n8nContainer }, use) => {
		await use(n8nContainer.services);
	},
});

export { expect };
export { A11Y_BUCKETS, DEFAULT_A11Y_TAGS } from './a11y';
export type { A11yBucket, A11yCheckOptions, A11yViolation } from './a11y';

/*
Fixture Dependency Graph:
Worker: capability + project.containerConfig → n8nStackConfig → n8nContainer → [backendUrl, frontendUrl, dbSetup]
Test:   frontendUrl + dbSetup → baseURL → n8n (uses backendUrl for API calls)
        backendUrl → api
        n8nContainer → services
        n8n → a11y

n8nStackConfig: Resolved N8NConfig (topology-neutral, always produced)
n8nContainer:   Container lifecycle (stop, containers, mainUrls, etc.)
services:       Type-safe helpers (mailpit, gitea, proxy, observability, etc.)
*/
