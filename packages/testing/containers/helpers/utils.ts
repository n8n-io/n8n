import { setTimeout as wait } from 'node:timers/promises';
import type { Readable } from 'stream';
import type { StartedTestContainer } from 'testcontainers';
import { Wait } from 'testcontainers';

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

	const getLogs = (): string => logs.join('\n');

	return { consumer, throwWithLogs, getLogs };
}

export function createReadinessProbe(
	path: string,
	port: number,
	options: { startupTimeoutMs: number; readTimeoutMs: number },
) {
	let lastBody: string | null = null;

	// Body predicate must be registered before status predicate: HttpWaitStrategy
	// short-circuits on the first `false`, so a status-first order would skip the
	// body capture for the non-200 responses we want to record.
	const strategy = Wait.forHttp(path, port)
		.forResponsePredicate((body) => {
			lastBody = body;
			return true;
		})
		.forStatusCode(200)
		.withStartupTimeout(options.startupTimeoutMs)
		.withReadTimeout(options.readTimeoutMs);

	return {
		strategy,
		getLastBody: (): string | null => lastBody,
	};
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

/**
 * Waits until a container's logs have matched every pattern in `patterns` at
 * least once. Throws on timeout, since callers use this to establish a
 * precondition rather than to observe one.
 *
 * @param container The started container.
 * @param patterns The patterns to look for. Each must match at least one line.
 * @param options.since Unix timestamp in seconds. Only lines logged from then on
 * count. A reused container carries the logs of the run before it, so a caller
 * whose precondition must hold for the current run has to pass this.
 * @param options.timeoutMs Total timeout in milliseconds (default: 60,000ms).
 */
export async function waitForContainerLogMessages(
	container: StartedTestContainer,
	patterns: RegExp[],
	options: { since?: number; timeoutMs?: number } = {},
): Promise<void> {
	const { since = 0, timeoutMs = 60000 } = options;
	const stream = await container.logs({ since });
	const pending = new Set(patterns);

	try {
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				const missing = [...pending].map(String).join(', ');
				reject(
					new Error(
						`Container ${container.getName()} did not log ${missing} within ${timeoutMs / 1000} seconds`,
					),
				);
			}, timeoutMs);

			const finish = (error?: Error) => {
				clearTimeout(timer);
				if (error) reject(error);
				else resolve();
			};

			let partialLine = '';
			stream.on('data', (chunk: Buffer | string) => {
				// A chunk can split a line, so hold the trailing fragment back until
				// the rest of it arrives.
				const lines = (partialLine + chunk.toString()).split('\n');
				partialLine = lines.pop() ?? '';
				for (const line of lines) {
					for (const pattern of pending) {
						if (pattern.test(line)) pending.delete(pattern);
					}
					if (pending.size === 0) {
						finish();
						return;
					}
				}
			});
			stream.on('error', finish);
		});
	} finally {
		stream.destroy();
	}
}
