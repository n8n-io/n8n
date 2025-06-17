/**
 * n8n Test Containers Setup
 * This file provides a complete n8n container stack for testing with support for:
 * - Single instances (SQLite or PostgreSQL)
 * - Queue mode with Redis
 * - Multi-main instances with nginx load balancing
 * - Parallel execution (multiple stacks running simultaneously)
 *
 * Key features for parallel execution:
 * - Dynamic port allocation to avoid conflicts (handled by testcontainers)
 * - WebSocket support through nginx load balancer
 */

import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Network, Wait } from 'testcontainers';

import {
	setupNginxLoadBalancer,
	setupPostgres,
	setupRedis,
} from './n8n-test-container-dependencies';

// --- Constants ---

const POSTGRES_IMAGE = 'postgres:16-alpine';
const REDIS_IMAGE = 'redis:7-alpine';
const NGINX_IMAGE = 'nginx:stable';
const N8N_E2E_IMAGE = 'n8n-e2e';

// Default n8n image (can be overridden via N8N_DOCKER_IMAGE env var)
const N8N_IMAGE = process.env.N8N_DOCKER_IMAGE ?? N8N_E2E_IMAGE;

// Base environment for all n8n instances
const BASE_ENV: Record<string, string> = {
	N8N_LOG_LEVEL: 'debug',
	N8N_ENCRYPTION_KEY: 'test-encryption-key',
	E2E_TESTS: 'true',
	QUEUE_HEALTH_CHECK_ACTIVE: 'true',
	N8N_DIAGNOSTICS_ENABLED: 'false',
};

// Multi-main license (required for multiple main instances)
const MULTI_MAIN_LICENSE = {
	N8N_LICENSE_TENANT_ID: '1001',
	N8N_LICENSE_ACTIVATION_KEY:
		process.env.N8N_LICENSE_ACTIVATION_KEY ?? '6b68c8e2-2c39-4215-a85f-549ace8f559d',
};

// Wait strategy for n8n containers
const N8N_WAIT_STRATEGY = Wait.forAll([
	Wait.forListeningPorts(),
	Wait.forHttp('/healthz/readiness', 5678).forStatusCode(200).withStartupTimeout(90000),
]);

// --- Interfaces ---

export interface N8NConfig {
	postgres?: boolean;
	queueMode?:
		| boolean
		| {
				mains?: number;
				workers?: number;
		  };
	env?: Record<string, string>;
}

export interface N8NStack {
	baseUrl: string;
	stop: () => Promise<void>;
	containers: StartedTestContainer[];
}

/**
 * Create an n8n container stack
 *
 * @example
 * // Simple SQLite instance
 * const stack = await createN8NStack();
 *
 * @example
 * // PostgreSQL without queue mode
 * const stack = await createN8NStack({ postgres: true });
 *
 * @example
 * // Queue mode (automatically uses PostgreSQL)
 * const stack = await createN8NStack({ queueMode: true });
 *
 * @example
 * // Custom scaling
 * const stack = await createN8NStack({
 * queueMode: { mains: 3, workers: 5 },
 * env: { N8N_ENABLED_MODULES: 'insights' }
 * });
 */
