import type { StartedTestContainer, StartedNetwork } from 'testcontainers';

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
	isQueueMode: boolean;
	usePostgres: boolean;
	needsLoadBalancer: boolean;
	environment: Record<string, string>;
	serviceResults: Partial<Record<ServiceName, ServiceResult>>;
	allocatedPorts: { main?: number; loadBalancer?: number };
	baseUrl?: string;
}

export interface StackConfig {
	mains?: number;
	workers?: number;
	postgres?: boolean;
	env?: Record<string, string>;
	projectName?: string;
	resourceQuota?: { memory?: number; cpu?: number };
	services?: readonly ServiceName[];
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
	/** Starts container, returns connection details for env() */
	start(
		network: StartedNetwork,
		projectName: string,
		options?: unknown,
		ctx?: StartContext,
	): Promise<TResult>;
	/** @example () => ({ QUEUE_BULL_REDIS_HOST: 'redis' }) */
	env?(result: TResult): Record<string, string>;
	/** @example () => ({ N8N_EXTERNAL_STORAGE_ENABLED: 'true' }) */
	extraEnv?(result: TResult): Record<string, string>;
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
