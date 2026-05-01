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

// Standard benchmark resource profile.
// Main:    2 vCPU, 4 GB RAM
// Worker:  1 vCPU, 2 GB RAM
// Standard topology: 1 main + 3 workers (queue mode) for everything except
// the single-instance-ceiling spec, which runs direct mode.
// Total host budget at 1m+3w: 5 vCPU + 10 GB for n8n, plus ~3 GB for postgres/kafka/redis/observability.
export const BENCHMARK_MAIN_RESOURCES = { memory: 4, cpu: 2 };
export const BENCHMARK_WORKER_RESOURCES = { memory: 2, cpu: 1 };

/** Default worker count for queue-mode benchmark specs. */
export const STANDARD_WORKER_COUNT = 3;

export const OBSERVABILITY_SERVICES = ['victoriaLogs', 'victoriaMetrics', 'vector'] as const;

export const BENCHMARK_BASE_CONFIG: N8NConfig = {
	// Postgres exporter scrapes DB internals into VictoriaMetrics — only meaningful for benchmarks.
	services: [...OBSERVABILITY_SERVICES, 'postgresExporter'],
	postgres: true,
	resourceQuota: BENCHMARK_MAIN_RESOURCES,
	workerResourceQuota: BENCHMARK_WORKER_RESOURCES,
	// Distribute load across all mains. UI tests stick to the default `first`
	// policy so debugging hits a single predictable backend.
	lbPolicy: 'round_robin',
	env: {
		N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS: 'true',
	},
};

/**
 * Standard env for queue-mode benchmark specs.
 *
 * Aligned with internal n8n production config for connection timeouts, lock
 * durations, and Bull/Redis tuning. NODE_OPTIONS heap size fits within the
 * smaller worker container (2 GB) since env applies to both main and worker.
 */
export const STANDARD_QUEUE_ENV = {
	N8N_LOG_LEVEL: 'error',
	N8N_METRICS_INCLUDE_QUEUE_METRICS: 'true',
	DB_POSTGRESDB_POOL_SIZE: '10',
	DB_POSTGRESDB_CONNECTION_TIMEOUT: '300000',
	DB_PING_INTERVAL_SECONDS: '5',
	N8N_CONCURRENCY_PRODUCTION_LIMIT: '20',
	QUEUE_BULL_REDIS_KEEP_ALIVE: 'true',
	QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD: '60000',
	QUEUE_WORKER_LOCK_DURATION: '300000',
	QUEUE_WORKER_LOCK_RENEW_TIME: '20000',
	QUEUE_WORKER_STALLED_INTERVAL: '60000',
	QUEUE_RECOVERY_INTERVAL: '0',
	EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none',
	UV_THREADPOOL_SIZE: '32',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	NODE_OPTIONS: '--max-old-space-size=1536',
} as const;

/** Standard env for direct-mode (single-instance) benchmark specs. */
export const STANDARD_DIRECT_ENV = {
	N8N_LOG_LEVEL: 'error',
	DB_POSTGRESDB_POOL_SIZE: '10',
	DB_POSTGRESDB_CONNECTION_TIMEOUT: '300000',
	N8N_CONCURRENCY_PRODUCTION_LIMIT: '20',
	EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none',
	UV_THREADPOOL_SIZE: '32',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	NODE_OPTIONS: '--max-old-space-size=3072',
} as const;

type BenchmarkProfile = { name: string; config: N8NConfig };

// Single benchmarking project. Each spec declares its own `containerConfig`
// via `test.use({ containerConfig: ... })`. The project's default below is
// used for specs that do not override and matches the previous `direct-tuned`
// profile so existing specs continue to run unchanged during migration.
const BENCHMARKING_DEFAULT_CONFIG: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		N8N_LOG_LEVEL: 'error',
		DB_POSTGRESDB_POOL_SIZE: '30',
		DB_POSTGRESDB_CONNECTION_TIMEOUT: '60000',
		N8N_CONCURRENCY_PRODUCTION_LIMIT: '20',
		EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none',
		UV_THREADPOOL_SIZE: '32',
		N8N_DIAGNOSTICS_ENABLED: 'false',
	},
};

// Benchmark profiles that host local-only tests (model API keys, long runtimes,
// reserved metric names). They scan `tests/infrastructure/benchmarks-local/` and
// are intentionally left out of the CI matrix.
const LOCAL_ONLY_BENCHMARK_PROFILES: BenchmarkProfile[] = [
	{
		name: 'memory-instanceai',
		config: {
			...BENCHMARK_BASE_CONFIG,
			services: [...OBSERVABILITY_SERVICES],
			env: {
				...BENCHMARK_BASE_CONFIG.env,
				// Instance-AI module & model config
				N8N_ENABLED_MODULES: 'instance-ai',
				N8N_INSTANCE_AI_MODEL: process.env.N8N_INSTANCE_AI_MODEL ?? 'openai/gpt-5.4-nano',
				// Forward API keys to the container
				...(process.env.N8N_AI_OPENAI_API_KEY && {
					N8N_AI_OPENAI_API_KEY: process.env.N8N_AI_OPENAI_API_KEY,
					OPENAI_API_KEY: process.env.N8N_AI_OPENAI_API_KEY,
				}),
				...(process.env.LANGSMITH_API_KEY && {
					LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY,
				}),
				...(process.env.ANTHROPIC_API_KEY && {
					ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
				}),
				...(process.env.OPENROUTER_API_KEY && {
					OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
				}),
				...(process.env.CEREBRAS_API_KEY && {
					CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
				}),
				// Sandbox config — forwarded from host env if present
				...(process.env.N8N_INSTANCE_AI_SANDBOX_ENABLED && {
					N8N_INSTANCE_AI_SANDBOX_ENABLED: process.env.N8N_INSTANCE_AI_SANDBOX_ENABLED,
					N8N_INSTANCE_AI_SANDBOX_PROVIDER:
						process.env.N8N_INSTANCE_AI_SANDBOX_PROVIDER ?? 'daytona',
					N8N_INSTANCE_AI_SANDBOX_IMAGE: process.env.N8N_INSTANCE_AI_SANDBOX_IMAGE ?? '',
				}),
				...(process.env.DAYTONA_API_URL && {
					DAYTONA_API_URL: process.env.DAYTONA_API_URL,
				}),
				...(process.env.DAYTONA_API_KEY && {
					DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
				}),
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

		projects.push({
			name: 'benchmarking:infrastructure',
			testDir: './tests/infrastructure/benchmarks',
			workers: 1,
			timeout: 600_000,
			retries: 0,
			use: { containerConfig: BENCHMARKING_DEFAULT_CONFIG },
		});

		for (const { name, config } of LOCAL_ONLY_BENCHMARK_PROFILES) {
			projects.push({
				name: `benchmark-${name}:infrastructure`,
				testDir: './tests/infrastructure/benchmarks-local',
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
