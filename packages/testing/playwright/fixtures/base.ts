import { test as base, expect } from '@playwright/test';
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
export const test = base.extend<TestFixtures, WorkerFixtures>({
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
		async ({ n8nUrl, n8nContainer, browser }, use) => {
			if (n8nContainer) {
				console.log('Resetting database for new container');
				const context = await browser.newContext({ baseURL: n8nUrl });
				const api = new ApiHelpers(context.request);
				await api.resetDatabase();
				await context.close();
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

	baseURL: async ({ n8nUrl }, use) => {
		await use(n8nUrl);
	},

	// Browser, baseURL, and dbSetup are required here to ensure they run first.
	// This is how Playwright does dependency graphs
	context: async ({ context, browser, baseURL, dbSetup }, use) => {
		// Dependencies: browser, baseURL, dbSetup (ensure they run first)
		void browser;
		void baseURL;
		void dbSetup;

		await setupDefaultInterceptors(context);
		await use(context);
	},

	page: async ({ context }, use, testInfo) => {
		const page = await context.newPage();
		const api = new ApiHelpers(context.request);

		await api.setupFromTags(testInfo.tags);

		await use(page);
		await page.close();
	},

	n8n: async ({ page, api }, use) => {
		const n8nInstance = new n8nPage(page, api);
		await use(n8nInstance);
	},

	api: async ({ context }, use, testInfo) => {
		const api = new ApiHelpers(context.request);
		await api.setupFromTags(testInfo.tags);
		await use(api);
	},

	setupRequirements: async ({ page, context }, use) => {
		const setupFunction = async (requirements: TestRequirements): Promise<void> => {
			await setupTestRequirements(page, context, requirements);
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
Test Scope: n8nUrl → baseURL → context → page → [n8n, api]
*/
