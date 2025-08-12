/**
 * Cloud Resource Testing Fixtures
 *
 * This fixture provides cloud containers with worker containers.
 * Use this when you want to test with cloud resource constraints.
 *
 * Architecture:
 * - No worker containers - cloud containers only
 * - Test-scoped containers with resource limits
 * - Complete fixture chain (n8n, api, context, page)
 * - Per-test database reset
 */

import { test as base, expect, type Browser } from '@playwright/test';
import type { N8NConfig, N8NStack } from 'n8n-containers/n8n-test-container-creation';
import { createN8NStack } from 'n8n-containers/n8n-test-container-creation';
import { BASE_PERFORMANCE_PLANS, type PerformancePlanName } from 'n8n-containers/performance-plans';
import { setTimeout as wait } from 'node:timers/promises';

import { setupDefaultInterceptors } from '../config/intercepts';
import { n8nPage } from '../pages/n8nPage';
import { ApiHelpers } from '../services/api-helper';

interface ExtendedPerformancePlan {
	memory: number;
	cpu: number;
	description: string;
	initDelay: number;
	dbResetDelay: number;
	maxRetries: number;
}

// Extend base performance plans with timing configurations
// TODO: Replace the delay/dbreset with a more accurate way to wait for the container to be ready
const CLOUD_RESOURCE_PROFILES: Record<PerformancePlanName, ExtendedPerformancePlan> = {
	trial: {
		...BASE_PERFORMANCE_PLANS.trial,
		description: 'Trial (768MB, 1000 millicore)',
		initDelay: 5000,
		dbResetDelay: 10000,
		maxRetries: 3,
	},
	starter: {
		...BASE_PERFORMANCE_PLANS.starter,
		description: 'Starter (768MB, 1000 millicore)',
		initDelay: 5000,
		dbResetDelay: 10000,
		maxRetries: 3,
	},
	pro1: {
		...BASE_PERFORMANCE_PLANS.pro1,
		description: 'Pro-1 (1.25GB, 1000 millicore)',
		initDelay: 4000,
		dbResetDelay: 10000,
		maxRetries: 3,
	},
	pro2: {
		...BASE_PERFORMANCE_PLANS.pro2,
		description: 'Pro-2 (2.5GB, 1500 millicore)',
		initDelay: 3000,
		dbResetDelay: 5000,
		maxRetries: 3,
	},
	enterprise: {
		...BASE_PERFORMANCE_PLANS.enterprise,
		description: 'Enterprise (8GB, 2 cores)',
		initDelay: 3000,
		dbResetDelay: 5000,
		maxRetries: 3,
	},
};

type CloudResourceProfile = PerformancePlanName;

/**
 * Reset database with exponential backoff retry logic
 */
async function resetDatabaseWithRetry(
	browser: Browser,
	baseUrl: string,
	maxRetries: number = 3,
	baseDelay: number = 15000,
	containerType: string = 'cloud container',
) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`🔄 Database reset attempt ${attempt}/${maxRetries} for ${containerType}`);
			const context = await browser.newContext({ baseURL: baseUrl });
			const api = new ApiHelpers(context.request);

			// Wait before attempting reset
			await wait(baseDelay);

			await api.resetDatabase();
			await context.close();
			console.log(`✅ ${containerType} database reset complete`);
			return;
		} catch (error) {
			console.warn(`⚠️  Database reset attempt ${attempt} failed for ${containerType}:`, error);

			if (attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
				console.log(`⏳ Waiting ${delay}ms before retry...`);
				await wait(delay);
			} else {
				throw new Error(
					`Database reset failed after ${maxRetries} attempts for ${containerType}: ${String(error)}`,
				);
			}
		}
	}
}

/**
 * Wait for container to stabilize with configurable delay
 */
async function waitForContainerStabilization(delay: number, containerType: string) {
	console.log(`⏳ Waiting for ${containerType} to fully initialize...`);
	await wait(delay);
}

/**
 * Create standardized project name for containers
 */
