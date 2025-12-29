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
import { GenericContainer, Network, Wait } from 'testcontainers';

import { getDockerImageFromEnv } from './docker-image';
import { DockerImageNotFoundError } from './docker-image-not-found-error';
import { createHelperContext } from './helpers/context';
import {
	createElapsedLogger,
	createSilentLogConsumer,
	pollContainerHttpEndpoint,
} from './helpers/utils';
import { N8nImagePullPolicy } from './n8n-image-pull-policy';
import { waitForNetworkQuiet } from './network-stabilization';
import { N8N_KEYCLOAK_CERT_PATH, type KeycloakResult } from './services/keycloak';
import type { LoadBalancerResult } from './services/load-balancer';
import { helperFactories, services } from './services/registry';
import type {
	HelperFactories,
	MultiContainerResult,
	Service,
	ServiceHelpers,
	ServiceResult,
	StackConfig,
	StartContext,
} from './services/types';
import { TEST_CONTAINER_IMAGES } from './test-containers';

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

// Default n8n image
const N8N_IMAGE = getDockerImageFromEnv(TEST_CONTAINER_IMAGES.n8n);

// Base environment for all n8n instances
const BASE_ENV: Record<string, string> = {
	N8N_LOG_LEVEL: 'debug',
	N8N_ENCRYPTION_KEY: process.env.N8N_ENCRYPTION_KEY ?? 'test-encryption-key',
	E2E_TESTS: 'false',
	QUEUE_HEALTH_CHECK_ACTIVE: 'true',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	N8N_METRICS: 'true',
	NODE_ENV: 'development',
	N8N_LICENSE_TENANT_ID: process.env.N8N_LICENSE_TENANT_ID ?? '1001',
	N8N_LICENSE_ACTIVATION_KEY: process.env.N8N_LICENSE_ACTIVATION_KEY ?? '',
	N8N_LICENSE_CERT: process.env.N8N_LICENSE_CERT ?? '',
	N8N_DYNAMIC_BANNERS_ENABLED: 'false',
};

// Wait strategies
const N8N_MAIN_WAIT_STRATEGY = Wait.forAll([
	Wait.forListeningPorts(),
	Wait.forHttp('/healthz/readiness', 5678).forStatusCode(200).withStartupTimeout(30000),
	Wait.forLogMessage('Editor is now accessible via').withStartupTimeout(30000),
]);

const N8N_WORKER_WAIT_STRATEGY = Wait.forAll([
	Wait.forListeningPorts(),
	Wait.forLogMessage('n8n worker is now ready').withStartupTimeout(30000),
]);

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
function shouldServiceStart(_name: string, service: Service, ctx: StartContext): boolean {
	// Check explicit shouldStart function first
	if (service.shouldStart) {
		return service.shouldStart(ctx);
	}

	// Check configKey
	if (service.configKey) {
		return ctx.config[service.configKey] === true;
	}

	// Services without conditions don't auto-start (must be explicitly enabled)
	return false;
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
		oidc = false,
	} = config;

	// Derived config
	const isQueueMode = mains > 1 || workers > 0;
	const needsLoadBalancer = mains > 1;
	const usePostgres = usePostgresConfig || isQueueMode || oidc;
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
	let environment: Record<string, string> = { ...BASE_ENV, ...env };

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

	// Handle SQLite fallback
	if (!usePostgres) {
		environment.DB_TYPE = 'sqlite';
	}

	// Queue mode additional config
	if (isQueueMode) {
		environment = {
			...environment,
			EXECUTIONS_MODE: 'queue',
			OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS: 'true',
		};

		if (mains > 1) {
			if (!process.env.N8N_LICENSE_ACTIVATION_KEY) {
				throw new Error('N8N_LICENSE_ACTIVATION_KEY is required for multi-main instances');
			}
			environment.N8N_MULTI_MAIN_SETUP_ENABLED = 'true';
		}
	}

	// Task runner environment (always enabled)
	environment = {
		...environment,
		N8N_RUNNERS_ENABLED: 'true',
		N8N_RUNNERS_MODE: 'external',
		N8N_RUNNERS_AUTH_TOKEN: 'test',
		N8N_RUNNERS_BROKER_LISTEN_ADDRESS: '0.0.0.0',
	};

	// ========================================================================
	// Phase 2: n8n Instances
	// ========================================================================

	const keycloakResult = serviceResults.keycloak as KeycloakResult | undefined;
	const lbResult = serviceResults.loadBalancer as LoadBalancerResult | undefined;

	// Determine baseUrl from load balancer or direct port
	const baseUrl = lbResult?.meta.baseUrl ?? `http://localhost:${allocatedMainPort}`;

	// For single instance mode, set WEBHOOK_URL and N8N_PORT
	if (!needsLoadBalancer) {
		environment = { ...environment, WEBHOOK_URL: baseUrl, N8N_PORT: '5678' };
	}

	log(`Starting n8n instances (${mains} mains, ${workers} workers)...`);
	const instances = await createN8NInstances({
		mainCount: mains,
		workerCount: workers,
		uniqueProjectName,
		environment,
		network,
		directPort: needsLoadBalancer ? undefined : allocatedMainPort,
		resourceQuota,
		keycloakCertPem: keycloakResult?.meta.certPem,
	});
	containers.push(...instances);
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
	const helperCtx = createHelperContext(containers, serviceResults);
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

