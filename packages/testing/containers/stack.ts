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

function isMultiContainerResult(
	result: ServiceResult | MultiContainerResult,
): result is MultiContainerResult {
	return 'containers' in result && Array.isArray(result.containers);
}

function extractContainers(result: ServiceResult | MultiContainerResult): StartedTestContainer[] {
	if (isMultiContainerResult(result)) {
		return result.containers;
	}
	return [result.container];
}

const SERVICE_REGISTRY: Record<string, Service> = services;

export type N8NConfig = StackConfig;

export interface N8NStack {
	baseUrl: string;
	stop: () => Promise<void>;
	containers: StartedTestContainer[];
	serviceResults: Record<string, ServiceResult>;
	services: ServiceHelpers;
	logs: ServiceHelpers['observability']['logs'];
	metrics: ServiceHelpers['observability']['metrics'];
	findContainers: (namePattern: string | RegExp) => StartedTestContainer[];
	stopContainer: (namePattern: string | RegExp) => Promise<StoppedTestContainer | null>;
}

function shouldServiceStart(name: string, service: Service, ctx: StartContext): boolean {
	if (service.shouldStart) {
		return service.shouldStart(ctx);
	}
	return ctx.config.services?.includes(name) ?? false;
}

function isBeforeN8n(service: Service): boolean {
	if (service.phase === 'after-n8n') return false;
	if (service.phase === 'before-n8n') return true;
	return typeof service.env === 'function';
}

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

export async function createN8NStack(config: N8NConfig = {}): Promise<N8NStack> {
	const log = createElapsedLogger('n8n-stack');

	const {
		mains = 1,
		workers = 0,
		postgres: usePostgresConfig = false,
		env = {},
		projectName,
		resourceQuota,
		services: enabledServices = [],
	} = config;

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

	log(`Starting stack creation: ${uniqueProjectName}`);

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

	// Phase 1: Before-n8n Services
	const servicesToStart = Object.keys(SERVICE_REGISTRY).filter((name) =>
		shouldServiceStart(name, SERVICE_REGISTRY[name], ctx),
	);

	const beforeN8nServices = servicesToStart.filter((name) => isBeforeN8n(SERVICE_REGISTRY[name]));
	const afterN8nServices = servicesToStart.filter((name) => !isBeforeN8n(SERVICE_REGISTRY[name]));
	const sortedBeforeN8n = sortByDependencies(beforeN8nServices);

	for (const name of sortedBeforeN8n) {
		const service = SERVICE_REGISTRY[name];
		log(`Starting ${service.description}...`);

		const options = service.getOptions?.(ctx);
		const result = await service.start(network, uniqueProjectName, options);

		containers.push(...extractContainers(result as ServiceResult | MultiContainerResult));
		serviceResults[name] = result;

		if (service.env) {
			environment = { ...environment, ...service.env(result) };
		}
		if (service.extraEnv) {
			environment = { ...environment, ...service.extraEnv(result) };
		}

		ctx.environment = environment;
		ctx.serviceResults = serviceResults;

		log(`${service.description} ready`);
	}

	// Phase 2: n8n Instances
	const lbResult = serviceResults.loadBalancer as LoadBalancerResult | undefined;
	const baseUrl = lbResult?.meta.baseUrl ?? `http://localhost:${allocatedMainPort}`;

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

	if (lbResult) {
		log('Polling load balancer for readiness...');
		await pollContainerHttpEndpoint(lbResult.container, '/healthz/readiness');
		log('Load balancer is ready');
	}

	ctx.baseUrl = baseUrl;

	// Phase 3: Post-n8n Verification
	const n8nContainers = containers.filter((c) => {
		const name = c.getName();
		return name.includes('-n8n-main-') || name.endsWith('-n8n');
	});

	for (const name of sortedBeforeN8n) {
		const service = SERVICE_REGISTRY[name];
		if (service.verifyFromN8n && serviceResults[name]) {
			log(`Verifying ${service.description} connectivity from n8n...`);
			await service.verifyFromN8n(serviceResults[name], n8nContainers);
			log(`${service.description} connectivity verified`);
		}
	}

	// Phase 4: After-n8n Services
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
