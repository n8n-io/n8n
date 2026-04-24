import type { Fixtures, TestInfo } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/stack';

export type ObservabilityTestFixtures = {
	autoAttachLogs: undefined;
};

export type ObservabilityWorkerFixtures = {
	n8nContainer: N8NStack;
};

/**
 * `stack.services` is a Proxy whose factory throws when a service isn't in the
 * project config (e.g. sqlite:e2e has no observability services). Optional
 * chaining doesn't help — the throw happens inside the factory invocation.
 */
function tryGetObservability(stack: N8NStack | undefined) {
	if (!stack) return undefined;
	try {
		return stack.services?.observability;
	} catch {
		return undefined;
	}
}

async function attachLogsOnFailure(
	stack: N8NStack,
	testInfo: TestInfo,
	options: { lookbackMinutes?: number } = {},
): Promise<void> {
	const obs = tryGetObservability(stack);
	if (!obs) return;

	const lookback = options.lookbackMinutes ?? 5;

	try {
		const logs = await obs.logs.query('*', {
			limit: 10000,
			start: `${lookback}m`,
		});

		if (logs.length === 0) return;

		const groupedLogs = logs.reduce<Record<string, typeof logs>>((acc, log) => {
			const container = log.container_name ?? 'unknown';
			acc[container] ??= [];
			acc[container].push(log);
			return acc;
		}, {});

		for (const containerLogs of Object.values(groupedLogs)) {
			containerLogs.sort((a, b) => (a._time ?? '').localeCompare(b._time ?? ''));
		}

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

		const jsonLinesExport = logs.map((log) => JSON.stringify(log)).join('\n');
		await testInfo.attach('victoria-logs-export.jsonl', {
			body: jsonLinesExport,
			contentType: 'application/x-ndjson',
		});
	} catch (error) {
		console.warn('Failed to collect container logs:', error);
	}
}

async function attachMetricsOnFailure(stack: N8NStack, testInfo: TestInfo): Promise<void> {
	const obs = tryGetObservability(stack);
	if (!obs) return;

	try {
		const metricsExport = await obs.metrics.exportAll();

		if (!metricsExport.trim()) return;

		await testInfo.attach('victoria-metrics-export.jsonl', {
			body: metricsExport,
			contentType: 'application/x-ndjson',
		});
	} catch (error) {
		console.warn('Failed to export metrics:', error);
	}
}

/**
 * Auto-attaches container logs and metrics on test failure.
 * Import exports locally with scripts/import-victoria-data.mjs
 */
export const observabilityFixtures: Fixtures<
	ObservabilityTestFixtures,
	ObservabilityWorkerFixtures
> = {
	autoAttachLogs: [
		async ({ n8nContainer }, use, testInfo) => {
			await use(undefined);

			// n8nContainer is undefined when fixture setup failed (e.g. postgres timeout);
			// observability may be unconfigured for this project (sqlite:e2e).
			// Both cases must be handled gracefully so teardown never masks the real failure.
			if (testInfo.status === testInfo.expectedStatus) return;
			if (!tryGetObservability(n8nContainer)) return;

			await Promise.all([
				attachLogsOnFailure(n8nContainer, testInfo),
				attachMetricsOnFailure(n8nContainer, testInfo),
			]);
		},
		{ auto: true },
	],
};
