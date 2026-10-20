import type { Fixtures } from '@playwright/test';
import { request } from '@playwright/test';
import { createN8NStack } from 'n8n-containers/stack';
import type { N8NConfig, N8NStack } from 'n8n-containers/stack';

import { CAPABILITIES, type CapabilityOption } from './capabilities';
import { ApiHelpers } from '../services/api-helper';
import { getBackendUrl } from '../utils/url-helper';

export type ContainerWorkerFixtures = {
	containerConfig: N8NConfig;
	capability?: CapabilityOption;
	n8nStackConfig: N8NConfig;
	n8nContainer: N8NStack;
	dbSetup: undefined;
};

function parseGlobalTestEnv(): Record<string, string> {
	const raw = process.env.N8N_TEST_ENV;
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, string>;
	} catch {
		console.warn('[containers.ts] Failed to parse N8N_TEST_ENV');
		return {};
	}
}

export const containerFixtures: Fixtures<object, ContainerWorkerFixtures> = {
	containerConfig: [{}, { scope: 'worker', option: true }],
	capability: [undefined, { scope: 'worker', option: true }],
	// Keep the same config precedence for product and efficiency suites.
	n8nStackConfig: [
		async ({ capability, containerConfig: base }, use) => {
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
				// Pass the coverage runner's output directory to the stack.
				...(process.env.N8N_COVERAGE_DIR ? { coverageHostDir: process.env.N8N_COVERAGE_DIR } : {}),
			};

			await use(config);
		},
		{ scope: 'worker', box: true },
	],
	n8nContainer: [
		async ({ n8nStackConfig }, use) => {
			if (getBackendUrl()) {
				await use(null!);
				return;
			}

			const container = await createN8NStack(n8nStackConfig);
			try {
				await use(container);
			} finally {
				if (process.env.N8N_CONTAINERS_KEEPALIVE === 'true') {
					console.log('\n=== KEEPALIVE: Containers left running for debugging ===');
					console.log(`    URL: ${container.baseUrl}`);
					console.log(`    Project: ${container.projectName}`);
					console.log('    Cleanup: pnpm --filter n8n-containers stack:clean:all');
					console.log('=========================================================\n');
				} else {
					await container.stop();
				}
			}
		},
		{ scope: 'worker', box: true },
	],
	dbSetup: [
		async ({ n8nContainer, n8nStackConfig }, use) => {
			if (n8nContainer) {
				console.log('Resetting database for new container');
				const apiContext = await request.newContext({ baseURL: n8nContainer.baseUrl });
				const api = new ApiHelpers(apiContext);
				await api.resetDatabase();
				await apiContext.dispose();

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
};
