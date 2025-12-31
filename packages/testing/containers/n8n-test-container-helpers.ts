import { setTimeout as wait } from 'node:timers/promises';
import type { StartedTestContainer, StoppedTestContainer } from 'testcontainers';

import {
	getMailpitApiBaseUrl,
	mailpitWaitForMessage,
	mailpitList,
	mailpitClear,
	mailpitGet,
	type MailpitQuery,
	type MailpitMessage,
	type MailpitMessageSummary,
} from './n8n-test-container-mailpit';
import type { ObservabilityStack } from './n8n-test-container-observability';
import { VictoriaLogsHelper, escapeLogsQL } from './n8n-test-container-victoria-helpers';

export interface LogMatch {
	container: StartedTestContainer;
	containerName: string;
	message: string;
	timestamp: Date;
}

interface WaitForLogOptions {
	namePattern?: string | RegExp;
	timeoutMs?: number;
	caseSensitive?: boolean;
	throwOnTimeout?: boolean;
}

interface StreamLogMatch {
	line: string;
	date: Date | null;
}

interface ContainerTestHelpersOptions {
	/** Observability stack for enhanced log queries */
	observability?: ObservabilityStack;
}

/**
 * Container helpers bound to a specific set of containers
 */
export class ContainerTestHelpers {
	private static readonly DEFAULT_TIMEOUT_MS = 30000;

	private static readonly POLL_INTERVAL_MS = 1000;

	// Containers
	private containers: StartedTestContainer[];

	private _mailHelper?: MailHelper;

	private observability?: ObservabilityStack;

	private victoriaLogs?: VictoriaLogsHelper;

	constructor(containers: StartedTestContainer[], options?: ContainerTestHelpersOptions) {
		this.containers = containers;
		this.observability = options?.observability;
		if (this.observability) {
			this.victoriaLogs = VictoriaLogsHelper.from(this.observability.victoriaLogs);
		}
	}

	/**
	 * Mail helper facade for Mailpit interactions
	 */
	get mail(): MailHelper {
		this._mailHelper ??= new MailHelper(this.containers);
		return this._mailHelper;
	}

	/**
	 * Read logs from a container
	 */
	async readLogs(containerNamePattern: string | RegExp, since?: number): Promise<string> {
		const container = this.findContainers(containerNamePattern)[0];
		if (!container) {
			console.warn(`No container found matching pattern: ${containerNamePattern}`);
			return '';
		}

		return await this.readLogsFromContainer(container, since);
	}

	/**
	 * Wait for a log message matching pattern (case-insensitive by default)
	 * Uses VictoriaLogs when observability is enabled, otherwise uses container log streaming
	 *
	 * @returns LogMatch if found, null if timeout reached and throwOnTimeout is false
	 * @throws Error if timeout reached and throwOnTimeout is true (default)
	 */
	async waitForLog(
		messagePattern: string | RegExp,
		options: WaitForLogOptions = {},
	): Promise<LogMatch | null> {
		const {
			namePattern,
			timeoutMs = ContainerTestHelpers.DEFAULT_TIMEOUT_MS,
			caseSensitive = false,
			throwOnTimeout = true,
		} = options;

		// Use VictoriaLogs when available for faster and more reliable log queries
		if (this.victoriaLogs) {
			return await this.waitForLogViaVictoriaLogs(
				messagePattern,
				namePattern,
				timeoutMs,
				throwOnTimeout,
				caseSensitive,
			);
		}

		// Fallback to container log streaming
		const messageRegex = this.createRegex(messagePattern, caseSensitive);
		const targetContainers = namePattern ? this.findContainers(namePattern) : this.containers;
		const startTime = Date.now();

		console.log(
			`🔍 Waiting for log pattern: ${messageRegex} in ${targetContainers.length} containers (timeout: ${timeoutMs}ms, throwOnTimeout: ${throwOnTimeout})`,
		);

		// First check: scan existing logs quickly
		const existingMatch = await this.findFirstMatchingLog(targetContainers, messageRegex);
		if (existingMatch) {
			console.log(`✅ Found existing log in ${existingMatch.containerName}`);
			return existingMatch;
		}

		// Monitor new logs with streaming approach
		return await this.pollForNewLogs(
			targetContainers,
			messageRegex,
			startTime,
			timeoutMs,
			throwOnTimeout,
		);
	}

