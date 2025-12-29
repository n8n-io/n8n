/**
 * n8n Container Service
 *
 * Handles creation of n8n main and worker containers with all environment
 * configuration for different modes (single, queue, multi-main).
 */

import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { getDockerImageFromEnv } from '../docker-image';
import { DockerImageNotFoundError } from '../docker-image-not-found-error';
import { createElapsedLogger, createSilentLogConsumer } from '../helpers/utils';
import { N8nImagePullPolicy } from '../n8n-image-pull-policy';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { ContentInjection } from './types';

// ============================================================================
// Constants
// ============================================================================

const N8N_IMAGE = getDockerImageFromEnv(TEST_CONTAINER_IMAGES.n8n);

/** Base environment for all n8n instances (includes task runner - always enabled). */
const BASE_ENV: Record<string, string> = {
	// Core settings
	N8N_LOG_LEVEL: 'debug',
	N8N_ENCRYPTION_KEY: process.env.N8N_ENCRYPTION_KEY ?? 'test-encryption-key',
	E2E_TESTS: 'false',
	QUEUE_HEALTH_CHECK_ACTIVE: 'true',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	N8N_METRICS: 'true',
	NODE_ENV: 'development',
	N8N_DYNAMIC_BANNERS_ENABLED: 'false',
	// License
	N8N_LICENSE_TENANT_ID: process.env.N8N_LICENSE_TENANT_ID ?? '1001',
	N8N_LICENSE_ACTIVATION_KEY: process.env.N8N_LICENSE_ACTIVATION_KEY ?? '',
	N8N_LICENSE_CERT: process.env.N8N_LICENSE_CERT ?? '',
	// Task runner (always enabled)
	N8N_RUNNERS_ENABLED: 'true',
	N8N_RUNNERS_MODE: 'external',
	N8N_RUNNERS_AUTH_TOKEN: 'test',
	N8N_RUNNERS_BROKER_LISTEN_ADDRESS: '0.0.0.0',
};

const MAIN_WAIT_STRATEGY = Wait.forAll([
	Wait.forListeningPorts(),
	Wait.forHttp('/healthz/readiness', 5678).forStatusCode(200).withStartupTimeout(30000),
	Wait.forLogMessage('Editor is now accessible via').withStartupTimeout(30000),
]);

const WORKER_WAIT_STRATEGY = Wait.forAll([
	Wait.forListeningPorts(),
	Wait.forLogMessage('n8n worker is now ready').withStartupTimeout(30000),
]);

// ============================================================================
// Types
// ============================================================================

/** Options for creating n8n instances. */
export interface N8NInstancesOptions {
	mains: number;
	workers: number;
	projectName: string;
	network: StartedNetwork;
	/** Environment from services (merged with BASE_ENV) */
	serviceEnvironment: Record<string, string>;
	/** User-provided environment overrides */
	userEnvironment?: Record<string, string>;
	usePostgres: boolean;
	/** Base URL for webhooks (single instance mode) */
	baseUrl?: string;
	/** Port for single-instance direct binding */
	allocatedPort?: number;
	resourceQuota?: { memory?: number; cpu?: number };
	/** Content to inject into containers (e.g., certs) */
	contentToInject?: ContentInjection[];
}

/** Result from creating n8n instances. */
export interface N8NInstancesResult {
	containers: StartedTestContainer[];
	environment: Record<string, string>;
}

// ============================================================================
// Environment Computation
// ============================================================================

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
			if (!process.env.N8N_LICENSE_ACTIVATION_KEY) {
				throw new Error('N8N_LICENSE_ACTIVATION_KEY is required for multi-main instances');
			}
			env.N8N_MULTI_MAIN_SETUP_ENABLED = 'true';
		}
	}

	// Single instance: set webhook URL
	if (mains === 1 && baseUrl) {
		env.WEBHOOK_URL = baseUrl;
		env.N8N_PORT = '5678';
	}

	return env;
}

// ============================================================================
// Container Creation
// ============================================================================

interface InstanceConfig {
	name: string;
	isWorker: boolean;
	instanceNumber: number;
	networkAlias?: string;
	/** Host port binding (single-instance main only) */
	hostPort?: number;
}

interface SharedConfig {
	projectName: string;
	environment: Record<string, string>;
	network: StartedNetwork;
	resourceQuota?: { memory?: number; cpu?: number };
	contentToInject?: ContentInjection[];
}

async function createContainer(
	instance: InstanceConfig,
	shared: SharedConfig,
): Promise<StartedTestContainer> {
	const { name, isWorker, instanceNumber, networkAlias, hostPort } = instance;
	const { projectName, environment, network, resourceQuota, contentToInject } = shared;
	const { consumer, throwWithLogs } = createSilentLogConsumer();

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

	if (contentToInject?.length) {
		container = container.withCopyContentToContainer(contentToInject);
	}

	if (resourceQuota) {
		container = container.withResourcesQuota(resourceQuota);
	}

	if (networkAlias) {
		container = container.withNetworkAliases(networkAlias);
	}

	// Configure ports and wait strategy
	const waitStrategy = isWorker ? WORKER_WAIT_STRATEGY : MAIN_WAIT_STRATEGY;
	const ports = hostPort ? [{ container: 5678, host: hostPort }, 5679] : [5678, 5679];

	container = container.withExposedPorts(...ports).withWaitStrategy(waitStrategy);

	if (isWorker) {
		container = container.withCommand(['worker']);
	}

	try {
		return await container.start();
	} catch (error: unknown) {
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

// ============================================================================
// Public API
// ============================================================================

/**
 * Create n8n main and worker instances.
 */
export async function createN8NInstances(
	options: N8NInstancesOptions,
): Promise<N8NInstancesResult> {
	const { mains, workers, projectName, network, allocatedPort, resourceQuota, contentToInject } =
		options;

	const log = createElapsedLogger('n8n-instances');
	const environment = computeEnvironment(options);
	const containers: StartedTestContainer[] = [];

	const shared: SharedConfig = {
		projectName,
		environment,
		network,
		resourceQuota,
		contentToInject,
	};

	// Build instance configs
	const instances: InstanceConfig[] = [
		// Main instances
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
		// Worker instances
		...Array.from({ length: workers }, (_, i) => ({
			name: `${projectName}-n8n-worker-${i + 1}`,
			isWorker: true,
			instanceNumber: i + 1,
		})),
	];

	// Create containers sequentially (order matters for startup)
	for (const instance of instances) {
		const type = instance.isWorker ? 'worker' : 'main';
		log(`Starting ${type} ${instance.instanceNumber}: ${instance.name}`);
		containers.push(await createContainer(instance, shared));
		log(`${type} ${instance.instanceNumber} ready`);
	}

	return { containers, environment };
}
