import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { fixtures as currentsFixtures } from '@currents/playwright';
import { test as base, expect, request } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/n8n-test-container-creation';
import { createN8NStack } from 'n8n-containers/n8n-test-container-creation';
import { ContainerTestHelpers } from 'n8n-containers/n8n-test-container-helpers';

import { setupDefaultInterceptors } from '../config/intercepts';
import { n8nPage } from '../pages/n8nPage';
import { ApiHelpers } from '../services/api-helper';
import { ProxyServer } from '../services/proxy-server';
import { TestError, type TestRequirements } from '../Types';
import { setupTestRequirements } from '../utils/requirements';

type TestFixtures = {
	n8n: n8nPage;
	api: ApiHelpers;
	baseURL: string;
	setupRequirements: (requirements: TestRequirements) => Promise<void>;
	proxyServer: ProxyServer;
};

type WorkerFixtures = {
	n8nUrl: string;
	dbSetup: undefined;
	chaos: ContainerTestHelpers;
	n8nContainer: N8NStack;
	containerConfig: ContainerConfig;
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
	// Container configuration from the project use options
	containerConfig: [
		async ({}, use, workerInfo) => {
			const config =
				(workerInfo.project.use as unknown as { containerConfig?: ContainerConfig })
					?.containerConfig ?? {};
			config.env = {
				...config.env,
				E2E_TESTS: 'true',
			};

			await use(config);
		},
		{ scope: 'worker' },
	],

	// Create a new n8n container if N8N_BASE_URL is not set, otherwise use the existing n8n instance
	n8nContainer: [
		async ({ containerConfig }, use) => {
			const envBaseURL = process.env.N8N_BASE_URL;

			if (envBaseURL) {
				await use(null as unknown as N8NStack);
				return;
			}

			console.log('Creating container with config:', containerConfig);
			const container = await createN8NStack(containerConfig);

			console.log(`Container URL: ${container.baseUrl}`);

			await use(container);
			await container.stop();
		},
		{ scope: 'worker' },
	],

	// Set the n8n URL for based on the N8N_BASE_URL environment variable or the n8n container
	n8nUrl: [
		async ({ n8nContainer }, use) => {
			const envBaseURL = process.env.N8N_BASE_URL ?? n8nContainer?.baseUrl;
			await use(envBaseURL);
		},
		{ scope: 'worker' },
	],

	// Reset the database for the new container
	dbSetup: [
		async ({ n8nUrl, n8nContainer }, use) => {
			if (n8nContainer) {
				console.log('Resetting database for new container');
				const apiContext = await request.newContext({ baseURL: n8nUrl });
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
			if (process.env.N8N_BASE_URL) {
				throw new TestError(
					'Chaos testing is not supported when using N8N_BASE_URL environment variable. Remove N8N_BASE_URL to use containerized testing.',
				);
			}
			const helpers = new ContainerTestHelpers(n8nContainer.containers);
			await use(helpers);
		},
		{ scope: 'worker' },
	],

	baseURL: async ({ n8nUrl, dbSetup }, use) => {
		void dbSetup; // Ensure dbSetup runs first
		await use(n8nUrl);
	},

	n8n: async ({ context }, use, testInfo) => {
		await setupDefaultInterceptors(context);
		const page = await context.newPage();
		const n8nInstance = new n8nPage(page);
		await n8nInstance.api.setupFromTags(testInfo.tags);
		// Enable project features for the tests, this is used in several tests, but is never disabled in tests, so we can have it on by default
		await n8nInstance.start.withProjectFeatures();
		await use(n8nInstance);
	},

	// This is a completely isolated API context for tests that don't need the browser
	api: async ({ baseURL }, use, testInfo) => {
		const context = await request.newContext({ baseURL });
		const api = new ApiHelpers(context);
		await api.setupFromTags(testInfo.tags);
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
