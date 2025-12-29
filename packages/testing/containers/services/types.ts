import type { StartedTestContainer, StartedNetwork } from 'testcontainers';

/**
 * Result from starting a service container.
 */
export interface ServiceResult<TMeta = unknown> {
	container: StartedTestContainer;
	meta: TMeta;
}

/**
 * Multi-container result (e.g., observability stack)
 */
export interface MultiContainerResult<TMeta = unknown> {
	containers: StartedTestContainer[];
	meta: TMeta;
}

/**
 * Service lifecycle phase relative to n8n startup.
 */
export type ServicePhase = 'before-n8n' | 'after-n8n';

/**
 * Context available when determining if a service should start and what options it needs.
 * Built up during stack creation.
 */
export interface StartContext {
	/** Original config */
	config: StackConfig;
	/** Unique project name for container naming */
	projectName: string;
	/** Number of main instances */
	mains: number;
	/** Number of worker instances */
	workers: number;
	/** Whether queue mode is enabled (mains > 1 || workers > 0) */
	isQueueMode: boolean;
	/** Whether PostgreSQL should be used */
	usePostgres: boolean;
	/** Whether load balancer is needed (mains > 1) */
	needsLoadBalancer: boolean;
	/** Accumulated environment variables */
	environment: Record<string, string>;
	/** Results from already-started services */
	serviceResults: Record<string, ServiceResult | MultiContainerResult>;
	/** Pre-allocated ports for OIDC callback URLs */
	allocatedPorts: { main?: number; loadBalancer?: number };
	/** Base URL once known */
	baseUrl?: string;
}

/**
 * Stack configuration - imported from stack.ts to avoid circular deps.
 * This mirrors N8NConfig but is defined here for service use.
 */
export interface StackConfig {
	/** Number of main instances (default: 1). >1 enables multi-main mode. */
	mains?: number;
	/** Number of worker instances (default: 0). >0 enables queue mode. */
	workers?: number;
	postgres?: boolean;
	env?: Record<string, string>;
	projectName?: string;
	resourceQuota?: { memory?: number; cpu?: number };
	email?: boolean;
	sourceControl?: boolean;
	oidc?: boolean;
	observability?: boolean;
	tracing?: boolean;
	proxyServerEnabled?: boolean;
}

/**
 * Base service interface - defines how to start a container.
 *
 * Phase detection:
 * - Services with env() or extraEnv() automatically run before n8n
 * - Services with phase: 'after-n8n' run after n8n starts
 * - Services in the same phase can run in parallel unless they have dependencies
 */
export interface Service<TResult extends ServiceResult | MultiContainerResult = ServiceResult> {
	/** Human-readable description */
	readonly description: string;

	/**
	 * When to start relative to n8n.
	 * Default: 'before-n8n' (also auto-detected if env() or extraEnv() exists)
	 */
	readonly phase?: ServicePhase;

	/**
	 * Services that must start before this one.
	 * Example: redis depends on postgres in queue mode.
	 */
	readonly dependsOn?: readonly string[];

	/** Simple config key - service starts if config[configKey] is truthy */
	readonly configKey?: keyof StackConfig;

	/** Complex start condition (overrides configKey if both present) */
	shouldStart?(ctx: StartContext): boolean;

	/** Compute options to pass to start() */
	getOptions?(ctx: StartContext): unknown;

	/** Start the container(s) */
	start(network: StartedNetwork, projectName: string, options?: unknown): Promise<TResult>;

	/** Environment variables to pass to n8n (implies before-n8n phase) */
	env?(result: TResult): Record<string, string>;

	/** Additional env processing (e.g., proxy adding HTTP_PROXY/HTTPS_PROXY) */
	extraEnv?(result: TResult): Record<string, string>;

	/**
	 * Verify connectivity from n8n containers (runs after n8n starts).
	 * Used by services like Keycloak that need n8n to reach them via internal network.
	 */
	verifyFromN8n?(result: TResult, n8nContainers: StartedTestContainer[]): Promise<void>;
}

/**
 * Context passed to helper factories.
 * Provides access to containers and service results.
 */
export interface HelperContext {
	/** All started containers in the stack */
	containers: StartedTestContainer[];

	/** Find container by name pattern */
	findContainer(pattern: RegExp): StartedTestContainer | undefined;

	/** Service results by name (for accessing meta) */
	serviceResults: Record<string, ServiceResult>;
}

/**
 * Registry of service helpers - extended via declaration merging.
 *
 * Each service with helpers adds its type here:
 * ```typescript
 * declare module './types' {
 *   interface ServiceHelpers {
 *     gitea: GiteaHelper;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ServiceHelpers {
	// Extended by individual service files via declaration merging
}

/**
 * Factory function type for creating helpers.
 */
export type HelperFactory<T> = (ctx: HelperContext) => T;

/**
 * Registry of helper factories - must match ServiceHelpers keys.
 */
export type HelperFactories = {
	[K in keyof ServiceHelpers]: HelperFactory<ServiceHelpers[K]>;
};
