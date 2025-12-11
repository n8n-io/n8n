import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { fixtures as currentsFixtures } from '@currents/playwright';
import { test as base, expect, request } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/n8n-test-container-creation';
import { createN8NStack } from 'n8n-containers/n8n-test-container-creation';
import { ContainerTestHelpers } from 'n8n-containers/n8n-test-container-helpers';

import { N8N_AUTH_COOKIE } from '../config/constants';
import { setupDefaultInterceptors } from '../config/intercepts';
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
	chaos: ContainerTestHelpers;
	n8nContainer: N8NStack;
	containerConfig: ContainerConfig;
	addContainerCapability: ContainerConfig;
};

interface ContainerConfig {
	postgres?: boolean;
	queueMode?: {
		mains: number;
		workers: number;
	};
	env?: Record<string, string>;
	proxyServerEnabled?: boolean;
	taskRunner?: boolean;
	sourceControl?: boolean;
	email?: boolean;
	resourceQuota?: {
		memory?: number; // in GB
		cpu?: number; // in cores
	};
}

/**
 * Extended Playwright test with n8n-specific fixtures.
 * Supports both external n8n instances (via N8N_BASE_URL) and containerized testing.
 * Provides tag-driven authentication and database management.
 */
export const test = base.extend<
	TestFixtures & CurrentsFixtures,
	WorkerFixtures & CurrentsWorkerFixtures
