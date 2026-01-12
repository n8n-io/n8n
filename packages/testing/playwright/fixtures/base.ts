import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { fixtures as currentsFixtures } from '@currents/playwright';
import { test as base, expect, request } from '@playwright/test';
import type { N8NConfig, N8NStack } from 'n8n-containers/stack';
import { createN8NStack } from 'n8n-containers/stack';

import { CAPABILITIES, type Capability } from './capabilities';
import { consoleErrorFixtures } from './console-error-monitor';
import { N8N_AUTH_COOKIE } from '../config/constants';
import { setupDefaultInterceptors } from '../config/intercepts';
import { observabilityFixtures, type ObservabilityTestFixtures } from '../fixtures/observability';
import { n8nPage } from '../pages/n8nPage';
import { ApiHelpers } from '../services/api-helper';
import { ProxyServer } from '../services/proxy-server';
import { TestError, type TestRequirements } from '../Types';
import { setupTestRequirements } from '../utils/requirements';
import { getBackendUrl, getFrontendUrl } from '../utils/url-helper';

type TestFixtures = {
	n8n: n8nPage;
	api: ApiHelpers;
	baseURL: string;
	setupRequirements: (requirements: TestRequirements) => Promise<void>;
	proxyServer: ProxyServer;
};

type WorkerFixtures = {
	n8nUrl: string;
	backendUrl: string;
	frontendUrl: string;
	dbSetup: undefined;
	n8nContainer: N8NStack;
	capability?: CapabilityOption;
};

type CapabilityOption = Capability | N8NConfig;
type ProjectUse = { containerConfig?: N8NConfig };

export const test = base.extend<
	TestFixtures & CurrentsFixtures & ObservabilityTestFixtures,
	WorkerFixtures & CurrentsWorkerFixtures
>({
	...currentsFixtures.baseFixtures,
	...currentsFixtures.coverageFixtures,
	...currentsFixtures.actionFixtures,
	...observabilityFixtures,
	...consoleErrorFixtures,

	// Option for test.use({ capability: 'proxy' }) - transformed into N8NStack by n8nContainer
	capability: [undefined, { scope: 'worker', option: true }],

	// Creates container from: project.containerConfig (base) + capability (override)
	// When N8N_BASE_URL is set, skips container creation for local testing
	n8nContainer: [
		async ({ capability }, use, workerInfo) => {
			if (getBackendUrl()) {
				await use(null!);
				return;
			}

			const { containerConfig: base = {} } = workerInfo.project.use as ProjectUse;
			const override: N8NConfig = !capability
				? {}
				: typeof capability === 'string'
					? CAPABILITIES[capability]
					: capability;

			const config: N8NConfig = {
				...base,
				...override,
				env: { ...base.env, ...override.env, E2E_TESTS: 'true', N8N_RESTRICT_FILE_ACCESS_TO: '' },
			};

			const container = await createN8NStack(config);
			await use(container);
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

	dbSetup: [
		async ({ n8nContainer }, use) => {
			if (n8nContainer) {
				console.log('Resetting database for new container');
				const apiContext = await request.newContext({ baseURL: n8nContainer.baseUrl });
				const api = new ApiHelpers(apiContext);
				await api.resetDatabase();
				await apiContext.dispose();
			}
			await use(undefined);
		},
		{ scope: 'worker' },
	],

	baseURL: async ({ frontendUrl, dbSetup }, use) => {
		void dbSetup; // Ensure dbSetup runs first
		await use(frontendUrl);
	},

	n8n: async ({ context, backendUrl, frontendUrl }, use, testInfo) => {
		await setupDefaultInterceptors(context);
		const page = await context.newPage();

		const useSeparateApiContext = backendUrl !== frontendUrl;

		if (useSeparateApiContext) {
			const apiContext = await request.newContext({ baseURL: backendUrl });
			const api = new ApiHelpers(apiContext);

			const n8nInstance = new n8nPage(page, api);
			await n8nInstance.api.setupFromTags(testInfo.tags);

			// Auth: no tag = owner, @auth:none = unauthenticated, @auth:member etc = specific role
			const hasAuthTag = testInfo.tags.some((tag) => tag.startsWith('@auth:'));
			let apiCookies = await apiContext.storageState();
			let authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);

			if (!hasAuthTag && !authCookie) {
				await api.signin('owner');
				apiCookies = await apiContext.storageState();
				authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);
			}

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
			await apiContext.dispose();
		} else {
			const n8nInstance = new n8nPage(page);
			await n8nInstance.api.setupFromTags(testInfo.tags);
			await n8nInstance.start.withProjectFeatures();
			await use(n8nInstance);
		}
	},

	api: async ({ backendUrl }, use, testInfo) => {
		const context = await request.newContext({ baseURL: backendUrl });
		const api = new ApiHelpers(context);
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

	setupRequirements: async ({ n8n, context }, use) => {
		const setupFunction = async (requirements: TestRequirements): Promise<void> => {
			await setupTestRequirements(n8n, context, requirements);
		};

		await use(setupFunction);
	},

	proxyServer: async ({ n8nContainer }, use) => {
		if (!n8nContainer) {
			throw new TestError(
				'Testing with Proxy server is not supported when using N8N_BASE_URL environment variable. Remove N8N_BASE_URL to use containerized testing.',
			);
		}

		const proxyServerContainer = n8nContainer.containers.find((container) =>
			container.getName().endsWith('proxyserver'),
		);

		if (!proxyServerContainer) {
			throw new TestError('Proxy server container not initialized. Cannot initialize client.');
		}

		const serverUrl = `http://${proxyServerContainer?.getHost()}:${proxyServerContainer?.getFirstMappedPort()}`;
		const proxyServer = new ProxyServer(serverUrl);

		await use(proxyServer);
	},
});

export { expect };

/*
Fixture Dependency Graph:
Worker: capability + project.containerConfig → n8nContainer → [backendUrl, frontendUrl, dbSetup]
Test:   frontendUrl + dbSetup → baseURL → n8n (uses backendUrl for API calls)
        backendUrl → api

n8nContainer provides unified access to:
- services: Type-safe helpers (mailpit, gitea, observability, etc.)
- logs/metrics: Shortcuts for observability queries
- findContainers/stopContainer: Container operations for chaos testing
- serviceResults: Raw service results (advanced use)
*/