export async function createN8NStack(config: N8NConfig = {}): Promise<N8NStack> {
	const { postgres = false, queueMode = false, env = {} } = config;
	const queueConfig = normalizeQueueConfig(queueMode);
	const usePostgres = postgres || !!queueConfig;
	const uniqueSuffix = `n8n-${Math.random().toString(36).substring(7)}`;
	const containers: StartedTestContainer[] = [];
	let network: StartedNetwork | undefined;
	let nginxContainer: StartedTestContainer | undefined;

	let environment: Record<string, string> = { ...BASE_ENV, ...env };

	if (usePostgres || queueConfig) {
		network = await new Network().start();
	}

	if (usePostgres) {
		const postgresContainer = await setupPostgres(POSTGRES_IMAGE, uniqueSuffix, network!);
		containers.push(postgresContainer.container);
		environment = {
			...environment,
			DB_TYPE: 'postgresdb',
			DB_POSTGRESDB_HOST: 'postgres',
			DB_POSTGRESDB_PORT: '5432',
			DB_POSTGRESDB_DATABASE: postgresContainer.database,
			DB_POSTGRESDB_USER: postgresContainer.username,
			DB_POSTGRESDB_PASSWORD: postgresContainer.password,
		};
	} else {
		environment.DB_TYPE = 'sqlite';
	}

	if (queueConfig) {
		const redis = await setupRedis(REDIS_IMAGE, uniqueSuffix, network!);
		containers.push(redis);
		environment = {
			...environment,
			EXECUTIONS_MODE: 'queue',
			QUEUE_BULL_REDIS_HOST: 'redis',
			QUEUE_BULL_REDIS_PORT: '6379',
		};

		if (queueConfig.mains > 1) {
			environment = {
				...environment,
				N8N_PROXY_HOPS: '1',
				N8N_MULTI_MAIN_SETUP_ENABLED: 'true',
				...MULTI_MAIN_LICENSE,
			};
		}
	}

	let baseUrl: string;

	const instances = await createN8NInstances({
		mainCount: queueConfig?.mains ?? 1,
		workerCount: queueConfig?.workers ?? 0,
		uniqueSuffix,
		environment,
		network,
	});
	containers.push(...instances);

	if (queueConfig && queueConfig.mains > 1) {
		nginxContainer = await setupNginxLoadBalancer(
			NGINX_IMAGE,
			uniqueSuffix,
			instances.slice(0, queueConfig.mains),
			network!,
		);
		containers.push(nginxContainer);
		baseUrl = `http://localhost:${nginxContainer.getMappedPort(80)}`;
	} else {
		baseUrl = `http://localhost:${instances[0].getMappedPort(5678)}`;
	}

	return {
		baseUrl,
		stop: async () => {
			const errors: Error[] = [];
			try {
				const stopPromises = containers.reverse().map(async (container) => {
					try {
						await container.stop();
					} catch (error) {
						errors.push(
							new Error(`Failed to stop container ${container.getId()}: ${error as string}`),
						);
					}
				});
				await Promise.allSettled(stopPromises);

				if (network) {
					try {
						await network.stop();
					} catch (error) {
						errors.push(
							new Error(`Failed to stop network ${network.getName()}: ${error as string}`),
						);
					}
				}

				if (errors.length > 0) {
					console.warn(
						`Some cleanup operations failed for stack ${uniqueSuffix}:`,
						errors.map((e) => e.message).join(', '),
					);
				}
			} catch (error) {
				console.error(`Critical error during cleanup for stack ${uniqueSuffix}:`, error);
				throw error;
			}
		},
		containers,
	};
}

// --- Helper Functions ---

function normalizeQueueConfig(
	queueMode: boolean | { mains?: number; workers?: number },
): { mains: number; workers: number } | null {
	if (!queueMode) return null;
	if (typeof queueMode === 'boolean') {
		return { mains: 1, workers: 1 };
	}
	return {
		mains: queueMode.mains ?? 1,
		workers: queueMode.workers ?? 1,
	};
}

interface CreateInstancesOptions {
	mainCount: number;
	workerCount: number;
	uniqueSuffix: string;
	environment: Record<string, string>;
	network?: StartedNetwork;
}

async function createN8NInstances({
	mainCount,
	workerCount,
	uniqueSuffix,
	environment,
	network,
}: CreateInstancesOptions): Promise<StartedTestContainer[]> {
	const instances: StartedTestContainer[] = [];

	for (let i = 1; i <= mainCount; i++) {
		const name = mainCount > 1 ? `${uniqueSuffix}-n8n-main-${i}` : `${uniqueSuffix}-n8n`;
		const container = await createN8NContainer({
			name,
			uniqueSuffix,
			environment,
			network,
			isWorker: false,
			instanceNumber: i,
			networkAlias: mainCount > 1 ? name : undefined,
		});
		instances.push(container);
	}

	for (let i = 1; i <= workerCount; i++) {
		const name = `${uniqueSuffix}-n8n-worker-${i}`;
		const container = await createN8NContainer({
			name,
			uniqueSuffix,
			environment,
			network: network!,
			isWorker: true,
			instanceNumber: i,
		});
		instances.push(container);
	}

	return instances;
}

interface CreateContainerOptions {
	name: string;
	uniqueSuffix: string;
	environment: Record<string, string>;
	network?: StartedNetwork;
	isWorker: boolean;
	instanceNumber: number;
	networkAlias?: string;
}

async function createN8NContainer({
	name,
	uniqueSuffix,
	environment,
	network,
	isWorker,
	instanceNumber,
	networkAlias,
}: CreateContainerOptions): Promise<StartedTestContainer> {
	let container = new GenericContainer(N8N_IMAGE);

	container = container
		.withEnvironment(environment)
		.withLabels({
			'com.docker.compose.project': uniqueSuffix,
			'com.docker.compose.service': isWorker ? 'n8n-worker' : 'n8n-main',
			instance: instanceNumber.toString(),
		})
		.withName(name)
		.withReuse();

	if (isWorker) {
		container = container.withCommand(['worker']);
	} else {
		container = container.withExposedPorts(5678).withWaitStrategy(N8N_WAIT_STRATEGY);
	}

	if (network) {
		container = container.withNetwork(network);
		if (networkAlias) {
			container = container.withNetworkAliases(networkAlias);
		}
	}

	return await container.start();
}
