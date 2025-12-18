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

export interface VictoriaLogsForwarderOptions {
	/** HTTP endpoint for VictoriaLogs JSON line ingestion */
	endpoint: string;
	/** Container name for log labeling */
	containerName: string;
	/** Additional labels to attach to logs */
	labels?: Record<string, string>;
}

export interface VictoriaLogsForwarderResult {
	/** Log consumer function for testcontainers */
	consumer: (stream: Readable) => void;
	/** Throw an error with accumulated logs */
	throwWithLogs: (error: unknown) => never;
	/** Get error statistics */
	getStats: () => { consecutiveErrors: number; totalErrors: number; totalLogs: number };
}

/**
 * Create a log consumer that forwards container logs to VictoriaLogs via HTTP
 *
 * This forwards container stdout/stderr to VictoriaLogs using the JSON line
 * ingestion endpoint. Logs are batched and sent asynchronously to avoid
 * blocking the container.
 */
export function createVictoriaLogsForwarder(
	options: VictoriaLogsForwarderOptions,
): VictoriaLogsForwarderResult {
	const { endpoint, containerName, labels = {} } = options;
	const logs: string[] = [];
	let consecutiveErrors = 0;
	let totalErrors = 0;
	let totalLogs = 0;
	let firstErrorLogged = false;

	const sendLog = async (message: string) => {
		const logEntry = {
			_time: new Date().toISOString(),
			_msg: message,
			container: containerName,
			...labels,
		};

		try {
			const response = await fetch(`${endpoint}/insert/jsonline`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(logEntry),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${await response.text()}`);
			}

			consecutiveErrors = 0;
			totalLogs++;
		} catch (error) {
			consecutiveErrors++;
			totalErrors++;

			// Log first error, then every 10th to avoid spam
			if (!firstErrorLogged || totalErrors % 10 === 0) {
				console.warn(
					`[VictoriaLogsForwarder] Failed to forward logs for ${containerName}: ${error instanceof Error ? error.message : error}`,
				);
				firstErrorLogged = true;
			}
		}
	};

	const consumer = (stream: Readable) => {
		stream.on('data', (chunk: Buffer | string) => {
			const message = chunk.toString().trim();
			if (message) {
				logs.push(message);
				// Fire and forget - don't await to avoid blocking
				void sendLog(message);
			}
		});
	};

	const throwWithLogs = (error: unknown): never => {
		if (logs.length > 0) {
			console.error(`\n--- Container Logs (${containerName}) ---`);
			console.error(logs.join('\n'));
			console.error('---------------------\n');
		}
		throw error;
	};

	const getStats = () => ({
		consecutiveErrors,
		totalErrors,
		totalLogs,
	});

	return { consumer, throwWithLogs, getStats };
}

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
