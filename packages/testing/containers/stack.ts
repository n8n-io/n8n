/**
 * n8n Test Container Stack
 *
 * Orchestrates creation of complete n8n container stacks for testing with support for:
 * - Single instances (SQLite or PostgreSQL)
 * - Queue mode with Redis (mains > 1 or workers > 0)
 * - Multi-main instances with load balancing
 * - Task runner containers for external code execution
 * - Optional services (email, source control, OIDC, observability, tracing)
 */

import getPort from 'get-port';
import type { StartedNetwork, StartedTestContainer, StoppedTestContainer } from 'testcontainers';
import { Network } from 'testcontainers';

import { createElapsedLogger, pollContainerHttpEndpoint } from './helpers/utils';
import { waitForNetworkQuiet } from './network-stabilization';
import type { LoadBalancerResult } from './services/load-balancer';
import { createN8NInstances } from './services/n8n';
import { helperFactories, services } from './services/registry';
import type {
	ContentInjection,
	HelperContext,
	HelperFactories,
	MultiContainerResult,
	Service,
	ServiceHelpers,
	ServiceResult,
	StackConfig,
	StartContext,
} from './services/types';

/**
 * Type guard to check if a service result has multiple containers.
 */
function isMultiContainerResult(
	result: ServiceResult | MultiContainerResult,
): result is MultiContainerResult {
	return 'containers' in result && Array.isArray(result.containers);
}

/**
 * Extract containers from a service result (handles both single and multi-container results).
 */
function extractContainers(result: ServiceResult | MultiContainerResult): StartedTestContainer[] {
	if (isMultiContainerResult(result)) {
		return result.containers;
	}
	return [result.container];
}

// ============================================================================
// Service Registry
// ============================================================================

/**
 * Services available for automatic phase-based startup.
 * All services are handled uniformly based on their phase and shouldStart conditions.
 */
const SERVICE_REGISTRY: Record<string, Service> = services;

// ============================================================================
// Configuration
// ============================================================================

// N8NConfig is just an alias for StackConfig - all properties defined there
export type N8NConfig = StackConfig;

/**
 * Unified n8n test stack interface.
 *
 * This is the single entry point for all container testing functionality:
 * - `baseUrl`: URL to access n8n
 * - `containers`: Raw container access
 * - `serviceResults`: Raw service results (for advanced use)
 * - `services`: Type-safe helpers for interacting with services
 *
 * @example
 * ```typescript
 * test('example', async ({ n8nContainer }) => {
 *   // Access helpers via services (type-safe, discoverable)
 *   await n8nContainer.services.mailpit.waitForMessage({ to: 'user@example.com' });
 *   await n8nContainer.services.observability.logs.query('level:error');
 *
 *   // Convenience shortcuts
 *   await n8nContainer.logs.query('level:error');
 *   await n8nContainer.metrics.query('up');
 *
 *   // Base URL
 *   n8nContainer.baseUrl;
 * });
 * ```
 */
export interface N8NStack {
	/** URL to access n8n */
	baseUrl: string;
	/** Stop all containers and cleanup */
	stop: () => Promise<void>;
	/** Raw container access for advanced operations */
	containers: StartedTestContainer[];
	/** Raw service results (for advanced use, prefer `services` for helpers) */
	serviceResults: Record<string, ServiceResult>;
	/** Type-safe service helpers for common operations */
	services: ServiceHelpers;
	/** Shortcut for services.observability.logs */
	logs: ServiceHelpers['observability']['logs'];
	/** Shortcut for services.observability.metrics */
	metrics: ServiceHelpers['observability']['metrics'];
	/** Find containers by name pattern (for chaos testing) */
	findContainers: (namePattern: string | RegExp) => StartedTestContainer[];
	/** Stop a container by name pattern (for chaos testing) */
	stopContainer: (namePattern: string | RegExp) => Promise<StoppedTestContainer | null>;
}

// ============================================================================
// Service Helpers
// ============================================================================

/**
 * Determines if a service should start based on its configuration.
 */
function shouldServiceStart(name: string, service: Service, ctx: StartContext): boolean {
	// Services with shouldStart use custom logic (e.g., redis for queue mode)
	if (service.shouldStart) {
		return service.shouldStart(ctx);
	}

	// Otherwise, check if service is in the enabled services array
	return ctx.config.services?.includes(name) ?? false;
}

/**
 * Determines if a service runs before n8n (provides environment variables)
 * or after n8n (needs n8n running).
 */
function isBeforeN8n(service: Service): boolean {
	// Explicit phase takes precedence
	if (service.phase === 'after-n8n') return false;
	if (service.phase === 'before-n8n') return true;

	// Services with env() method run before n8n (they provide n8n environment)
	return typeof service.env === 'function';
}

/**
 * Topologically sorts services based on dependencies.
 */