>({
	...currentsFixtures.baseFixtures,
	...currentsFixtures.coverageFixtures,
	...currentsFixtures.actionFixtures,

	// Add a container capability to the test e.g proxy server, task runner, etc
	addContainerCapability: [
		async ({}, use) => {
			await use({});
		},
		{ scope: 'worker', box: true },
	],

	// Container configuration from the project use options
	containerConfig: [
		async ({ addContainerCapability }, use, workerInfo) => {
			const projectConfig = workerInfo.project.use as { containerConfig?: ContainerConfig };
			const baseConfig = projectConfig?.containerConfig ?? {};

			// Build merged configuration
			const merged: ContainerConfig = {
				...baseConfig,
				...addContainerCapability,
				env: {
					...baseConfig.env,
					...addContainerCapability.env,
					E2E_TESTS: 'true',
					N8N_RESTRICT_FILE_ACCESS_TO: '',
				},
			};

			await use(merged);
		},
		{ scope: 'worker', box: true },
	],

	// Create a new n8n container if backend URL is not set, otherwise use the existing n8n instance
	n8nContainer: [
		async ({ containerConfig }, use, workerInfo) => {
			const envBaseURL = getBackendUrl();

			if (envBaseURL) {
				await use(null as unknown as N8NStack);
				return;
			}

			const startTime = Date.now();
			console.log(
				`[${new Date().toISOString()}] Creating container for project: ${workerInfo.project.name}, worker: ${workerInfo.workerIndex}`,
			);
			console.log('Container config:', JSON.stringify(containerConfig));

			const container = await createN8NStack(containerConfig);
			const duration = ((Date.now() - startTime) / 1000).toFixed(1);

			console.log(
				`[${new Date().toISOString()}] Container created in ${duration}s - URL: ${container.baseUrl}`,
			);

			await use(container);
			await container.stop();
		},
		{ scope: 'worker', box: true },
	],

	// Set the n8n URL for based on the N8N_BASE_URL environment variable or the n8n container
	n8nUrl: [
		async ({ n8nContainer }, use) => {
			const envBaseURL = process.env.N8N_BASE_URL ?? n8nContainer?.baseUrl;
			await use(envBaseURL);
		},
		{ scope: 'worker' },
	],

	// Backend URL - used for API calls
	// When N8N_BASE_URL is set, use it; otherwise fall back to n8nUrl
	backendUrl: [
		async ({ n8nContainer }, use) => {
			const envBackendURL = getBackendUrl() ?? n8nContainer?.baseUrl;
			await use(envBackendURL);
		},
		{ scope: 'worker' },
	],

	// Frontend URL - used for browser navigation
	// When N8N_EDITOR_URL is set (dev mode), use it; otherwise fall back to n8nUrl
	frontendUrl: [
		async ({ n8nContainer }, use) => {
			const envFrontendURL = getFrontendUrl() ?? n8nContainer?.baseUrl;
			await use(envFrontendURL);
		},
		{ scope: 'worker' },
	],

	// Reset the database for the new container
	dbSetup: [
		async ({ backendUrl, n8nContainer }, use) => {
			if (n8nContainer) {
				console.log('Resetting database for new container');
				const apiContext = await request.newContext({ baseURL: backendUrl });
				const api = new ApiHelpers(apiContext);
				await api.resetDatabase();
				await apiContext.dispose();
			}
			await use(undefined);
		},
		{ scope: 'worker' },
	],

	// Create container test helpers for the n8n container.
	chaos: [
		async ({ n8nContainer }, use) => {
			if (getBackendUrl()) {
				throw new TestError(
					'Chaos testing is not supported when using N8N_BASE_URL environment variable. Remove N8N_BASE_URL to use containerized testing.',
				);
			}
			const helpers = new ContainerTestHelpers(n8nContainer.containers);
			await use(helpers);
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

		// Only create a separate API context when backend and frontend URLs differ
		const useSeparateApiContext = backendUrl !== frontendUrl;

		if (useSeparateApiContext) {
			// Create a separate API context with backend URL for API calls
			const apiContext = await request.newContext({ baseURL: backendUrl });
			const api = new ApiHelpers(apiContext);

			const n8nInstance = new n8nPage(page, api);
			await n8nInstance.api.setupFromTags(testInfo.tags);

			// Authentication strategy:
			// - No @auth: tag → Sign in as owner (default)
			// - @auth:none → Stay unauthenticated (for testing sign in flows)
			// - @auth:member, @auth:admin etc → Handled by setupFromTags above
			const hasAuthTag = testInfo.tags.some((tag) => tag.startsWith('@auth:'));

			// Check if already authenticated from setupFromTags
			let apiCookies = await apiContext.storageState();
			let authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);

			// Default to owner authentication when no auth tag is specified
			if (!hasAuthTag && !authCookie) {
				await api.signin('owner');
				apiCookies = await apiContext.storageState();
				authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);
			}

			// Transfer authentication cookies from API context (backend) to browser context (frontend)
			if (authCookie) {
				const backendUrlParsed = new URL(backendUrl);
				const frontendUrlParsed = new URL(frontendUrl);

				if (backendUrlParsed.hostname === frontendUrlParsed.hostname) {
					// Same host (e.g. localhost different ports) → use domain-based cookie
					await context.addCookies([
						{
							...authCookie,
							domain: frontendUrlParsed.hostname,
							path: '/',
							sameSite: 'Lax',
						},
					]);
				} else {
					// Different hosts → use URL-based cookie setting
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
			// Enable project features for the tests, this is used in several tests, but is never disabled in tests, so we can have it on by default
			await n8nInstance.start.withProjectFeatures();
			await use(n8nInstance);
			await apiContext.dispose();
		} else {
			const n8nInstance = new n8nPage(page);
			await n8nInstance.api.setupFromTags(testInfo.tags);

			// Enable project features for the tests, this is used in several tests, but is never disabled in tests, so we can have it on by default
			await n8nInstance.start.withProjectFeatures();
			await use(n8nInstance);
		}
	},

	// This is a completely isolated API context for tests that don't need the browser
	api: async ({ backendUrl }, use, testInfo) => {
		const context = await request.newContext({ baseURL: backendUrl });
		const api = new ApiHelpers(context);
		await api.setupFromTags(testInfo.tags);

		// Authentication strategy:
		// - No @auth: tag → Sign in as owner (default)
		// - @auth:none → Stay unauthenticated (for testing sign in flows)
		// - @auth:member, @auth:admin etc → Handled by setupFromTags above
		const hasAuthTag = testInfo.tags.some((tag) => tag.startsWith('@auth:'));

		// Check if already authenticated from setupFromTags
		const apiCookies = await context.storageState();
		const authCookie = apiCookies.cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);

		// Default to owner authentication when no auth tag is specified
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
		// n8nContainer is "null" if running tests in "local" mode
		if (!n8nContainer) {
			throw new TestError(
				'Testing with Proxy server is not supported when using N8N_BASE_URL environment variable. Remove N8N_BASE_URL to use containerized testing.',
			);
		}

		const proxyServerContainer = n8nContainer.containers.find((container) =>
			container.getName().endsWith('proxyserver'),
		);

		// proxy server is not initialized in local mode (it be only supported in container modes)
		// tests that require proxy server should have "@capability:proxy" so that they are skipped in local mode
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
Dependency Graph:
Worker Scope: containerConfig → n8nContainer → [n8nUrl, chaos] → dbSetup
Test Scope:
  - UI Stream: dbSetup → baseURL → context → page → n8n
  - API Stream: dbSetup → baseURL → api
Note: baseURL depends on dbSetup to ensure database is ready before tests run
Both streams are independent after baseURL, allowing for pure API tests or combined UI+API tests
*/
