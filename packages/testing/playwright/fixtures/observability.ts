import type { Fixtures, TestInfo } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/stack';

/**
 * Fixture type for auto-attaching logs on test failure.
 * Uses undefined instead of void to satisfy eslint @typescript-eslint/no-invalid-void-type
 */
export type ObservabilityTestFixtures = {
	autoAttachLogs: undefined;
};

/**
 * Worker fixtures required by observability fixtures.
 */
export type ObservabilityWorkerFixtures = {
	n8nContainer: N8NStack;
};

/**
 * Queries VictoriaLogs and attaches logs to test info on failure.
 * Retrieves logs from the last 5 minutes to capture test context.
 */
async function attachLogsOnFailure(
	stack: N8NStack,
	testInfo: TestInfo,
	options: { lookbackMinutes?: number } = {},
): Promise<void> {
	// Use the observability service helper if available
	const obs = stack.services?.observability;
	if (!obs) return;

	const lookback = options.lookbackMinutes ?? 5;

	try {
		// Query all logs from the last N minutes
		const logs = await obs.logs.query('*', {
			limit: 1000,
			start: `${lookback}m`,
		});

		if (logs.length === 0) return;

		// Group logs by container for readability
		const groupedLogs = logs.reduce<Record<string, typeof logs>>((acc, log) => {
			const container = log.container_name ?? 'unknown';
			acc[container] ??= [];
			acc[container].push(log);
			return acc;
		}, {});

		// Sort logs within each container by timestamp
		for (const containerLogs of Object.values(groupedLogs)) {
			containerLogs.sort((a, b) => (a._time ?? '').localeCompare(b._time ?? ''));
		}

		// Format logs for attachment (containers sorted alphabetically)
		const formattedLogs = Object.entries(groupedLogs)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([container, containerLogs]) => {
				const logLines = containerLogs.map((log) => `[${log._time}] ${log.message}`).join('\n');
				return `=== ${container} ===\n${logLines}`;
			})
			.join('\n\n');

		await testInfo.attach('container-logs', {
			body: formattedLogs,
			contentType: 'text/plain',
		});
	} catch (error) {
		// Don't fail the test if log collection fails
		console.warn('Failed to collect container logs:', error);
	}
}

/**
 * Observability fixtures that can be spread into the main test fixtures.
 * Provides auto-attachment of container logs on test failure.
 *
 * Usage in base.ts:
 * ```typescript
 * import { observabilityFixtures } from './observability';
 *
 * export const test = base.extend<TestFixtures & { autoAttachLogs: void }, WorkerFixtures>({
 *   ...observabilityFixtures,
 *   // other fixtures
 * });
 * ```
 *
 * The autoAttachLogs fixture:
 * - Runs automatically for every test (auto: true)
 * - Only collects logs when a test fails AND observability is enabled
 * - Attaches logs as plaintext, sorted by container and timestamp
 */
export const observabilityFixtures: Fixtures<
	ObservabilityTestFixtures,
	ObservabilityWorkerFixtures
> = {
	autoAttachLogs: [
		async ({ n8nContainer }, use, testInfo) => {
			// Run the test
			await use(undefined);

			// After test: attach logs if failed
			if (testInfo.status !== testInfo.expectedStatus && n8nContainer?.services?.observability) {
				await attachLogsOnFailure(n8nContainer, testInfo);
			}
		},
		{ auto: true },
	],
};
