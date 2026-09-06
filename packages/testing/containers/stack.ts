import getPort from 'get-port';
import type { StartedNetwork, StartedTestContainer, StoppedTestContainer } from 'testcontainers';
import { Network } from 'testcontainers';

import {
	createElapsedLogger,
	pollContainerHttpEndpoint,
	waitForContainerLogMessages,
} from './helpers/utils';
import { waitForNetworkQuiet } from './network-stabilization';
import { ResourceTracker, type CleanupReport } from './resource-tracker';
import type { LoadBalancerResult } from './services/load-balancer';
import {
	createN8NInstances,
	N8NStartupError,
	type N8NInstancesResult,
	type N8NStartupDiagnostics,
} from './services/n8n';
import { helperFactories, services } from './services/registry';
import type { TaskRunnerResult } from './services/task-runner';
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
import { StartupDeadline } from './startup-deadline';
import { recordStartupFailure } from './startup-diagnostics';
import { createTelemetryRecorder } from './telemetry';

const SERVICE_REGISTRY: Record<ServiceName, Service> = services;

export type N8NConfig = StackConfig;

export interface N8NStack {
	attemptId: string;
	baseUrl: string;
	projectName: string;
	stop: () => Promise<void>;
	containers: StartedTestContainer[];
	serviceResults: Partial<Record<ServiceName, ServiceResult>>;
	/**
	 * Env of the services a hosted deployment stood in for, so they started no
	 * containers and have no `serviceResults` entry. Keyed by service name.
	 */
	hostedServiceEnv: Partial<Record<ServiceName, Record<string, string>>>;
	services: ServiceHelpers;
	logs: ServiceHelpers['observability']['logs'];
	metrics: ServiceHelpers['observability']['metrics'];
	findContainers: (namePattern: string | RegExp) => StartedTestContainer[];
	stopContainer: (namePattern: string | RegExp) => Promise<StoppedTestContainer | null>;
	/** Direct URLs to each main instance (bypasses load balancer). Index 0 = main-1, etc. */
	mainUrls: string[];
	/**
	 * Same mains addressed by their network alias, for callers running *inside* the
	 * stack's network — e.g. an HTTP Request node executed by a worker container,
	 * which cannot reach the host-mapped ports in `baseUrl`/`mainUrls`.
	 */
	internalMainUrls: string[];
	startupDiagnostics: N8NStartupDiagnostics;
}