// ============================================================================
// n8n Instance Creation
// ============================================================================

interface CreateInstancesOptions {
	mainCount: number;
	workerCount: number;
	uniqueProjectName: string;
	environment: Record<string, string>;
	network: StartedNetwork;
	directPort?: number;
	resourceQuota?: { memory?: number; cpu?: number };
	keycloakCertPem?: string;
}

async function createN8NInstances({
	mainCount,
	workerCount,
	uniqueProjectName,
	environment,
	network,
	directPort,
	resourceQuota,
	keycloakCertPem,
}: CreateInstancesOptions): Promise<StartedTestContainer[]> {
	const instances: StartedTestContainer[] = [];
	const log = createElapsedLogger('n8n-instances');

	for (let i = 1; i <= mainCount; i++) {
		const name = mainCount > 1 ? `${uniqueProjectName}-n8n-main-${i}` : `${uniqueProjectName}-n8n`;
		log(`Starting main ${i}/${mainCount}: ${name}`);
		const container = await createN8NContainer({
			name,
			uniqueProjectName,
			environment,
			network,
			isWorker: false,
			instanceNumber: i,
			networkAlias: name,
			directPort: i === 1 ? directPort : undefined,
			resourceQuota,
			keycloakCertPem,
		});
		instances.push(container);
		log(`Main ${i}/${mainCount} ready`);
	}

	for (let i = 1; i <= workerCount; i++) {
		const name = `${uniqueProjectName}-n8n-worker-${i}`;
		log(`Starting worker ${i}/${workerCount}: ${name}`);
		const container = await createN8NContainer({
			name,
			uniqueProjectName,
			environment,
			network,
			isWorker: true,
			instanceNumber: i,
			resourceQuota,
			keycloakCertPem,
		});
		instances.push(container);
		log(`Worker ${i}/${workerCount} ready`);
	}

	return instances;
}

interface CreateContainerOptions {
	name: string;
	uniqueProjectName: string;
	environment: Record<string, string>;
	network: StartedNetwork;
	isWorker: boolean;
	instanceNumber: number;
	networkAlias?: string;
	directPort?: number;
	resourceQuota?: { memory?: number; cpu?: number };
	keycloakCertPem?: string;
}

async function createN8NContainer({
	name,
	uniqueProjectName,
	environment,
	network,
	isWorker,
	instanceNumber,
	networkAlias,
	directPort,
	resourceQuota,
	keycloakCertPem,
}: CreateContainerOptions): Promise<StartedTestContainer> {
	const { consumer, throwWithLogs } = createSilentLogConsumer();

	let container = new GenericContainer(N8N_IMAGE);

	container = container
		.withEnvironment(environment)
		.withLabels({
			'com.docker.compose.project': uniqueProjectName,
			'com.docker.compose.service': isWorker ? 'n8n-worker' : 'n8n-main',
			instance: instanceNumber.toString(),
		})
		.withPullPolicy(new N8nImagePullPolicy(N8N_IMAGE))
		.withName(name)
		.withLogConsumer(consumer)
		.withReuse();

	if (keycloakCertPem) {
		container = container.withCopyContentToContainer([
			{ content: keycloakCertPem, target: N8N_KEYCLOAK_CERT_PATH },
		]);
	}

	if (resourceQuota) {
		container = container.withResourcesQuota({
			memory: resourceQuota.memory,
			cpu: resourceQuota.cpu,
		});
	}

	container = container.withNetwork(network);
	if (networkAlias) {
		container = container.withNetworkAliases(networkAlias);
	}

	// Task runner is always enabled, so always expose both ports (5678 for n8n, 5679 for task broker)
	if (isWorker) {
		container = container
			.withCommand(['worker'])
			.withExposedPorts(5678, 5679)
			.withWaitStrategy(N8N_WORKER_WAIT_STRATEGY);
	} else {
		if (directPort) {
			container = container
				.withExposedPorts({ container: 5678, host: directPort }, 5679)
				.withWaitStrategy(N8N_MAIN_WAIT_STRATEGY);
		} else {
			container = container.withExposedPorts(5678, 5679).withWaitStrategy(N8N_MAIN_WAIT_STRATEGY);
		}
	}

	try {
		return await container.start();
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			'statusCode' in error &&
			(error as Error & { statusCode: number }).statusCode === 404
		) {
			throw new DockerImageNotFoundError(name, error);
		}

		console.error(`Container "${name}" failed to start!`);
		console.error('Original error:', error instanceof Error ? error.message : String(error));

		return throwWithLogs(error);
	}
}

// Re-export service types for convenience
export type { PostgresResult } from './services/postgres';
export type { RedisResult } from './services/redis';
export type { MailpitResult } from './services/mailpit';
export type { GiteaResult } from './services/gitea';
export type { KeycloakResult } from './services/keycloak';
export type { ObservabilityResult, ScrapeTarget } from './services/observability';
export type { TracingResult } from './services/tracing';
export type { ProxyResult } from './services/proxy';
export type { TaskRunnerResult } from './services/task-runner';
export type { LoadBalancerResult } from './services/load-balancer';
