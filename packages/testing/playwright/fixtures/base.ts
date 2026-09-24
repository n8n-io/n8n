import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { fixtures as currentsFixtures } from '@currents/playwright';
import { test as base, expect, request, type Page } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { N8NConfig, N8NStack } from 'n8n-containers/stack';
import { createN8NStack } from 'n8n-containers/stack';

import { a11yFixtures, type A11yTestFixtures } from './a11y';
import {
	CAPABILITIES,
	shouldSkipContainerRequirement,
	type CapabilityOption,
} from './capabilities';
import { consoleErrorFixtures } from './console-error-monitor';
import { engineParityDisposition, workflowSettingsFor } from './engine-parity';
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
import { ApiHelpers, type UserRole } from '../services/api-helper';
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
	 * Create an API helper for a specific main instance (bypasses load balancer).
	 * Useful for multi-main testing scenarios.
	 * @param mainIndex - 0-based index of the main (0 = main-1, 1 = main-2, etc.)
	 */
	createApiForMain: (mainIndex: number) => Promise<ApiHelpers>;
	/** Internal auto fixture: per-spec backend V8 coverage (DEVP-370). No-op
	 *  unless COVERAGE_ENABLED. */
	backendCoverage: undefined;
	containerRequirement: undefined;
	testSetup: undefined;
	authRole: UserRole | null;
	consoleErrorMonitor: unknown;
	page: Page;
	/** Internal auto fixture: sorts a test into its engine 2.0 parity bucket by tag. */
	engineParity: undefined;
};

function authRoleFromTags(tags: string[]): UserRole | null {
	const authTags = tags.filter((tag) => tag.toLowerCase().startsWith('@auth:'));
	const roles = ['admin', 'owner', 'member', 'chat', 'none'] as const;
	for (const role of roles) {
		if (authTags.some((tag) => tag.toLowerCase() === `@auth:${role}`)) {
			return role === 'none' ? null : role;
		}
	}
	if (authTags.length) throw new TestError(`Unsupported authentication tag: ${authTags[0]}`);
	return 'owner';
}

type WorkerFixtures = {
	n8nUrl: string;
	backendUrl: string;
	frontendUrl: string;
	internalUrl: string;
	dbSetup: undefined;
	n8nStackConfig: N8NConfig;
	n8nContainer: N8NStack;
	capability?: CapabilityOption;
};

type ProjectUse = { containerConfig?: N8NConfig };

function parseGlobalTestEnv(): Record<string, string> {
	const raw = process.env.N8N_TEST_ENV;
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, string>;
	} catch {
		console.warn('[base.ts] Failed to parse N8N_TEST_ENV');
		return {};
	}
}