	/**
	 * Wait for log via VictoriaLogs (faster and more reliable than container streaming)
	 */
	private async waitForLogViaVictoriaLogs(
		messagePattern: string | RegExp,
		namePattern: string | RegExp | undefined,
		timeoutMs: number,
		throwOnTimeout: boolean,
		caseSensitive: boolean,
	): Promise<LogMatch | null> {
		const patternStr = typeof messagePattern === 'string' ? messagePattern : messagePattern.source;
		// LogsQL regex is case-sensitive by default; use (?i) prefix for case-insensitive
		const regexPrefix = caseSensitive ? '' : '(?i)';

		// Build LogsQL query - search for the pattern in the message field
		// If namePattern is provided, also filter by container name
		// Escape special characters to prevent query injection
		let query = `_msg:~"${regexPrefix}${escapeLogsQL(patternStr)}"`;
		if (namePattern) {
			const containerPattern = typeof namePattern === 'string' ? namePattern : namePattern.source;
			query = `container:~"${regexPrefix}${escapeLogsQL(containerPattern)}" AND ${query}`;
		}

		console.log(
			`🔍 [VictoriaLogs] Waiting for log pattern: ${patternStr} (timeout: ${timeoutMs}ms)`,
		);

		const logEntry = await this.victoriaLogs!.waitForLog(query, {
			timeoutMs,
		});

		if (logEntry) {
			// Find the matching container for the LogMatch response
			const containerName = logEntry.container ?? 'unknown';
			const matchingContainer = this.containers.find((c) => c.getName().includes(containerName));

			console.log(`✅ [VictoriaLogs] Found log in container: ${containerName}`);

			return {
				container: matchingContainer ?? this.containers[0],
				containerName,
				message: logEntry.message,
				timestamp: new Date(logEntry._time),
			};
		}

		console.log(`❌ [VictoriaLogs] Timeout reached after ${timeoutMs}ms`);

		if (throwOnTimeout) {
			throw new Error(`Timeout waiting for log pattern: ${patternStr} after ${timeoutMs}ms`);
		}

		return null;
	}

	/**
	 * Find the first matching log across multiple containers
	 */
	private async findFirstMatchingLog(
		containers: StartedTestContainer[],
		messageRegex: RegExp,
		sinceTimestamp?: number,
	): Promise<LogMatch | null> {
		const matchPromises = containers.map(async (container) => {
			const match = await this.findLogInContainer(container, messageRegex, sinceTimestamp);
			if (match) {
				return {
					container,
					containerName: container.getName(),
					message: match.line,
					timestamp: match.date ?? new Date(),
				};
			}
			return null;
		});

		const results = await Promise.all(matchPromises);
		return results.find((result) => result !== null) ?? null;
	}

