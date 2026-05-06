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
// Total host budget at 1m+3w: 5 vCPU + 10 GB for n8n, plus ~3 GB for
// postgres/kafka/redis/observability.
export const BENCHMARK_MAIN_RESOURCES = { memory: 4, cpu: 2 };
export const BENCHMARK_WORKER_RESOURCES = { memory: 2, cpu: 1 };

export const OBSERVABILITY_SERVICES = ['victoriaLogs', 'victoriaMetrics', 'vector'] as const;

/**
 * Single benchmark stack config. Specs call `benchConfig()` to get a copy with
 * spec-specific overrides (mains, workers, kafka). All n8n env tuning lives
 * here once — the queue-mode-only vars (`QUEUE_*`, `DB_PING_INTERVAL_SECONDS`)
 * are inert in direct mode, so a single env profile works for both.
 */
const BENCHMARK_CONFIG: N8NConfig = {
	// Postgres exporter scrapes DB internals into VictoriaMetrics; cAdvisor exposes per-container
	// CPU/memory/IO so benchmarks can detect when PG/n8n hit OS-level limits the per-query
	// reporter alone would miss. Only meaningful for benchmarks.
	services: [...OBSERVABILITY_SERVICES, 'postgresExporter', 'cadvisor'],
	postgres: true,
	resourceQuota: BENCHMARK_MAIN_RESOURCES,
	workerResourceQuota: BENCHMARK_WORKER_RESOURCES,
	// Distribute load across all mains. UI tests stick to the default `first`
	// policy so debugging hits a single predictable backend.
	lbPolicy: 'round_robin',
	env: {
		N8N_LOG_LEVEL: 'error',
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS: 'true',
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
	},
};

export interface BenchOptions {
	/** Adds the `kafka` service. Default: false. */
	kafka?: boolean;
	/** Number of main pods. Default: 1. Multi-main HA env enabled when > 1. */
	mains?: number;
	/** Number of worker pods. Default: 0 (direct mode). */
	workers?: number;
	/**
	 * Adds the `tracing` service (Jaeger + n8n-tracer) and turns on OTEL emission.
	 * Adds ~5-10% per-request overhead — opt in only when measuring OTEL cost or
	 * collecting flamegraph data, not for clean ceiling numbers.
	 */
	tracing?: boolean;
	/** Additional env vars to merge over the base. */
	env?: Record<string, string>;
}

/**
 * Build a benchmark stack config. Each spec calls this with a unique
 * `isolation` slug (which becomes `TEST_ISOLATION` so each spec gets its own
 * container). Pass topology overrides via `opts`.
 *
 * @example
 *   // Direct-mode kafka (no workers)
 *   test.use({ capability: benchConfig('single-instance-ceiling', { kafka: true }) });
 *
 *   // Queue-mode kafka (1 main + 3 workers)
 *   test.use({ capability: benchConfig('node-count-scaling', { kafka: true, workers: 3 }) });
 *
 *   // Multi-main webhook
 *   test.use({ capability: benchConfig('webhook-main-scaling', { mains: 2, workers: 2 }) });
 */
export function benchConfig(isolation: string, opts: BenchOptions = {}): N8NConfig {
	const services = [...(BENCHMARK_CONFIG.services ?? [])];
	if (opts.kafka) services.push('kafka');
	if (opts.tracing) services.push('tracing');

	const env: Record<string, string> = {
		...BENCHMARK_CONFIG.env,
		...(opts.tracing && {
			N8N_OTEL_ENABLED: 'true',
			N8N_OTEL_EXPORTER_OTLP_ENDPOINT: 'http://jaeger:4318',
			N8N_OTEL_EXPORTER_SERVICE_NAME: `n8n-bench-${isolation}`,
			N8N_OTEL_TRACES_INCLUDE_NODE_SPANS: 'true',
		}),
		...opts.env,
		TEST_ISOLATION: `bench-${isolation}`,
	};
	if ((opts.mains ?? 1) > 1) env.N8N_MULTI_MAIN_SETUP_ENABLED = 'true';

	return {
		...BENCHMARK_CONFIG,
		services,
		...(opts.mains !== undefined && { mains: opts.mains }),
		...(opts.workers !== undefined && { workers: opts.workers }),
		env,
	};
}

type BenchmarkProfile = { name: string; config: N8NConfig };

// Project-level fallback config for benchmark specs that don't call
// `benchConfig()` themselves. In practice all current specs do, so this just
// has to be a valid stack — content doesn't matter.
const BENCHMARKING_DEFAULT_CONFIG: N8NConfig = benchConfig('default', { kafka: true });

// Benchmark profiles that host local-only tests (model API keys, long runtimes,
// reserved metric names). They scan `tests/infrastructure/benchmarks-local/` and
// are intentionally left out of the CI matrix.
const LOCAL_ONLY_BENCHMARK_PROFILES: BenchmarkProfile[] = [
	{
		name: 'memory-instanceai',
		config: {
			...BENCHMARK_CONFIG,
			services: [...OBSERVABILITY_SERVICES],
			env: {
				...BENCHMARK_CONFIG.env,
				// Instance-AI module & model config
				N8N_ENABLED_MODULES: 'instance-ai',
				N8N_INSTANCE_AI_MODEL: process.env.N8N_INSTANCE_AI_MODEL ?? 'openai/gpt-4o-mini',
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
		projects.push({
			name: 'dev-server-smoke',
			testDir: './tests/dev-server-smoke',
			fullyParallel: false,
			// Vite dev cold-start can take 15-25s on the first navigation while it
			// pre-bundles deps. Subsequent navigations are sub-second.
			timeout: 90_000,
			use: { baseURL: getFrontendUrl(), navigationTimeout: 30_000 },
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
			name: 'coverage',
			testDir: './tests/e2e',
			timeout: 60000,
			fullyParallel: true,
			use: { containerConfig: {} },
		});

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
