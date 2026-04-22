/**
 * Combined observability helper that provides unified access to logs and metrics.
 * The actual services are in victoria-logs.ts and victoria-metrics.ts.
 */
import type { HelperContext } from './types';
import { LogsHelper, type VictoriaLogsResult, escapeLogsQL } from './victoria-logs';
import { MetricsHelper, type VictoriaMetricsResult } from './victoria-metrics';

export { escapeLogsQL };
export { LogsHelper, type LogEntry, type LogQueryOptions } from './victoria-logs';
export {
	MetricsHelper,
	type MetricResult,
	type WaitForMetricOptions,
	type ScrapeTarget,
} from './victoria-metrics';

export class ObservabilityHelper {
	readonly logs: LogsHelper;
	readonly metrics: MetricsHelper;
	readonly syslog: VictoriaLogsResult['meta']['syslog'];

	constructor(logsMeta: VictoriaLogsResult['meta'], metricsMeta: VictoriaMetricsResult['meta']) {
		this.logs = new LogsHelper(logsMeta.queryEndpoint);
		this.metrics = new MetricsHelper(metricsMeta.queryEndpoint);
		this.syslog = logsMeta.syslog;
	}
}

export function createObservabilityHelper(ctx: HelperContext): ObservabilityHelper {
	const logsResult = ctx.serviceResults.victoriaLogs as VictoriaLogsResult | undefined;
	const metricsResult = ctx.serviceResults.victoriaMetrics as VictoriaMetricsResult | undefined;

	if (!logsResult) {
		throw new Error('VictoriaLogs service not found in context');
	}
	if (!metricsResult) {
		throw new Error('VictoriaMetrics service not found in context');
	}

	return new ObservabilityHelper(logsResult.meta, metricsResult.meta);
}

declare module './types' {
	interface ServiceHelpers {
		observability: ObservabilityHelper;
	}
}
