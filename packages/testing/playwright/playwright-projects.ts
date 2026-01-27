import type { Project } from '@playwright/test';
import type { N8NConfig } from 'n8n-containers/stack';

import {
	CONTAINER_ONLY_CAPABILITIES,
	CONTAINER_ONLY_MODES,
	LICENSED_TAG,
} from './fixtures/capabilities';
import { getBackendUrl, getFrontendUrl } from './utils/url-helper';

// Tests that require container environment (won't run against local n8n).
// Matches:
// - @capability:X - add-on features (email, proxy, source-control, etc.)
// - @mode:X - infrastructure modes (postgres, queue, multi-main)
// - @licensed - enterprise license features (log streaming, SSO, etc.)
// - @db:reset - tests needing per-test database reset (requires isolated containers)
const CONTAINER_ONLY = new RegExp(
	`@capability:(${CONTAINER_ONLY_CAPABILITIES.join('|')})|@mode:(${CONTAINER_ONLY_MODES.join('|')})|@${LICENSED_TAG}|@db:reset`,
);

const CONTAINER_CONFIGS: Array<{ name: string; config: N8NConfig }> = [
	{ name: 'sqlite', config: {} },
	{ name: 'postgres', config: { postgres: true } },
	{ name: 'queue', config: { workers: 1 } },
	{
		name: 'multi-main',
		config: { mains: 2, workers: 1, services: ['victoriaLogs', 'victoriaMetrics', 'vector'] },
	},
];

export function getProjects(): Project[] {
	const isLocal = !!getBackendUrl();
	const projects: Project[] = [];

	if (isLocal) {
		projects.push({
			name: 'e2e',
			testDir: './tests/e2e',
			grepInvert: CONTAINER_ONLY,
			fullyParallel: true,
			use: { baseURL: getFrontendUrl() },
		});
	} else {
		for (const { name, config } of CONTAINER_CONFIGS) {
			projects.push(
				{
					name: `${name}:e2e`,
					testDir: './tests/e2e',
					timeout: name === 'sqlite' ? 60000 : 180000, // 60 seconds for sqlite container test, 180 for other modes to allow startup
					fullyParallel: true,
					use: { containerConfig: config },
				},
				{
					name: `${name}:infrastructure`,
					testDir: './tests/infrastructure',
					grep: new RegExp(`@mode:${name}|@capability:${name}`),
					workers: 1,
					timeout: 180000,
					use: { containerConfig: config },
				},
			);
		}
	}

	projects.push({
		name: 'cli-workflows',
		testDir: './tests/cli-workflows',
		fullyParallel: true,
		timeout: 60000,
	});

	projects.push({
		name: 'performance',
		testDir: './tests/performance',
		workers: 1,
		timeout: 300000,
		retries: 0,
		use: {
			// Default container config for performance tests, equivalent to @cloud:starter
			containerConfig: { resourceQuota: { memory: 0.75, cpu: 0.5 }, env: { E2E_TESTS: 'true' } },
		},
	});

	return projects;
}
