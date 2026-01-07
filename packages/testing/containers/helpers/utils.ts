import { setTimeout as wait } from 'node:timers/promises';
import type { Readable } from 'stream';
import type { StartedTestContainer } from 'testcontainers';

/**
 * Create a logger that prefixes messages with elapsed time since creation.
 */
export function createElapsedLogger(prefix: string) {
	const startTime = Date.now();

	return (message: string) => {
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`[${prefix} +${elapsed}s] ${message}`);
	};
}

/**
 * Create a log consumer that does not log to the console.
 * Logs are collected in memory and can be output on error.
 */
export function createSilentLogConsumer() {
	const logs: string[] = [];

	const consumer = (stream: Readable) => {
		stream.on('data', (chunk: Buffer | string) => {
			logs.push(chunk.toString().trim());
		});
	};

	const throwWithLogs = (error: unknown): never => {
		if (logs.length > 0) {
			console.error('\n--- Container Logs ---');
			console.error(logs.join('\n'));
			console.error('---------------------\n');
		}
		throw error;
	};

	return { consumer, throwWithLogs };
}

/**
 * Polls a container's HTTP endpoint until it returns a 200 status.
 * Logs a warning if the endpoint does not return 200 within the specified timeout.
 *
 * @param container The started container.
 * @param endpoint The HTTP health check endpoint (e.g., '/healthz/readiness').
 * @param timeoutMs Total timeout in milliseconds (default: 60,000ms).
 */
export async function pollContainerHttpEndpoint(
	container: StartedTestContainer,
	endpoint: string,
	timeoutMs: number = 60000,
): Promise<void> {
	const startTime = Date.now();
	const url = `http://${container.getHost()}:${container.getFirstMappedPort()}${endpoint}`;
	const retryIntervalMs = 1000;

	while (Date.now() - startTime < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.status === 200) {
				return;
			}
		} catch {
			// Don't log errors, just retry
		}

		await wait(retryIntervalMs);
	}

	console.error(
		`WARNING: HTTP endpoint at ${url} did not return 200 within ${
			timeoutMs / 1000
		} seconds. Proceeding with caution.`,
	);
}

// --- Resource Quota Utilities ---

type ResourceQuota = { memory?: number; cpu?: number };

/**
 * Parse a resource quota from specific environment variables.
 * @internal
 */
function parseResourceQuota(
	memoryEnvVar: string | undefined,
	cpuEnvVar: string | undefined,
): ResourceQuota | undefined {
	if (!memoryEnvVar && !cpuEnvVar) {
		return undefined;
	}

	const quota: ResourceQuota = {};

	if (memoryEnvVar) {
		const parsed = parseFloat(memoryEnvVar);
		if (!Number.isNaN(parsed) && parsed > 0) {
			// Round to avoid Docker API issues with non-integer byte values
			quota.memory = Math.round(parsed * 100) / 100;
		}
	}

	if (cpuEnvVar) {
		const parsed = parseFloat(cpuEnvVar);
		if (!Number.isNaN(parsed) && parsed > 0) {
			quota.cpu = parsed;
		}
	}

	return Object.keys(quota).length > 0 ? quota : undefined;
}

/**
 * Parse resource quota from environment variables.
 * Returns undefined if no limits are set.
 *
 * Environment variables:
 * - N8N_MEMORY_LIMIT: Memory limit in GB (e.g., "0.5" for 512MB)
 * - N8N_CPU_LIMIT: CPU limit in cores (e.g., "0.5" for half a core)
 *
 * @example
 * // Run tests with constrained resources to trigger race conditions:
 * // N8N_MEMORY_LIMIT=0.5 N8N_CPU_LIMIT=0.5 pnpm test:container:queue
 */
export function getResourceQuotaFromEnv(): ResourceQuota | undefined {
	return parseResourceQuota(process.env.N8N_MEMORY_LIMIT, process.env.N8N_CPU_LIMIT);
}

/**
 * Parse main instance resource quota from environment variables.
 * Returns undefined if no limits are set.
 *
 * Environment variables:
 * - N8N_MAIN_MEMORY_LIMIT: Memory limit in GB for main instances
 * - N8N_MAIN_CPU_LIMIT: CPU limit in cores for main instances
 *
 * @example
 * // Constrain only main to reproduce CAT-1437 race condition:
 * // N8N_MAIN_MEMORY_LIMIT=0.5 N8N_MAIN_CPU_LIMIT=0.5 pnpm test:container:queue
 */
export function getMainResourceQuotaFromEnv(): ResourceQuota | undefined {
	return parseResourceQuota(process.env.N8N_MAIN_MEMORY_LIMIT, process.env.N8N_MAIN_CPU_LIMIT);
}

/**
 * Parse worker instance resource quota from environment variables.
 * Returns undefined if no limits are set.
 *
 * Environment variables:
 * - N8N_WORKER_MEMORY_LIMIT: Memory limit in GB for worker instances
 * - N8N_WORKER_CPU_LIMIT: CPU limit in cores for worker instances
 *
 * @example
 * // Constrain only workers:
 * // N8N_WORKER_MEMORY_LIMIT=0.5 N8N_WORKER_CPU_LIMIT=0.5 pnpm test:container:queue
 */
export function getWorkerResourceQuotaFromEnv(): ResourceQuota | undefined {
	return parseResourceQuota(process.env.N8N_WORKER_MEMORY_LIMIT, process.env.N8N_WORKER_CPU_LIMIT);
}