function logKeepalive(container: N8NStack): void {
	console.log('\n=== KEEPALIVE: Containers left running for debugging ===');
	console.log(`    URL: ${container.baseUrl}`);
	console.log(`    Project: ${container.projectName}`);
	console.log('    Cleanup: pnpm --filter n8n-containers stack:clean:all');
	console.log('=========================================================\n');
}

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
	...consoleErrorFixtures,
	...quarantineFixtures,
	...a11yFixtures,

	// Option for test.use({ capability: 'proxy' }) - transformed into N8NStack by n8nContainer
	capability: [undefined, { scope: 'worker', option: true }],

	// Rejects an unknown @engine:* tag anywhere; only an engine 2.0 stack skips or
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

	// Resolves the effective N8NConfig from project.containerConfig (base) +
	// capability (override) + N8N_TEST_ENV (global). Topology-neutral: it
	// always produces a config, even when a container will not be provisioned.
	n8nStackConfig: [
		async ({ capability }, use, workerInfo) => {
			const { containerConfig: base = {} } = workerInfo.project.use as ProjectUse;
			const override: N8NConfig = !capability
				? {}
				: typeof capability === 'string'
					? CAPABILITIES[capability]
					: capability;

			const globalEnv = parseGlobalTestEnv();

			const config: N8NConfig = {
				...base,
				...override,
				services: [...new Set([...(base.services ?? []), ...(override.services ?? [])])],
				env: {
					...globalEnv,
					...base.env,
					...override.env,
					E2E_TESTS: 'true',
					N8N_RESTRICT_FILE_ACCESS_TO: '',
				},
				// Coverage pipeline opt-in: when the coverage runner sets N8N_COVERAGE_DIR,
				// bridge it to the stack's typed config so containers collect V8 coverage.
				...(process.env.N8N_COVERAGE_DIR ? { coverageHostDir: process.env.N8N_COVERAGE_DIR } : {}),
			};

			await use(config);
		},
		{ scope: 'worker', box: true },
	],

	// Creates container from n8nStackConfig.
	// When N8N_BASE_URL is set, skips container creation for local testing.
	n8nContainer: [
		async ({ n8nStackConfig }, use) => {
			if (getBackendUrl()) {
				await use(null!);
				return;
			}

			const container = await createN8NStack(n8nStackConfig);
			await use(container);

			if (process.env.N8N_CONTAINERS_KEEPALIVE === 'true') {
				logKeepalive(container);
				return;
			}

			await container.stop();
		},
		{ scope: 'worker', box: true },
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

	dbSetup: [
		async ({ n8nContainer, n8nStackConfig }, use) => {
			if (n8nContainer) {
				console.log('Resetting database for new container');
				const apiContext = await request.newContext({ baseURL: n8nContainer.baseUrl });
				const api = new ApiHelpers(apiContext);
				try {
					await api.resetDatabase();
				} finally {
					await apiContext.dispose();
				}

				// The reset endpoint only reaches the control plane database.
				if (n8nStackConfig.engine) {
					await (
						n8nContainer.services.enginePostgres ?? n8nContainer.services.postgres
					).truncateEngineDatabase();
				}
			}
			await use(undefined);
		},
		{ scope: 'worker' },
	],

	baseURL: async ({ frontendUrl, dbSetup }, use) => {
		void dbSetup; // Ensure dbSetup runs first
		await use(frontendUrl);
	},

	// Both API and UI consumers depend on this fixture. A combined consumer resets once.
	testSetup: async ({ dbSetup, backendUrl }, use, testInfo) => {
		void dbSetup;
		if (testInfo.tags.some((tag) => tag.toLowerCase() === '@db:reset')) {
			if (getBackendUrl() && process.env.RESET_E2E_DB !== 'true') {
				throw new TestError('Database reset is not enabled for this target');
			}
			const context = await request.newContext({ baseURL: backendUrl });
			try {
				await new ApiHelpers(context).resetDatabase();
			} finally {
				await context.dispose();
			}
		}
		await use(undefined);
	},

	authRole: async ({ testSetup }, use, testInfo) => {
		void testSetup;
		await use(authRoleFromTags(testInfo.tags));
	},

	page: async ({ page, consoleErrorMonitor }, use) => {
		void consoleErrorMonitor;
		await use(page);
	},

	n8n: async (
		{ context, backendUrl, frontendUrl, n8nStackConfig, authRole, consoleErrorMonitor },
		use,
	) => {
		void consoleErrorMonitor;
		const apiOptions = { workflowSettings: workflowSettingsFor(n8nStackConfig) };
		await setupDefaultInterceptors(context);
		const page = await context.newPage();

		// Set debounce multiplier for E2E tests - 1 means normal timing (no change)
		// Can be lowered (e.g. 0.5) to speed up tests, but avoid 0 as it causes race conditions
		await page.addInitScript(() => {
			sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '1');
		});

		const useSeparateApiContext = backendUrl !== frontendUrl;

		if (useSeparateApiContext) {
			const apiContext = await request.newContext({ baseURL: backendUrl });
			const api = new ApiHelpers(apiContext, apiOptions);

			try {
				const n8nInstance = new n8nPage(page, api);
				if (authRole) await api.signin(authRole);
				const apiCookies = await apiContext.storageState();
				const authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);

				// Transfer auth cookie from API context (backend) to browser context (frontend)
				if (authCookie) {
					const backendUrlParsed = new URL(backendUrl);
					const frontendUrlParsed = new URL(frontendUrl);

					if (backendUrlParsed.hostname === frontendUrlParsed.hostname) {
						await context.addCookies([
							{
								...authCookie,
								domain: frontendUrlParsed.hostname,
								path: '/',
								sameSite: 'Lax',
							},
						]);
					} else {
						await context.addCookies([
							{
								name: authCookie.name,
								value: authCookie.value,
								url: frontendUrl,
								path: '/',
								httpOnly: authCookie.httpOnly,
								secure: authCookie.secure,
								sameSite: 'Lax',
							},
						]);
					}
				}
				await n8nInstance.start.withProjectFeatures();
				await use(n8nInstance);
			} finally {
				await apiContext.dispose();
			}
		} else {
			const n8nInstance = new n8nPage(page, new ApiHelpers(page.context().request, apiOptions));
			if (authRole) await n8nInstance.api.signin(authRole);
			await n8nInstance.start.withProjectFeatures();
			await use(n8nInstance);
		}
	},

	api: async ({ backendUrl, n8nStackConfig, authRole }, use) => {
		const context = await request.newContext({ baseURL: backendUrl });
		const api = new ApiHelpers(context, { workflowSettings: workflowSettingsFor(n8nStackConfig) });
		try {
			if (authRole) await api.signin(authRole);
			await use(api);
		} finally {
			await context.dispose();
		}
	},

	mainUrls: async ({ n8nContainer }, use) => {
		const urls = n8nContainer?.mainUrls ?? [];
		await use(urls);
	},

	createApiForMain: async ({ n8nContainer, n8nStackConfig, authRole }, use) => {
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
			if (authRole) await api.signin(authRole);

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
Test:   dbSetup + backendUrl → testSetup → authRole → [api, n8n, createApiForMain]
        frontendUrl + dbSetup → baseURL → context → n8n
        context → consoleErrorMonitor → [page, n8n]
        n8nContainer → services
        n8n → a11y

n8nStackConfig: Resolved N8NConfig (topology-neutral, always produced)
n8nContainer:   Container lifecycle (stop, containers, mainUrls, etc.)
services:       Type-safe helpers (mailpit, gitea, proxy, observability, etc.)
*/