	/**
	 * Poll containers for new logs matching the pattern
	 */
	private async pollForNewLogs(
		targetContainers: StartedTestContainer[],
		messageRegex: RegExp,
		startTime: number,
		timeoutMs: number,
		throwOnTimeout: boolean,
	): Promise<LogMatch | null> {
		let currentCheckTime = Math.floor(Date.now() / 1000);
		let iteration = 0;

		while (Date.now() - startTime < timeoutMs) {
			iteration++;
			await wait(ContainerTestHelpers.POLL_INTERVAL_MS);

			// Capture the timestamp for this iteration to avoid race conditions
			const checkTimestamp = currentCheckTime;

			// Check all containers concurrently
			const matchPromises = targetContainers.map(
				async (container) =>
					await this.checkContainerForMatch(container, messageRegex, checkTimestamp),
			);

			const results = await Promise.all(matchPromises);
			const found = results.find((result) => result !== null);

			if (found) {
				console.log(`✅ Found new log in ${found.containerName} (iteration ${iteration})`);
				return found;
			}

			// Update timestamp for next iteration
			currentCheckTime = Math.floor(Date.now() / 1000);

			// Progress indicator
			if (iteration % 10 === 0) {
				const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
				console.log(`⏱️ Still waiting... (${elapsedSeconds}s elapsed)`);
			}
		}

		console.log(`❌ Timeout reached after ${timeoutMs}ms`);

		if (throwOnTimeout) {
			throw new Error(`Timeout reached after ${timeoutMs}ms`);
		}

		return null;
	}

	/**
	 * Check a single container for matching logs
	 */
	private async checkContainerForMatch(
		container: StartedTestContainer,
		messageRegex: RegExp,
		sinceTimestamp: number,
	): Promise<LogMatch | null> {
		const match = await this.findLogInContainer(container, messageRegex, sinceTimestamp);

		if (!match) {
			return null;
		}

		return {
			container,
			containerName: container.getName(),
			message: match.line,
			timestamp: match.date ?? new Date(),
		};
	}

	/**
	 * Get all log messages matching pattern (case-insensitive by default)
	 */
	async getLogs(
		messagePattern: string | RegExp,
		namePattern?: string | RegExp,
		caseSensitive = false,
	): Promise<LogMatch[]> {
		const messageRegex = this.createRegex(messagePattern, caseSensitive);
		const targetContainers = namePattern ? this.findContainers(namePattern) : this.containers;

		console.log(
			`🔍 Getting all logs matching: ${messageRegex} from ${targetContainers.length} containers`,
		);

		const logPromises = targetContainers.map(async (container) => {
			const logs = await this.readLogsFromContainer(container);
			return this.findAllLogMatches(logs, messageRegex, container);
		});

		const results = await Promise.all(logPromises);
		const matches = results.flat();

		console.log(`📈 Total matches found: ${matches.length}`);
		return matches;
	}

	/**
	 * Find containers by name pattern
	 */
	findContainers(namePattern: string | RegExp): StartedTestContainer[] {
		const regex = typeof namePattern === 'string' ? new RegExp(namePattern) : namePattern;
		const foundContainers = this.containers.filter((container) => regex.test(container.getName()));

		console.log(`🔎 Found ${foundContainers.length} containers matching pattern`);
		return foundContainers;
	}

	/**
	 * Stop container by name pattern
	 */
	async stopContainer(namePattern: string | RegExp): Promise<StoppedTestContainer | null> {
		const container = this.findContainers(namePattern)[0];
		return container ? await container.stop() : null;
	}

	// Private helper methods

	private createRegex(pattern: string | RegExp, caseSensitive: boolean): RegExp {
		return typeof pattern === 'string' ? new RegExp(pattern, caseSensitive ? 'g' : 'gi') : pattern;
	}

