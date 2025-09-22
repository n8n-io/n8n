import type { Readable } from 'stream';

/**
 * Create a log consumer that does not log to the console
 * @returns A tuple containing the log consumer and a function to throw an error with logs
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
 * Parse resource quota from environment variables
 * Returns undefined if no limits are set
 */
export function getResourceQuotaFromEnv(): { memory?: number; cpu?: number } | undefined {
	const memoryLimit = process.env.N8N_MEMORY_LIMIT;
	const cpuLimit = process.env.N8N_CPU_LIMIT;

	if (!memoryLimit && !cpuLimit) {
		return undefined;
	}

	const quota: { memory?: number; cpu?: number } = {};

	if (memoryLimit) {
		quota.memory = parseFloat(memoryLimit);
	}

	if (cpuLimit) {
		quota.cpu = parseFloat(cpuLimit);
	}

	return quota;
}