function shouldServiceStart(name: ServiceName, service: Service, ctx: StartContext): boolean {
	// Explicitly requested services always start
	if (ctx.config.services?.includes(name)) return true;
	if (service.shouldStart) {
		return service.shouldStart(ctx);
	}
	return false;
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
		webhooks = 0,
		postgres: usePostgresConfig = false,
		env = {},
		projectName,
		resourceQuota,
		workerResourceQuota,
		webhookResourceQuota,
		services: enabledServices = [],
		external = false,
		networkName,
		coverageHostDir,
		startupTimeoutMs = 300_000,
	} = config;

	const log = createElapsedLogger('stack');

	const isQueueMode = mains > 1 || workers > 0 || webhooks > 0;
	const needsLoadBalancer = mains > 1 || webhooks > 0;
	const usePostgres = usePostgresConfig || isQueueMode || enabledServices.includes('keycloak');
	const uniqueProjectName = projectName ?? `n8n-stack-${Math.random().toString(36).substring(7)}`;

	let allocatedMainPort: number | undefined;
	let allocatedLbPort: number | undefined;
	const resources = new ResourceTracker();
	const startupDeadline = new StartupDeadline(startupTimeoutMs);

	try {
		if (needsLoadBalancer) {
			allocatedLbPort = await startupDeadline.run(async () => await getPort());
		} else {
			allocatedMainPort = await startupDeadline.run(async () => await getPort());
		}
	} catch (error) {
		startupDeadline.dispose();
		throw error;
	}

	const containers: StartedTestContainer[] = [];
	const serviceResults: Record<string, ServiceResult> = {};
	const hostedServiceEnv: Partial<Record<ServiceName, Record<string, string>>> = {};
	let environment: Record<string, string> = {};

	log(`Starting: ${uniqueProjectName}`);

	const telemetry = createTelemetryRecorder(config);

	let network: StartedNetwork;
	let cleanupStarted = false;
	try {
		telemetry.startStage('network');
		const networkStart = performance.now();
		const uuid = networkName ? { nextUuid: () => networkName } : undefined;
		startupDeadline.throwIfAborted();
		const networkPromise = new Network(uuid).start();
		const trackedNetworkPromise = networkPromise.then(async (startedNetwork) => {
			if (cleanupStarted) {
				await startedNetwork.stop();
				return startedNetwork;
			}
			resources.trackNetwork(startedNetwork);
			return startedNetwork;
		});
		void trackedNetworkPromise.catch((error: unknown) => {
			if (!cleanupStarted) return;
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[stack] Late network cleanup failed: ${message}`);
		});
		network = await startupDeadline.run(async () => await trackedNetworkPromise);
		telemetry.recordNetwork(Math.round(performance.now() - networkStart));
		telemetry.finishStage();
	} catch (error) {
		telemetry.finishStage('failure', error);
		telemetry.setFailurePhase('network');
		const message = error instanceof Error ? error.message : String(error);
		telemetry.flush(false, `Network creation failed: ${message}`);
		cleanupStarted = true;
		const cleanup = await resources.dispose();
		attachCleanupReport(error, cleanup);
		startupDeadline.dispose();
		throw error;
	}

	try {
		const ctx: StartContext = {
			config: { ...config, postgres: usePostgres },
			projectName: uniqueProjectName,
			mains,
			workers,
			webhooks,
			isQueueMode,
			usePostgres,
			needsLoadBalancer,
			external,
			environment,
			serviceResults,
			allocatedPorts: {
				main: allocatedMainPort,
				loadBalancer: allocatedLbPort,
			},
			registerContainer: (container) => {
				resources.trackContainer(container);
				if (!containers.includes(container)) containers.push(container);
			},
			registerPath: (path) => resources.trackPath(path),
		};

		// Step 1: Start services sequentially within each dependency level.
		// Sequential is intentional: parallel start on 2-vCPU CI runners thrashes CPU during
		// each container's JIT/init spike and pushes services past their startup timeouts.
		// Local benchmarks showed individual containers booting 2-4× faster sequentially under
		// contention, with only modest wall-clock cost on uncontended hardware.
		const allServiceNames = Object.keys(SERVICE_REGISTRY) as ServiceName[];
		const requestedServices = allServiceNames.filter((name) =>
			shouldServiceStart(name, SERVICE_REGISTRY[name], ctx),
		);

		// A requested service that reports a healthy hosted deployment contributes its
		// env and starts nothing. A service that declines (no config, or the
		// deployment did not answer) falls through to its local containers below.
		for (const name of requestedServices) {
			telemetry.startStage(`hosted:${name}`, 'hosted');
			let hostedEnv: Record<string, string> | undefined;
			try {
				hostedEnv = await startupDeadline.run(
					async () => await (SERVICE_REGISTRY[name].hostedEnv?.(ctx) ?? Promise.resolve(undefined)),
				);
				startupDeadline.throwIfAborted();
				telemetry.finishStage();
			} catch (error) {
				telemetry.finishStage('failure', error);
				throw error;
			}
			if (!hostedEnv) continue;
			environment = { ...environment, ...hostedEnv };
			hostedServiceEnv[name] = hostedEnv;
		}
		const hostedServices = Object.keys(hostedServiceEnv) as ServiceName[];
		if (hostedServices.length > 0) {
			ctx.environment = environment;
			log(`Using hosted: ${hostedServices.map((n) => SERVICE_REGISTRY[n].description).join(', ')}`);
		}

		const servicesToStart = requestedServices.filter((name) => !(name in hostedServiceEnv));
		const dependencyLevels = groupByDependencyLevel(servicesToStart);

		const startService = async (name: ServiceName) => {
			const service = SERVICE_REGISTRY[name];
			const options = service.getOptions?.(ctx);
			const serviceStart = performance.now();
			telemetry.startStage(`service:${name}`);
			const endAcquisition = resources.beginAcquisition();
			try {
				startupDeadline.throwIfAborted();
				const result = await service.start(network, uniqueProjectName, options, ctx);
				startupDeadline.throwIfAborted();
				const serviceContainers =
					'containers' in result && Array.isArray(result.containers)
						? (result.containers as StartedTestContainer[])
						: [result.container];
				for (const container of serviceContainers) {
					resources.trackContainer(container);
					if (!containers.includes(container)) containers.push(container);
				}
				telemetry.recordService(name, Math.round(performance.now() - serviceStart));
				telemetry.finishStage();
				return { name, service, result };
			} catch (error) {
				telemetry.recordService(name, Math.round(performance.now() - serviceStart));
				telemetry.finishStage('failure', error);
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Service "${service.description}" (${name}) failed to start: ${message}`);
			} finally {
				endAcquisition();
			}
		};

		for (const level of dependencyLevels) {
			const levelNames = level.map((name) => SERVICE_REGISTRY[name].description).join(', ');

			const results: Array<Awaited<ReturnType<typeof startService>>> = [];
			for (const name of level) {
				results.push(await startService(name));
			}

			for (const { name, service, result } of results) {
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

		// Earliest log line the readiness gate below may accept
		const n8nStartedAtSeconds = Math.floor(Date.now() / 1000);
		const n8nStartupStart = performance.now();
		telemetry.startStage('n8n-startup');
		let n8nResult: N8NInstancesResult;
		const endN8nAcquisition = resources.beginAcquisition();
		try {
			n8nResult = await createN8NInstances({
				attemptId: telemetry.attemptId,
				mains,
				workers,
				webhooks,
				projectName: uniqueProjectName,
				network,
				serviceEnvironment: environment,
				userEnvironment: env,
				usePostgres,
				baseUrl: needsLoadBalancer ? undefined : baseUrl,
				allocatedPort: needsLoadBalancer ? undefined : allocatedMainPort,
				resourceQuota,
				workerResourceQuota,
				webhookResourceQuota,
				filesToMount,
				coverageHostDir,
				registerContainer: (container) => {
					resources.trackContainer(container);
					if (!containers.includes(container)) containers.push(container);
				},
				startupDeadline,
			});
			startupDeadline.throwIfAborted();
			telemetry.finishStage();
		} catch (error) {
			telemetry.finishStage('failure', error);
			throw error;
		} finally {
			endN8nAcquisition();
		}
		telemetry.recordN8nStartup(
			Math.round(performance.now() - n8nStartupStart),
			n8nResult.containers.length,
		);
		log(`n8n ready: ${mains} main(s), ${webhooks} webhook(s), ${workers} worker(s)`);

		if (lbResult) {
			telemetry.startStage('load-balancer-readiness');
			try {
				await pollContainerHttpEndpoint(
					lbResult.container,
					'/healthz/readiness',
					startupDeadline.remainingMs,
					startupDeadline.signal,
				);
				telemetry.finishStage();
			} catch (error) {
				telemetry.finishStage('failure', error);
				throw error;
			}
			log('Load balancer ready');
		}

		// The runner container starts before the instance whose broker it dials, so it
		// can only register once that instance is up. Each launcher must have
		// registered before a test executes code, otherwise the first execution races
		// the registration. Which instance owns the broker varies by topology, so the
		// runner's own log is the one place the signal is observable. Match each
		// launcher separately, so one launcher reconnecting cannot stand in for the
		// other, and only from this run, since a reused container keeps its old logs.
		const taskRunnerResult = serviceResults.taskRunner as TaskRunnerResult | undefined;
		if (taskRunnerResult) {
			telemetry.startStage('task-runner-registration');
			try {
				await waitForContainerLogMessages(
					taskRunnerResult.container,
					[
						/\[launcher:js\].*Received message `broker:runnerregistered`/,
						/\[launcher:py\].*Received message `broker:runnerregistered`/,
					],
					{
						since: n8nStartedAtSeconds,
						timeoutMs: startupDeadline.remainingMs,
						signal: startupDeadline.signal,
					},
				);
				telemetry.finishStage();
			} catch (error) {
				telemetry.finishStage('failure', error);
				throw error;
			}
			log('Task runners registered with broker');
		}

		ctx.baseUrl = baseUrl;

		// Build direct main URLs (bypassing load balancer). `mainUrls` are host-mapped
		// and only reachable from the test process; `internalMainUrls` use the network
		// alias and are what other containers (workers running a node) must dial.
		const mainUrls: string[] = [];
		const internalMainUrls: string[] = [];
		for (let i = 1; i <= mains; i++) {
			const mainNameSuffix = mains > 1 ? `-n8n-main-${i}` : '-n8n';
			const mainContainer = containers.find((c) => c.getName().endsWith(mainNameSuffix));
			if (mainContainer) {
				const mainPort = mainContainer.getMappedPort(5678);
				mainUrls.push(`http://localhost:${mainPort}`);
				internalMainUrls.push(`http://${uniqueProjectName}${mainNameSuffix}:5678`);
			}
		}
		log(`Direct main URLs: ${mainUrls.join(', ')}`);

		// Run verification hooks (e.g. keycloak connectivity check)
		const n8nContainers = containers.filter((c) => {
			const name = c.getName();
			return name.includes('-n8n-main-') || name.endsWith('-n8n');
		});

		const verifications: string[] = [];
		for (const name of servicesToStart) {
			const service = SERVICE_REGISTRY[name];
			if (service.verifyFromN8n && serviceResults[name]) {
				telemetry.startStage(`verify:${name}`);
				try {
					await service.verifyFromN8n(serviceResults[name], n8nContainers);
					telemetry.finishStage();
				} catch (error) {
					telemetry.finishStage('failure', error);
					throw error;
				}
				verifications.push(service.description);
			}
		}
		if (verifications.length > 0) {
			log(`Verified: ${verifications.join(', ')}`);
		}

		telemetry.startStage('network-quiet');
		try {
			await waitForNetworkQuiet(1000, startupDeadline.remainingMs, startupDeadline.signal);
			startupDeadline.throwIfAborted();
			telemetry.finishStage();
		} catch (error) {
			telemetry.finishStage('failure', error);
			throw error;
		}
		telemetry.flush(true);

		const helperCtx: HelperContext = {
			containers,
			findContainer: (pattern: RegExp) => containers.find((c) => pattern.test(c.getName())),
			serviceResults,
		};
		const helperCache: Partial<ServiceHelpers> = {};

		const servicesProxy = new Proxy({} as ServiceHelpers, {
			get: <K extends keyof ServiceHelpers>(
				_target: ServiceHelpers,
				prop: K,
			): ServiceHelpers[K] => {
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
			attemptId: telemetry.attemptId,
			baseUrl,
			projectName: uniqueProjectName,
			stop: async () => {
				const cleanup = await resources.dispose(coverageHostDir ? { timeout: 30_000 } : undefined);
				if (cleanup.failures.length > 0 || cleanup.remaining.length > 0) {
					throw new Error(cleanupDetails(cleanup));
				}
			},
			containers,
			serviceResults,
			hostedServiceEnv,
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
			mainUrls,
			internalMainUrls,
			startupDiagnostics: n8nResult.diagnostics,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (error instanceof N8NStartupError) {
			recordStartupFailure(
				uniqueProjectName,
				error.diagnostics,
				message,
				telemetry.failurePhaseValue,
			);
		}
		telemetry.setFailurePhase('stack-startup');
		telemetry.flush(false, message);
		const cleanup = await resources.dispose();
		attachCleanupReport(error, cleanup);
		throw error;
	} finally {
		startupDeadline.dispose();
	}
}

function attachCleanupReport(error: unknown, cleanup: CleanupReport): void {
	if (cleanup.failures.length === 0 && cleanup.remaining.length === 0) return;
	const details = cleanupDetails(cleanup);
	if (error instanceof Error) {
		error.message = `${error.message} Cleanup: ${details}`;
	} else {
		console.error(`Stack startup failed. Cleanup: ${details}`);
	}
}

function cleanupDetails(cleanup: CleanupReport): string {
	return [
		...cleanup.failures.map(({ resource, error: failure }) => `${resource}: ${failure.message}`),
		...cleanup.remaining.map((resource) => `${resource} remains`),
	].join('; ');
}
