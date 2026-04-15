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
	[
		`@capability:(${CONTAINER_ONLY_CAPABILITIES.join('|')})`,
		`@mode:(${CONTAINER_ONLY_MODES.join('|')})`,
		`@${LICENSED_TAG}`,
		'@db:reset',
	].join('|'),
);

// Escape hatch: allow `@capability:*` tests to run against a pre-started local
// n8n. Fixtures that depend on container-provided services (proxy, mailpit,
// etc.) must detect the no-container case and skip or fall back to direct
// network calls. Used by `pnpm test:local:isolated` and similar workflows.
const ALLOW_CONTAINER_ONLY = process.env.PLAYWRIGHT_ALLOW_CONTAINER_ONLY === 'true';

const CONTAINER_CONFIGS: Array<{ name: string; config: N8NConfig }> = [
	{ name: 'sqlite', config: {} },
	{ name: 'postgres', config: { postgres: true } },
	{ name: 'queue', config: { workers: 1 } },
	{
		name: 'multi-main',
		config: { mains: 2, workers: 1, services: ['victoriaLogs', 'victoriaMetrics', 'vector'] },
	},
];

// --- Benchmark profiles ---
// Each profile represents a real-world n8n deployment configuration.
// ONE test file runs in ALL profiles — adding a profile auto-expands coverage.

const BENCHMARK_WORKER_COUNT = parseInt(process.env.KAFKA_LOAD_WORKERS ?? '3', 10);

// Resource profiles matching realistic AWS instance types:
// Main: m5.large (2 vCPU, 8GB RAM) — matches staging main
// Workers: t3.medium (2 vCPU, 4GB RAM) — matches staging worker limits
export const BENCHMARK_MAIN_RESOURCES = { memory: 8, cpu: 2 };
export const BENCHMARK_WORKER_RESOURCES = { memory: 4, cpu: 2 };

export const OBSERVABILITY_SERVICES = ['victoriaLogs', 'victoriaMetrics', 'vector'] as const;

const BENCHMARK_BASE_CONFIG: N8NConfig = {
	services: [...OBSERVABILITY_SERVICES],
	postgres: true,
	resourceQuota: BENCHMARK_MAIN_RESOURCES,
	workerResourceQuota: BENCHMARK_WORKER_RESOURCES,
	env: {
		N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS: 'true',
	},
};

const BENCHMARK_PROFILES: Array<{ name: string; config: N8NConfig }> = [
	{
		name: 'direct',
		config: {
			...BENCHMARK_BASE_CONFIG,
			services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
			env: {
				...BENCHMARK_BASE_CONFIG.env,
				DB_POSTGRESDB_POOL_SIZE: '20',
			},
		},
	},
	{
		name: 'queue',
		config: {
			...BENCHMARK_BASE_CONFIG,
			services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
			workers: BENCHMARK_WORKER_COUNT,
			env: {
				...BENCHMARK_BASE_CONFIG.env,
				N8N_METRICS_INCLUDE_QUEUE_METRICS: 'true',
			},
		},
	},
	{
		name: 'queue-tuned',
		config: {
			...BENCHMARK_BASE_CONFIG,
			services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
			workers: BENCHMARK_WORKER_COUNT,
			env: {
				...BENCHMARK_BASE_CONFIG.env,
				N8N_METRICS_INCLUDE_QUEUE_METRICS: 'true',
				N8N_LOG_LEVEL: 'info',
				DB_POSTGRESDB_POOL_SIZE: '30',
				DB_POSTGRESDB_CONNECTION_TIMEOUT: '60000',
				N8N_CONCURRENCY_PRODUCTION_LIMIT: '20',
				EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none',
			},
		},
	},
];

export function getProjects(): Project[] {
	const isLocal = !!getBackendUrl();
	const projects: Project[] = [];

	if (isLocal) {
		projects.push({
			name: 'e2e',
			testDir: './tests/e2e',
			grepInvert: ALLOW_CONTAINER_ONLY ? undefined : CONTAINER_ONLY,
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

		for (const { name, config } of BENCHMARK_PROFILES) {
			projects.push({
				name: `benchmark-${name}:infrastructure`,
				testDir: './tests/infrastructure/benchmarks',
				workers: 1,
				timeout: 600_000,
				retries: 0,
				use: { containerConfig: config },
			});
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
