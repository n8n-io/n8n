import type { PortWithOptionalBinding, StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

import { DockerImageNotFoundError } from '../docker-image-not-found-error';
import {
	createElapsedLogger,
	createReadinessProbe,
	createSilentLogConsumer,
} from '../helpers/utils';
import { N8nImagePullPolicy } from '../n8n-image-pull-policy';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { FileToMount } from './types';

const N8N_IMAGE = TEST_CONTAINER_IMAGES.n8n;
// Must match N8N_PORT / QUEUE_HEALTH_CHECK_PORT defaults.
const N8N_READINESS_PORT = 5678;
const N8N_STARTUP_TIMEOUT_MS = 60_000;
// withReadTimeout doubles as the poll interval (testcontainers IntervalRetry); the
// default 1000ms leaves up to a second of stale-poll latency after the process is ready.
const N8N_READ_TIMEOUT_MS = 250;

export interface N8NStartupDiagnostics {
	logs: Record<string, string>;
	readinessPayloads: Record<string, string | null>;
}

export class N8NStartupError extends Error {
	readonly diagnostics: N8NStartupDiagnostics;

	constructor(message: string, diagnostics: N8NStartupDiagnostics, cause?: unknown) {
		super(message);
		this.name = 'N8NStartupError';
		this.diagnostics = diagnostics;
		if (cause !== undefined) {
			(this as Error & { cause?: unknown }).cause = cause;
		}
	}
}

const BASE_ENV: Record<string, string> = {
	N8N_LOG_LEVEL: 'debug',
	N8N_ENCRYPTION_KEY: process.env.N8N_ENCRYPTION_KEY ?? 'test-encryption-key',
	E2E_TESTS: 'false',
	QUEUE_HEALTH_CHECK_ACTIVE: 'true',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	N8N_METRICS: 'true',
	NODE_ENV: 'development',
	N8N_DYNAMIC_BANNERS_ENABLED: 'false',
	N8N_LICENSE_TENANT_ID: process.env.N8N_LICENSE_TENANT_ID ?? '1001',
	N8N_LICENSE_ACTIVATION_KEY: process.env.N8N_LICENSE_ACTIVATION_KEY ?? '',
	N8N_LICENSE_CERT: process.env.N8N_LICENSE_CERT ?? '',
	N8N_RUNNERS_MODE: 'external',
	N8N_RUNNERS_AUTH_TOKEN: 'test',
	N8N_RUNNERS_BROKER_LISTEN_ADDRESS: '0.0.0.0',
	// Expose V8 garbage collector for memory profiling in performance tests
	NODE_OPTIONS: '--expose-gc',
};

export interface N8NInstancesOptions {
	mains: number;
	workers: number;
	projectName: string;
	network: StartedNetwork;
	serviceEnvironment: Record<string, string>;
	userEnvironment?: Record<string, string>;
	usePostgres: boolean;
	baseUrl?: string;
	allocatedPort?: number;
	resourceQuota?: { memory?: number; cpu?: number };
	workerResourceQuota?: { memory?: number; cpu?: number };
	filesToMount?: FileToMount[];
}

export interface N8NInstancesResult {
	containers: StartedTestContainer[];
	environment: Record<string, string>;
	diagnostics: N8NStartupDiagnostics;
}

function computeEnvironment(options: N8NInstancesOptions): Record<string, string> {
	const {
		mains,
		workers,
		usePostgres,
		baseUrl,
		serviceEnvironment,
		userEnvironment = {},
	} = options;

	const isQueueMode = mains > 1 || workers > 0;

	const env: Record<string, string> = {
		...BASE_ENV,
		...serviceEnvironment,
		...userEnvironment,
	};

	if (!usePostgres) {
		env.DB_TYPE = 'sqlite';
	}

	if (isQueueMode) {
		env.EXECUTIONS_MODE = 'queue';
		env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';

		if (mains > 1) {
			if (!process.env.N8N_LICENSE_ACTIVATION_KEY && !process.env.N8N_LICENSE_CERT) {
				throw new Error(
					'N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT is required for multi-main instances',
				);
			}
			env.N8N_MULTI_MAIN_SETUP_ENABLED = 'true';
		}
	}

	if (mains === 1 && baseUrl && !serviceEnvironment.WEBHOOK_URL) {
		env.WEBHOOK_URL = baseUrl;
		env.N8N_PORT = '5678';
	}

	return env;
}

interface InstanceConfig {
	name: string;
	isWorker: boolean;
	instanceNumber: number;
	networkAlias?: string;
	hostPort?: number;
}

interface SharedConfig {
	projectName: string;
	environment: Record<string, string>;
	network: StartedNetwork;
	resourceQuota?: { memory?: number; cpu?: number };
	filesToMount?: FileToMount[];
}

interface ContainerStartResult {
	container: StartedTestContainer;
	getLogs: () => string;
	getLastReadinessBody: () => string | null;
}

async function createContainer(
	instance: InstanceConfig,
	shared: SharedConfig,
	diagnostics: N8NStartupDiagnostics,
): Promise<ContainerStartResult> {
	const { name, isWorker, instanceNumber, networkAlias, hostPort } = instance;
	const { projectName, environment, network, resourceQuota, filesToMount } = shared;
	const { consumer, throwWithLogs, getLogs } = createSilentLogConsumer();
	const { strategy: waitStrategy, getLastBody: getLastReadinessBody } = createReadinessProbe(
		'/healthz/readiness',
		N8N_READINESS_PORT,
		{ startupTimeoutMs: N8N_STARTUP_TIMEOUT_MS, readTimeoutMs: N8N_READ_TIMEOUT_MS },
	);

	let container = new GenericContainer(N8N_IMAGE)
		.withEnvironment(environment)
		.withLabels({
			'com.docker.compose.project': projectName,
			'com.docker.compose.service': isWorker ? 'n8n-worker' : 'n8n-main',
			instance: instanceNumber.toString(),
		})
		.withPullPolicy(new N8nImagePullPolicy(N8N_IMAGE))
		.withName(name)
		.withLogConsumer(consumer)
		.withReuse()
		.withNetwork(network);

	if (filesToMount?.length) {
		container = container.withCopyContentToContainer(filesToMount);
	}

	if (resourceQuota) {
		container = container.withResourcesQuota(resourceQuota);
	}

	if (networkAlias) {
		container = container.withNetworkAliases(networkAlias);
	}

	const ports: PortWithOptionalBinding[] = hostPort
		? [{ container: N8N_READINESS_PORT, host: hostPort }]
		: [N8N_READINESS_PORT];
	if (isWorker) {
		ports.push(5679);
	}

	container = container.withExposedPorts(...ports).withWaitStrategy(waitStrategy);

	if (isWorker) {
		container = container.withCommand(['worker']);
	}

	try {
		const started = await container.start();
		return { container: started, getLogs, getLastReadinessBody };
	} catch (error: unknown) {
		diagnostics.logs[name] = getLogs();
		diagnostics.readinessPayloads[name] = getLastReadinessBody();

		if (error instanceof Error && 'statusCode' in error) {
			const statusCode = (error as Error & { statusCode: number }).statusCode;
			if (statusCode === 404) {
				throw new DockerImageNotFoundError(name, error);
			}
		}
		console.error(`Container "${name}" failed to start:`, error);
		return throwWithLogs(error);
	}
}

export async function createN8NInstances(
	options: N8NInstancesOptions,
): Promise<N8NInstancesResult> {
	const {
		mains,
		workers,
		projectName,
		network,
		allocatedPort,
		resourceQuota,
		workerResourceQuota,
		filesToMount,
	} = options;

	const log = createElapsedLogger('n8n-instances');
	const environment = computeEnvironment(options);
	const containers: StartedTestContainer[] = [];
	const diagnostics: N8NStartupDiagnostics = { logs: {}, readinessPayloads: {} };

	const mainShared: SharedConfig = {
		projectName,
		environment,
		network,
		resourceQuota,
		filesToMount,
	};

	const workerShared: SharedConfig = {
		projectName,
		environment,
		network,
		resourceQuota: workerResourceQuota ?? resourceQuota,
		filesToMount,
	};

	const instances: InstanceConfig[] = [
		...Array.from({ length: mains }, (_, i) => {
			const num = i + 1;
			const name = mains > 1 ? `${projectName}-n8n-main-${num}` : `${projectName}-n8n`;
			return {
				name,
				isWorker: false,
				instanceNumber: num,
				networkAlias: name,
				hostPort: num === 1 ? allocatedPort : undefined,
			};
		}),
		...Array.from({ length: workers }, (_, i) => ({
			name: `${projectName}-n8n-worker-${i + 1}`,
			isWorker: true,
			instanceNumber: i + 1,
		})),
	];

	// Service-only mode: no n8n containers needed
	if (instances.length === 0) {
		log('No n8n instances requested (service-only mode)');
		return { containers, environment, diagnostics };
	}

	const recordSuccess = (instance: InstanceConfig, result: ContainerStartResult) => {
		diagnostics.logs[instance.name] = result.getLogs();
		diagnostics.readinessPayloads[instance.name] = result.getLastReadinessBody();
	};

	const rethrowWithDiagnostics = (error: unknown): never => {
		const message =
			error instanceof Error ? error.message : `n8n instances failed to start: ${String(error)}`;
		throw new N8NStartupError(message, diagnostics, error);
	};

	// Start main 1 first (handles DB migrations/setup)
	const [main1, ...remaining] = instances;
	log(`Starting main 1: ${main1.name} (DB setup)`);
	let main1Result: ContainerStartResult;
	try {
		main1Result = await createContainer(main1, mainShared, diagnostics);
	} catch (error) {
		return rethrowWithDiagnostics(error);
	}
	recordSuccess(main1, main1Result);
	containers.push(main1Result.container);
	log('main 1 ready');

	// Start remaining instances in parallel
	if (remaining.length > 0) {
		log(`Starting ${remaining.length} remaining instances in parallel...`);
		try {
			const parallelResults = await Promise.all(
				remaining.map(async (instance) => {
					const type = instance.isWorker ? 'worker' : 'main';
					log(`Starting ${type} ${instance.instanceNumber}: ${instance.name}`);
					const result = await createContainer(
						instance,
						instance.isWorker ? workerShared : mainShared,
						diagnostics,
					);
					log(`${type} ${instance.instanceNumber} ready`);
					return { instance, result };
				}),
			);
			for (const { instance, result } of parallelResults) {
				recordSuccess(instance, result);
				containers.push(result.container);
			}
		} catch (error) {
			return rethrowWithDiagnostics(error);
		}
	}

	return { containers, environment, diagnostics };
}
