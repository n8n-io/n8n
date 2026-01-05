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
