import type { Readable } from 'stream';

/**
 * Create a logger that prefixes messages with elapsed time since creation
 * @param prefix - Prefix string for log messages (e.g., 'n8n-stack', 'n8n-instances')
 * @returns A log function that outputs messages with elapsed time
 */
export function createElapsedLogger(prefix: string) {
	const startTime = Date.now();

	return (message: string) => {
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`[${prefix} +${elapsed}s] ${message}`);
	};
}

/**
 * Create a log consumer that does not log to the console
 *
 * Logs are collected in memory and can be output on error.
 * When observability is enabled, Vector handles log collection
 * from the Docker socket independently.
 *
 * @returns An object with log consumer and error throwing utilities
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