function sortByDependencies(serviceNames: string[]): string[] {
	const sorted: string[] = [];
	const visited = new Set<string>();
	const visiting = new Set<string>();

	function visit(name: string) {
		if (visited.has(name)) return;
		if (visiting.has(name)) {
			throw new Error(`Circular dependency detected: ${name}`);
		}

		visiting.add(name);
		const service = SERVICE_REGISTRY[name];
		if (service?.dependsOn) {
			for (const dep of service.dependsOn) {
				if (serviceNames.includes(dep)) {
					visit(dep);
				}
			}
		}
		visiting.delete(name);
		visited.add(name);
		sorted.push(name);
	}

	for (const name of serviceNames) {
		visit(name);
	}

	return sorted;
}

// ============================================================================
// Main Stack Creation
// ============================================================================

export async function createN8NStack(config: N8NConfig = {}): Promise<N8NStack> {
	const log = createElapsedLogger('n8n-stack');

	// Extract config with defaults
	const {
		mains = 1,
		workers = 0,
		postgres: usePostgresConfig = false,
		env = {},
		projectName,
		resourceQuota,
		services: enabledServices = [],
	} = config;

	// Derived config
	const isQueueMode = mains > 1 || workers > 0;
	const needsLoadBalancer = mains > 1;
	// Keycloak (OIDC) requires PostgreSQL for session storage
	const usePostgres = usePostgresConfig || isQueueMode || enabledServices.includes('keycloak');
	const uniqueProjectName = projectName ?? `n8n-stack-${Math.random().toString(36).substring(7)}`;

	// Pre-allocate ports for services that need to know n8n's port
	let allocatedMainPort: number | undefined;
	let allocatedLbPort: number | undefined;

	if (needsLoadBalancer) {
		allocatedLbPort = await getPort();
	} else {
		allocatedMainPort = await getPort();
	}

	// State
	const containers: StartedTestContainer[] = [];
	const serviceResults: Record<string, ServiceResult> = {};
	// Environment accumulated from services (BASE_ENV is added by n8n service)
	let environment: Record<string, string> = {};

	log(`Starting stack creation: ${uniqueProjectName}`);

	// Always create network
	log('Creating network...');
	const network = await new Network().start();
	log('Network created');

	// Build context for services
	const ctx: StartContext = {
		config: { ...config, postgres: usePostgres },
		projectName: uniqueProjectName,
		mains,
		workers,
		isQueueMode,
		usePostgres,
		needsLoadBalancer,
		environment,
		serviceResults,
		allocatedPorts: {
			main: allocatedMainPort,
			loadBalancer: allocatedLbPort,
		},
	};

	// ========================================================================
	// Phase 1: Before-n8n Services
	// ========================================================================

	// Determine which services should start
	const servicesToStart = Object.keys(SERVICE_REGISTRY).filter((name) =>
		shouldServiceStart(name, SERVICE_REGISTRY[name], ctx),
	);

	// Split by phase
	const beforeN8nServices = servicesToStart.filter((name) => isBeforeN8n(SERVICE_REGISTRY[name]));
	const afterN8nServices = servicesToStart.filter((name) => !isBeforeN8n(SERVICE_REGISTRY[name]));

	// Sort by dependencies
	const sortedBeforeN8n = sortByDependencies(beforeN8nServices);

	// Start before-n8n services
	for (const name of sortedBeforeN8n) {
		const service = SERVICE_REGISTRY[name];
		log(`Starting ${service.description}...`);

		const options = service.getOptions?.(ctx);
		const result = await service.start(network, uniqueProjectName, options);

		containers.push(...extractContainers(result as ServiceResult | MultiContainerResult));
		serviceResults[name] = result;

		// Collect environment variables
		if (service.env) {
			environment = { ...environment, ...service.env(result) };
		}
		if (service.extraEnv) {
			environment = { ...environment, ...service.extraEnv(result) };
		}

		// Update context
		ctx.environment = environment;
		ctx.serviceResults = serviceResults;

		log(`${service.description} ready`);
	}

	// ========================================================================
	// Phase 2: n8n Instances
	// ========================================================================

	const lbResult = serviceResults.loadBalancer as LoadBalancerResult | undefined;

	// Determine baseUrl from load balancer or direct port
	const baseUrl = lbResult?.meta.baseUrl ?? `http://localhost:${allocatedMainPort}`;

	// Collect content injections from all services (e.g., Keycloak CA cert)
	const contentToInject: ContentInjection[] = Object.values(serviceResults).flatMap((result) => {
		const meta = result.meta as { n8nContentInjection?: ContentInjection[] } | undefined;
		return meta?.n8nContentInjection ?? [];
	});

	log(`Starting n8n instances (${mains} mains, ${workers} workers)...`);
	const n8nResult = await createN8NInstances({
		mains,
		workers,
		projectName: uniqueProjectName,
		network,
		serviceEnvironment: environment,
		userEnvironment: env,
		usePostgres,
		baseUrl: needsLoadBalancer ? undefined : baseUrl,
		allocatedPort: needsLoadBalancer ? undefined : allocatedMainPort,
		resourceQuota,
		contentToInject,
	});
	containers.push(...n8nResult.containers);
	log('All n8n instances started');

	// Wait for load balancer to see healthy backends
	if (lbResult) {
		log('Polling load balancer for readiness...');
		await pollContainerHttpEndpoint(lbResult.container, '/healthz/readiness');
		log('Load balancer is ready');
	}

	// Update context with baseUrl for after-n8n services
	ctx.baseUrl = baseUrl;

	// ========================================================================
	// Phase 3: Post-n8n Verification
	// ========================================================================

	// Get n8n containers for verification
	const n8nContainers = containers.filter((c) => {
		const name = c.getName();
		return name.includes('-n8n-main-') || name.endsWith('-n8n');
	});

	// Run verifyFromN8n hooks for services that have them
	for (const name of sortedBeforeN8n) {
		const service = SERVICE_REGISTRY[name];
		if (service.verifyFromN8n && serviceResults[name]) {
			log(`Verifying ${service.description} connectivity from n8n...`);
			await service.verifyFromN8n(serviceResults[name], n8nContainers);
			log(`${service.description} connectivity verified`);
		}
	}

	// ========================================================================
	// Phase 4: After-n8n Services
	// ========================================================================

	const sortedAfterN8n = sortByDependencies(afterN8nServices);

	for (const name of sortedAfterN8n) {
		const service = SERVICE_REGISTRY[name];
		log(`Starting ${service.description}...`);

		const options = service.getOptions?.(ctx);
		const result = await service.start(network, uniqueProjectName, options);

		containers.push(...extractContainers(result as ServiceResult | MultiContainerResult));
		serviceResults[name] = result;

		log(`${service.description} ready`);
	}

	log(`Stack ready! baseUrl: ${baseUrl}`);
	await waitForNetworkQuiet();

	// Build service helpers (Proxy-based for lazy instantiation and caching)
	const helperCtx: HelperContext = {
		containers,
		findContainer: (pattern: RegExp) => containers.find((c) => pattern.test(c.getName())),
		serviceResults,
	};
	const helperCache: Partial<ServiceHelpers> = {};

	const servicesProxy = new Proxy({} as ServiceHelpers, {
		get: <K extends keyof ServiceHelpers>(_target: ServiceHelpers, prop: K): ServiceHelpers[K] => {
			if (prop in helperCache) {
				return helperCache[prop]!;
			}

			const factory = (helperFactories as HelperFactories)[prop];
			if (!factory) {
				throw new Error(
					`No helper factory found for service: ${String(prop)}. ` +
						`Available helpers: ${Object.keys(helperFactories).join(', ')}`,
				);
			}

			const helper = factory(helperCtx);
			helperCache[prop] = helper;
			return helper;
		},
		has: (_target, prop) => prop in helperFactories,
		ownKeys: () => Object.keys(helperFactories),
		getOwnPropertyDescriptor: (_target, prop) => {
			if (prop in helperFactories) {
				return { enumerable: true, configurable: true };
			}
			return undefined;
		},
	});

	return {
		baseUrl,
		stop: async () => await stopN8NStack(containers, network, uniqueProjectName),
		containers,
		serviceResults,
		services: servicesProxy,
		get logs() {
			return servicesProxy.observability.logs;
		},
		get metrics() {
			return servicesProxy.observability.metrics;
		},
		findContainers(namePattern: string | RegExp): StartedTestContainer[] {
			const regex = typeof namePattern === 'string' ? new RegExp(namePattern) : namePattern;
			return containers.filter((container) => regex.test(container.getName()));
		},
		async stopContainer(namePattern: string | RegExp): Promise<StoppedTestContainer | null> {
			const regex = typeof namePattern === 'string' ? new RegExp(namePattern) : namePattern;
			const container = containers.find((c) => regex.test(c.getName()));
			return container ? await container.stop() : null;
		},
	};
}

// ============================================================================
// Cleanup
// ============================================================================

async function stopN8NStack(
	containers: StartedTestContainer[],
	network: StartedNetwork,
	uniqueProjectName: string,
): Promise<void> {
	const errors: Error[] = [];
	try {
		const stopPromises = containers.reverse().map(async (container) => {
			try {
				await container.stop();
			} catch (error) {
				errors.push(new Error(`Failed to stop container ${container.getId()}: ${error as string}`));
			}
		});
		await Promise.allSettled(stopPromises);

		try {
			await network.stop();
		} catch (error) {
			errors.push(new Error(`Failed to stop network ${network.getName()}: ${error as string}`));
		}

		if (errors.length > 0) {
			console.warn(
				`Some cleanup operations failed for stack ${uniqueProjectName}:`,
				errors.map((e) => e.message).join(', '),
			);
		}
	} catch (error) {
		console.error(`Critical error during cleanup for stack ${uniqueProjectName}:`, error);
		throw error;
	}
}
