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

import { test as base, expect } from '@playwright/test';
import type { N8NConfig, N8NStack } from 'n8n-containers/n8n-test-container-creation';
import { createN8NStack } from 'n8n-containers/n8n-test-container-creation';
import { type PerformancePlanName, BASE_PERFORMANCE_PLANS } from 'n8n-containers/performance-plans';

import { setupDefaultInterceptors } from '../config/intercepts';
import { n8nPage } from '../pages/n8nPage';
import { ApiHelpers } from '../services/api-helper';

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
function getCloudResourceProfile(tags: string[]): PerformancePlanName | null {
	const cloudTag = tags.find((tag) => tag.startsWith('@cloud:'));
	if (!cloudTag) return null;

	const profile = cloudTag.replace('@cloud:', '');
	if (profile in BASE_PERFORMANCE_PLANS) {
		return profile;
	}
	return null;
}

/**
 * Cloud-only test fixtures - no worker containers, only cloud containers
 */
export const test = base.extend<CloudOnlyFixtures>({
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

		const resourceConfig = BASE_PERFORMANCE_PLANS[cloudProfile];
		console.log(`Creating cloud container: ${cloudProfile}`);

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

		console.log('🔄 Resetting database for cloud container');

		const context = await browser.newContext({ baseURL: stack.baseUrl });
		const api = new ApiHelpers(context.request);

		await api.resetDatabase();
		await context.close();

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
	context: async ({ context }, use) => {
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
	n8n: async ({ page, api }, use) => {
		const n8nInstance = new n8nPage(page, api);
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
  // This test runs ONLY on a trial plan container (768MB, 200 millicore)
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