function createProjectName(prefix: string, profile: string, testTitle: string): string {
	return `${prefix}-${profile}-${testTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
}

type CloudOnlyFixtures = {
	cloudContainer: N8NStack;
	n8n: n8nPage;
	api: ApiHelpers;
	baseURL: string;
};

/**
 * Extract cloud resource profile from test tags
 * Looks for @cloud:trial, @cloud:enterprise, etc.
 */
function getCloudResourceProfile(tags: string[]): CloudResourceProfile | null {
	const cloudTag = tags.find((tag) => tag.startsWith('@cloud:'));
	if (!cloudTag) return null;

	const profile = cloudTag.replace('@cloud:', '');
	if (profile in CLOUD_RESOURCE_PROFILES) {
		return profile;
	}
	return null;
}

/**
 * Cloud-only test fixtures - no worker containers, only cloud containers
 */
export const test = base.extend<CloudOnlyFixtures>({
	// Cloud container with resource limits - always created for every test
	cloudContainer: async ({ browser }, use, testInfo) => {
		const cloudProfile = getCloudResourceProfile(testInfo.tags);

		if (!cloudProfile) {
			throw new Error(
				`Cloud-only fixture requires @cloud:* tags. Found tags: ${testInfo.tags.join(', ')}`,
			);
		}

		if (process.env.N8N_BASE_URL) {
			throw new Error('Cloud-only fixture cannot be used with N8N_BASE_URL environment variable');
		}

		const resourceConfig = CLOUD_RESOURCE_PROFILES[cloudProfile];
		console.log(`Creating cloud container: ${resourceConfig.description}`);

		const config: N8NConfig = {
			resourceQuota: {
				memory: resourceConfig.memory,
				cpu: resourceConfig.cpu,
			},
			env: {
				E2E_TESTS: 'true',
			},
			projectName: createProjectName('n8n-stack-cloud', cloudProfile, testInfo.title),
		};

		const stack = await createN8NStack(config);

		// Wait for container to stabilize using profile configuration
		// TODO: Replace the delay/dbreset with a more accurate way to wait for the container to be ready
		await waitForContainerStabilization(resourceConfig.initDelay, 'cloud container');

		// Reset database with exponential backoff using profile configuration
		console.log('🔄 Resetting database for cloud container');
		await resetDatabaseWithRetry(
			browser,
			stack.baseUrl,
			resourceConfig.maxRetries,
			resourceConfig.dbResetDelay,
			'cloud container',
		);

		console.log(`✅ Cloud container ready: ${stack.baseUrl}`);

		await use(stack);

		// Cleanup
		console.log('🧹 Cleaning up cloud container');
		await stack.stop();
	},

	// Base URL from cloud container
	baseURL: async ({ cloudContainer }, use) => {
		await use(cloudContainer.baseUrl);
	},

	// Browser context with cloud container URL and interceptors
	context: async ({ context, baseURL }, use) => {
		await setupDefaultInterceptors(context);
		await use(context);
	},

	// Page with authentication setup
	page: async ({ context }, use, testInfo) => {
		const page = await context.newPage();
		const api = new ApiHelpers(context.request);

		// Set up authentication from tags (works for cloud containers)
		await api.setupFromTags(testInfo.tags);

		await use(page);
		await page.close();
	},

	// n8n page object
	n8n: async ({ page }, use) => {
		const n8nInstance = new n8nPage(page);
		await use(n8nInstance);
	},

	// API helpers
	api: async ({ context }, use) => {
		const api = new ApiHelpers(context.request);
		await use(api);
	},
});

export { expect };

/*
CLOUD-ONLY FIXTURE BENEFITS:

✅ No worker containers: Only cloud containers are created
✅ Guaranteed cloud testing: Tests must have @cloud:* tags or they fail
✅ Complete fixture chain: Full n8n/api/context/page fixtures available
✅ Fresh containers: Each test gets its own cloud container with resource limits
✅ Clean database state: Per-test database reset with enhanced timing
✅ Resource isolation: True cloud plan simulation without interference

Usage:

// Import the cloud-only fixture instead of base
import { test, expect } from '../../fixtures/cloud-only';

test('Performance test @cloud:trial', async ({ n8n, api }) => {
  // This test runs ONLY on a trial plan container (384MB, 250 millicore)
  // No worker containers are created
});

Flow:
1. Detect @cloud:* tag (required)
2. Create cloud container with resource limits
3. Wait 5s + database reset with retries
4. Provide complete n8n/api fixture chain
5. Run test against cloud container only
6. Clean up cloud container

Perfect for: Performance testing, resource constraint testing, cloud plan validation
*/
