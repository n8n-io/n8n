import { setTimeout as wait } from 'node:timers/promises';
import type { Readable } from 'stream';
import type { StartedTestContainer } from 'testcontainers';

/**
 * Create a logger that prefixes messages with elapsed time since creation.
 * Only outputs when CONTAINER_TELEMETRY_VERBOSE=1 is set.
 */
export function createElapsedLogger(prefix: string) {
	const startTime = Date.now();
	const isVerbose = process.env.CONTAINER_TELEMETRY_VERBOSE === '1';

	return (message: string) => {
		if (!isVerbose) return;
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
