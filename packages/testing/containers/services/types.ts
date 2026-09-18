import type { StartedTestContainer, StartedNetwork } from 'testcontainers';

import type { EngineMode } from './engine';

/** Hostname that containers use to reach the host machine (Docker Desktop built-in) */
export const EXTERNAL_HOST = 'host.docker.internal';

export const SERVICE_NAMES = [
	'postgres',
	'redis',
	'mailpit',
	'gitea',
	'keycloak',
	'victoriaLogs',
	'victoriaMetrics',
	'vector',
	'tracing',
	'proxy',
	'taskRunner',
	'loadBalancer',
	'cloudflared',
	'kafka',
	'ngrok',
	'mysql',
	'localstack',
	'kent',
	'postgresExporter',
	'cadvisor',
	'sandbox',
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

export interface FileToMount {
	content: string;
	target: string;
}

export interface ServiceMeta {
	/**
	 * Files to mount into n8n containers. Use when n8n needs files that can't
	 * be passed via environment (e.g., NODE_EXTRA_CA_CERTS requires a file path).
	 * See keycloak.ts for usage example.
	 */
	n8nFilesToMount?: FileToMount[];
}

export interface ServiceResult<TMeta = unknown> {
	container: StartedTestContainer;
	meta: TMeta;
}

export interface StartContext {
	config: StackConfig;
	projectName: string;
	mains: number;
	workers: number;
	webhooks: number;
	isQueueMode: boolean;
	usePostgres: boolean;
	needsLoadBalancer: boolean;
	/** When true, services should target host.testcontainers.internal instead of Docker-internal hostnames */
	external: boolean;
	environment: Record<string, string>;
	serviceResults: Partial<Record<ServiceName, ServiceResult>>;
	allocatedPorts: { main?: number; loadBalancer?: number };
	baseUrl?: string;
	registerContainer?(container: StartedTestContainer): void;
	registerPath?(path: string): void;
}

export type LoadBalancerPolicy = 'first' | 'round_robin' | 'random' | 'least_conn' | 'ip_hash';

export interface StackConfig {
	/** Overall startup deadline and n8n readiness timeout override in milliseconds. */
	startupTimeoutMs?: number;
	mains?: number;
	workers?: number;
	/** Dedicated `n8n webhook` procs. Forces queue mode when > 0. */
	webhooks?: number;
	postgres?: boolean;
	/** Runs engine 2.0. Needs `postgres: true`, one main, no workers, no webhook procs. */
	engine?: EngineMode;
	env?: Record<string, string>;
	projectName?: string;
	resourceQuota?: { memory?: number; cpu?: number };
	workerResourceQuota?: { memory?: number; cpu?: number };
	/** Resource quota for webhook procs. Falls back to `resourceQuota` if omitted. */
	webhookResourceQuota?: { memory?: number; cpu?: number };
	services?: readonly ServiceName[];
	/** When true, services target host machine instead of Docker-internal n8n */
	external?: boolean;
	/** When set, the Docker network uses this exact name instead of a random UUID. */
	networkName?: string;
	/**
	 * Caddy load-balancer upstream-selection policy. Only applies when `mains > 1`
	 * or `webhooks > 0` (anything that triggers the LB to start).
	 * Defaults to `'first'` — sticky to main #1, useful for UI debuggability.
	 * Benchmarks should set `'round_robin'` to actually distribute load.
	 */
	lbPolicy?: LoadBalancerPolicy;
	/**
	 * When set, each n8n container collects Node V8 coverage: `NODE_V8_COVERAGE`
	 * is written to a per-container subdir of this host path (bind-mounted), reuse
	 * is disabled, and the stack stops gracefully so the process flushes on exit.
	 * Opt-in capability for the coverage pipeline; off by default.
	 */
	coverageHostDir?: string;
	/**
	 * Override the n8n image for this stack (default: the process-wide
	 * TEST_IMAGE_N8N resolution). `stack.replaceN8N()` can then swap to a
	 * different image on the same data — the upgrade/downgrade cycles.
	 */
	image?: string;
	/**
	 * Host dir bind-mounted as the n8n container's home (`/home/node`), so the
	 * user folder (settings file, sqlite database) outlives the container and
	 * `replaceN8N()` can boot another image on the same data. Single-main
	 * stacks only. Pair with `user` so the files stay owned by the host user.
	 */
	userHomeHostDir?: string;
	/** Run the n8n containers as this uid:gid (e.g. the host user for bind mounts). */
	user?: string;
}

export interface Service<TResult extends ServiceResult = ServiceResult> {
	/** @example 'Redis' */
	readonly description: string;
	/** @example ['victoriaLogs'] // vector depends on victoriaLogs */
	readonly dependsOn?: readonly ServiceName[];
	/** @example (ctx) => ctx.isQueueMode // redis auto-starts in queue mode */
	shouldStart?(ctx: StartContext): boolean;
	/** @example (ctx) => ({ taskBrokerUri: `http://${ctx.projectName}-n8n:5679` }) */
	getOptions?(ctx: StartContext): unknown;
	/**
	 * Env for an already-deployed instance of this service, read from the host
	 * environment. Returning a value means the deployment stands in for the
	 * local containers: `start()` is skipped and this env is handed to n8n
	 * instead. Return `undefined` to fall back to the local stack.
	 *
	 * Implementations may probe the deployment before claiming it. They must
	 * resolve, never reject: an unreachable deployment is `undefined` (use the
	 * local stack), not an error that takes the whole stack down with it.
	 *
	 * @example async () => (await reachable()) ? { FOO_URL: process.env.FOO_URL } : undefined
	 */
	hostedEnv?(ctx?: StartContext): Promise<Record<string, string> | undefined>;
	/** Starts container, returns connection details for env() */
	start(
		network: StartedNetwork,
		projectName: string,
		options?: unknown,
		ctx?: StartContext,
	): Promise<TResult>;
	/** @param external When true, returns host-compatible values using mapped ports (for local dev) */
	env?(result: TResult, external?: boolean): Record<string, string>;
	/** @param external When true, returns host-compatible values using mapped ports (for local dev) */
	extraEnv?(result: TResult, external?: boolean): Record<string, string>;
	/** Verifies service is reachable from inside n8n containers */
	verifyFromN8n?(result: TResult, n8nContainers: StartedTestContainer[]): Promise<void>;
}

export interface HelperContext {
	containers: StartedTestContainer[];
	findContainer(pattern: RegExp): StartedTestContainer | undefined;
	serviceResults: Partial<Record<ServiceName, ServiceResult>>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ServiceHelpers {}

export type HelperFactory<T> = (ctx: HelperContext) => T;

export type HelperFactories = {
	[K in keyof ServiceHelpers]: HelperFactory<ServiceHelpers[K]>;
};