	/**
	 * Strip ANSI escape codes from log text
	 */
	private stripAnsiCodes(text: string): string {
		// eslint-disable-next-line no-control-regex
		return text.replace(/\x1B\[[0-9;]*[mGKH]/g, '');
	}

	/**
	 * Extract timestamp from log line
	 */
	private extractTimestamp(line: string): Date | null {
		const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
		return timestampMatch ? new Date(timestampMatch[1]) : null;
	}

	/**
	 * Find log line in container using streaming approach with early exit
	 */
	private async findLogInContainer(
		container: StartedTestContainer,
		messageRegex: RegExp,
		since?: number,
	): Promise<StreamLogMatch | null> {
		try {
			const logOptions: { since?: number } = {};
			if (since !== undefined) {
				logOptions.since = since;
			}

			const stream = await container.logs(logOptions);

			return await new Promise((resolve, reject) => {
				let buffer = '';

				const timeout = setTimeout(() => {
					stream.destroy();
					resolve(null); // Timeout means no match found
				}, 5000); // Shorter timeout for individual container checks

				const onData = (chunk: Buffer | string) => {
					buffer += chunk.toString();
					const lines = buffer.split('\n');

					// Keep the last incomplete line in buffer
					buffer = lines.pop() ?? '';

					// Check complete lines
					for (const line of lines) {
						const cleanLine = this.stripAnsiCodes(line.trim());
						if (cleanLine && messageRegex.test(cleanLine)) {
							clearTimeout(timeout);
							stream.destroy();
							resolve({
								line: cleanLine,
								date: this.extractTimestamp(cleanLine),
							});
							return;
						}
					}
				};

				stream.on('data', onData);

				stream.on('end', () => {
					clearTimeout(timeout);
					stream.destroy();
					resolve(null); // No match found
				});

				stream.on('error', (error) => {
					clearTimeout(timeout);
					stream.destroy();
					console.error(`❌ Stream error from ${container.getName()}:`, error);
					reject(error);
				});
			});
		} catch (error) {
			console.warn(`❌ Failed to search logs from ${container.getName()}: ${error as string}`);
			return null;
		}
	}

	private async readLogsFromContainer(
		container: StartedTestContainer,
		since?: number,
	): Promise<string> {
		try {
			const logOptions: { since?: number } = {};
			if (since !== undefined) {
				logOptions.since = since;
			}

			const stream = await container.logs(logOptions);
			let allData = '';

			return await new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					stream.destroy();
					reject(new Error('Log read timeout'));
				}, 10000);

				stream.on('data', (chunk: Buffer | string) => {
					allData += chunk.toString();
				});

				stream.on('end', () => {
					clearTimeout(timeout);
					stream.destroy();
					resolve(this.stripAnsiCodes(allData));
				});

				stream.on('error', (error) => {
					clearTimeout(timeout);
					stream.destroy();
					console.error(`❌ Stream error from ${container.getName()}:`, error);
					reject(error);
				});
			});
		} catch (error) {
			console.warn(`❌ Failed to read logs from ${container.getName()}: ${error as string}`);
			return '';
		}
	}

	private findAllLogMatches(
		logs: string,
		messageRegex: RegExp,
		container: StartedTestContainer,
	): LogMatch[] {
		const lines = logs.split('\n').filter((line) => line.trim());
		const matches: LogMatch[] = [];

		for (const line of lines) {
			const cleanLine = line.trim();
			if (messageRegex.test(cleanLine)) {
				matches.push({
					container,
					containerName: container.getName(),
					message: cleanLine,
					timestamp: this.extractTimestamp(cleanLine) ?? new Date(),
				});
			}
		}

		return matches;
	}
}

class MailHelper {
	constructor(private containers: StartedTestContainer[]) {}

	private getMailpitContainer(): StartedTestContainer {
		const container = this.containers.find((c) => /mailpit/i.test(c.getName()));
		if (!container) throw new Error('Mailpit container not found');
		return container;
	}

	private get apiBaseUrl(): string {
		const mailpit = this.getMailpitContainer();
		return getMailpitApiBaseUrl(mailpit);
	}

	async waitForMessage(
		query: MailpitQuery,
		options?: { timeoutMs?: number; pollMs?: number },
	): Promise<MailpitMessageSummary> {
		return await mailpitWaitForMessage(this.apiBaseUrl, query, options);
	}

	async list(): Promise<MailpitMessageSummary[]> {
		return await mailpitList(this.apiBaseUrl);
	}

	async clear(): Promise<void> {
		await mailpitClear(this.apiBaseUrl);
	}

	async get(id: string): Promise<MailpitMessage> {
		return await mailpitGet(this.apiBaseUrl, id);
	}
}
