import { chmodSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
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

// In-container path that NODE_V8_COVERAGE writes to when coverage collection is
// enabled (via StackConfig.coverageHostDir); bind-mounted to a host subdir.
const CONTAINER_COVERAGE_DIR = '/cov';
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
	/** Dedicated `n8n webhook` procs. Forces queue mode when > 0. */
	webhooks?: number;
	projectName: string;
	network: StartedNetwork;
	serviceEnvironment: Record<string, string>;
	userEnvironment?: Record<string, string>;
	usePostgres: boolean;
	baseUrl?: string;
	allocatedPort?: number;
	resourceQuota?: { memory?: number; cpu?: number };
	workerResourceQuota?: { memory?: number; cpu?: number };
	/** Resource quota for webhook procs. Falls back to `resourceQuota` if omitted. */
	webhookResourceQuota?: { memory?: number; cpu?: number };
	filesToMount?: FileToMount[];
	coverageHostDir?: string;
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
		webhooks = 0,
		usePostgres,
		baseUrl,
		serviceEnvironment,
		userEnvironment = {},
	} = options;

	const isQueueMode = mains > 1 || workers > 0 || webhooks > 0;

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

type InstanceRole = 'main' | 'webhook' | 'worker';

interface InstanceConfig {
	name: string;
	role: InstanceRole;
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
	coverageHostDir?: string;
}

interface ContainerStartResult {
	container: StartedTestContainer;
	getLogs: () => string;
	getLastReadinessBody: () => string | null;
}

const SERVICE_LABEL: Record<InstanceRole, string> = {
	main: 'n8n-main',
	webhook: 'n8n-webhook',
	worker: 'n8n-worker',
};

async function createContainer(
	instance: InstanceConfig,
	shared: SharedConfig,
	diagnostics: N8NStartupDiagnostics,
): Promise<ContainerStartResult> {
	const { name, role, instanceNumber, networkAlias, hostPort } = instance;
	const { projectName, environment, network, resourceQuota, filesToMount, coverageHostDir } =
		shared;
	const { consumer, throwWithLogs, getLogs } = createSilentLogConsumer();
	const { strategy: waitStrategy, getLastBody: getLastReadinessBody } = createReadinessProbe(
		'/healthz/readiness',
		N8N_READINESS_PORT,
		{ startupTimeoutMs: N8N_STARTUP_TIMEOUT_MS, readTimeoutMs: N8N_READ_TIMEOUT_MS },
	);

	const containerEnvironment = coverageHostDir
		? { ...environment, NODE_V8_COVERAGE: CONTAINER_COVERAGE_DIR }
		: environment;

	let container = new GenericContainer(N8N_IMAGE)
		.withEnvironment(containerEnvironment)
		.withLabels({
			'com.docker.compose.project': projectName,
			'com.docker.compose.service': SERVICE_LABEL[role],
			instance: instanceNumber.toString(),
		})
		.withPullPolicy(new N8nImagePullPolicy(N8N_IMAGE))
		.withName(name)
		.withLogConsumer(consumer)
		.withNetwork(network);

	if (coverageHostDir) {
		// Per-container host dir → /cov; n8n flushes V8 here on graceful stop.
		// Reuse must stay off so the process actually exits and flushes.
		const hostCoverageDir = join(coverageHostDir, name);
		mkdirSync(hostCoverageDir, { recursive: true });
		// The n8n container runs as `node` (uid 1000); on Linux CI the bind mount
		// is direct (no Docker Desktop uid mapping), so make the dir writable by
		// the container or NODE_V8_COVERAGE silently fails to flush.
		chmodSync(hostCoverageDir, 0o777);
		container = container.withBindMounts([
			{ source: hostCoverageDir, target: CONTAINER_COVERAGE_DIR, mode: 'rw' },
		]);
	} else {
		container = container.withReuse();
	}

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
	if (role === 'worker') {
		ports.push(5679);
	}

	container = container.withExposedPorts(...ports).withWaitStrategy(waitStrategy);

	if (role === 'worker') {
		container = container.withCommand(['worker']);
	} else if (role === 'webhook') {
		container = container.withCommand(['webhook']);
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
		webhooks = 0,
		projectName,
		network,
		allocatedPort,
		resourceQuota,
		workerResourceQuota,
		webhookResourceQuota,
		filesToMount,
		coverageHostDir,
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
		coverageHostDir,
	};

	const workerShared: SharedConfig = {
		projectName,
		environment,
		network,
		resourceQuota: workerResourceQuota ?? resourceQuota,
		filesToMount,
		coverageHostDir,
	};

	const webhookShared: SharedConfig = {
		projectName,
		environment,
		network,
		resourceQuota: webhookResourceQuota ?? resourceQuota,
		filesToMount,
	};

	const sharedByRole: Record<InstanceRole, SharedConfig> = {
		main: mainShared,
		webhook: webhookShared,
		worker: workerShared,
	};

	const instances: InstanceConfig[] = [
		...Array.from({ length: mains }, (_, i): InstanceConfig => {
			const num = i + 1;
			const name = mains > 1 ? `${projectName}-n8n-main-${num}` : `${projectName}-n8n`;
			return {
				name,
				role: 'main',
				instanceNumber: num,
				networkAlias: name,
				hostPort: num === 1 ? allocatedPort : undefined,
			};
		}),
		...Array.from({ length: webhooks }, (_, i): InstanceConfig => {
			const num = i + 1;
			const name = `${projectName}-n8n-webhook-${num}`;
			return {
				name,
				role: 'webhook',
				instanceNumber: num,
				networkAlias: name,
			};
		}),
		...Array.from(
			{ length: workers },
			(_, i): InstanceConfig => ({
				name: `${projectName}-n8n-worker-${i + 1}`,
				role: 'worker',
				instanceNumber: i + 1,
			}),
		),
	];

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

	// Main 1 handles DB migrations and must finish before parallel starts.
	const [main1, ...remaining] = instances;
	log(`Starting main 1: ${main1.name} (DB setup)`);
	let main1Result: ContainerStartResult;
	try {
		main1Result = await createContainer(main1, sharedByRole[main1.role], diagnostics);
	} catch (error) {
		return rethrowWithDiagnostics(error);
	}
	recordSuccess(main1, main1Result);
	containers.push(main1Result.container);
	log('main 1 ready');

	if (remaining.length > 0) {
		log(`Starting ${remaining.length} remaining instances in parallel...`);
		try {
			const parallelResults = await Promise.all(
				remaining.map(async (instance) => {
					log(`Starting ${instance.role} ${instance.instanceNumber}: ${instance.name}`);
					const result = await createContainer(instance, sharedByRole[instance.role], diagnostics);
					log(`${instance.role} ${instance.instanceNumber} ready`);
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
