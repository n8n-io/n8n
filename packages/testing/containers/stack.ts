import getPort from 'get-port';
import type { StartedNetwork, StartedTestContainer, StoppedTestContainer } from 'testcontainers';
import { Network } from 'testcontainers';

import { createElapsedLogger, pollContainerHttpEndpoint } from './helpers/utils';
import { waitForNetworkQuiet } from './network-stabilization';
import type { LoadBalancerResult } from './services/load-balancer';
import { createN8NInstances } from './services/n8n';
import { helperFactories, services } from './services/registry';
import type {
	FileToMount,
	HelperContext,
	HelperFactories,
	Service,
	ServiceHelpers,
	ServiceName,
	ServiceResult,
	StackConfig,
	StartContext,
} from './services/types';

const SERVICE_REGISTRY: Record<ServiceName, Service> = services;

export type N8NConfig = StackConfig;

export interface N8NStack {
	baseUrl: string;
	stop: () => Promise<void>;
	containers: StartedTestContainer[];
	serviceResults: Partial<Record<ServiceName, ServiceResult>>;
	services: ServiceHelpers;
	logs: ServiceHelpers['observability']['logs'];
	metrics: ServiceHelpers['observability']['metrics'];
	findContainers: (namePattern: string | RegExp) => StartedTestContainer[];
	stopContainer: (namePattern: string | RegExp) => Promise<StoppedTestContainer | null>;
}

function shouldServiceStart(name: ServiceName, service: Service, ctx: StartContext): boolean {
	if (service.shouldStart) {
		return service.shouldStart(ctx);
	}
	return ctx.config.services?.includes(name) ?? false;
}

function groupByDependencyLevel(serviceNames: ServiceName[]): ServiceName[][] {
	const levels: ServiceName[][] = [];
	const assigned = new Set<ServiceName>();

	while (assigned.size < serviceNames.length) {
		const currentLevel: ServiceName[] = [];
		for (const name of serviceNames) {
			if (assigned.has(name)) continue;
			const service = SERVICE_REGISTRY[name];
			const deps = service?.dependsOn ?? [];
			if (deps.every((dep) => !serviceNames.includes(dep) || assigned.has(dep))) {
				currentLevel.push(name);
			}
		}
		if (currentLevel.length === 0) {
			throw new Error('Circular dependency detected in services');
		}
		levels.push(currentLevel);
		currentLevel.forEach((name) => assigned.add(name));
	}

	return levels;
}

export async function createN8NStack(config: N8NConfig = {}): Promise<N8NStack> {
	const {
		mains = 1,
		workers = 0,
		postgres: usePostgresConfig = false,
		env = {},
		projectName,
		resourceQuota,
		services: enabledServices = [],
	} = config;

	const log = createElapsedLogger('stack');

	const isQueueMode = mains > 1 || workers > 0;
	const needsLoadBalancer = mains > 1;
	const usePostgres = usePostgresConfig || isQueueMode || enabledServices.includes('keycloak');
	const uniqueProjectName = projectName ?? `n8n-stack-${Math.random().toString(36).substring(7)}`;

	let allocatedMainPort: number | undefined;
	let allocatedLbPort: number | undefined;

	if (needsLoadBalancer) {
		allocatedLbPort = await getPort();
	} else {
		allocatedMainPort = await getPort();
	}

	const containers: StartedTestContainer[] = [];
	const serviceResults: Record<string, ServiceResult> = {};
	let environment: Record<string, string> = {};

	log(`Starting: ${uniqueProjectName}`);

	const network = await new Network().start();

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

	// Step 1: Start services (parallel by dependency level)
	const allServiceNames = Object.keys(SERVICE_REGISTRY) as ServiceName[];
	const servicesToStart = allServiceNames.filter((name) =>
		shouldServiceStart(name, SERVICE_REGISTRY[name], ctx),
	);
	const dependencyLevels = groupByDependencyLevel(servicesToStart);

	for (const level of dependencyLevels) {
		const levelNames = level.map((name) => SERVICE_REGISTRY[name].description).join(', ');

		const levelPromises = level.map(async (name) => {
			const service = SERVICE_REGISTRY[name];
			const options = service.getOptions?.(ctx);
			try {
				const result = await service.start(network, uniqueProjectName, options, ctx);
				return { name, service, result };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Service "${service.description}" (${name}) failed to start: ${message}`);
			}
		});

		const results = await Promise.all(levelPromises);

		for (const { name, service, result } of results) {
			containers.push(result.container);
			serviceResults[name] = result;

			if (service.env) {
				environment = { ...environment, ...service.env(result) };
			}
			if (service.extraEnv) {
				environment = { ...environment, ...service.extraEnv(result) };
			}
		}

		ctx.environment = environment;
		ctx.serviceResults = serviceResults;

		log(`Services ready: ${levelNames}`);
	}

	// Step 2: Start n8n (main 1 first for DB setup, then rest in parallel)
	const lbResult = serviceResults.loadBalancer as LoadBalancerResult | undefined;
	const baseUrl = lbResult?.meta.baseUrl ?? `http://localhost:${allocatedMainPort}`;

	const filesToMount: FileToMount[] = Object.values(serviceResults).flatMap((result) => {
		const meta = result.meta as { n8nFilesToMount?: FileToMount[] } | undefined;
		return meta?.n8nFilesToMount ?? [];
	});

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
		filesToMount,
	});
	containers.push(...n8nResult.containers);
	log(`n8n ready: ${mains} main(s), ${workers} worker(s)`);

	if (lbResult) {
		await pollContainerHttpEndpoint(lbResult.container, '/healthz/readiness');
		log('Load balancer ready');
	}

	ctx.baseUrl = baseUrl;

	// Run verification hooks (e.g. keycloak connectivity check)
	const n8nContainers = containers.filter((c) => {
		const name = c.getName();
		return name.includes('-n8n-main-') || name.endsWith('-n8n');
	});

	const verifications: string[] = [];
	for (const name of servicesToStart) {
		const service = SERVICE_REGISTRY[name];
		if (service.verifyFromN8n && serviceResults[name]) {
			await service.verifyFromN8n(serviceResults[name], n8nContainers);
			verifications.push(service.description);
		}
	}
	if (verifications.length > 0) {
		log(`Verified: ${verifications.join(', ')}`);
	}

	log(`Ready: ${baseUrl}`);
	await waitForNetworkQuiet();

	// Build service helpers proxy
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

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

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
				errors.push(
					new Error(`Failed to stop container ${container.getId()}: ${getErrorMessage(error)}`),
				);
			}
		});
		await Promise.allSettled(stopPromises);

		try {
			await network.stop();
		} catch (error) {
			errors.push(
				new Error(`Failed to stop network ${network.getName()}: ${getErrorMessage(error)}`),
			);
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
