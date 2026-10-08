import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { z } from 'zod';

import {
	ciMetricsContext,
	resolveCiMetricsWebhook,
	sendCiMetrics,
	type CiMetric,
	type CiMetricsWebhook,
} from './ci-metrics';

const metricDataSchema = z.object({
	value: z.number(),
	unit: z.string().optional(),
	dimensions: z.record(z.union([z.string(), z.number()])).optional(),
});

type Metric = CiMetric & { benchmark_name: string };

interface ReporterOptions {
	webhookUrl?: string;
	webhookUser?: string;
	webhookPassword?: string;
}

const LOG_PREFIX = '[MetricsReporter]';

/**
 * Automatically collect performance metrics from Playwright tests and send them to a Webhook.
 * If your test contains a testInfo.attach() call with a name starting with 'metric:', the metric
 * will be collected and sent as a single batched payload at the end of the run.
 *
 * See utils/performance-helper.ts for the attachMetric() helper.
 */
class MetricsReporter implements Reporter {
	private readonly webhook: CiMetricsWebhook;
	private collectedMetrics: Metric[] = [];

	constructor(options: ReporterOptions = {}) {
		this.webhook = resolveCiMetricsWebhook({
			url: options.webhookUrl,
			user: options.webhookUser,
			password: options.webhookPassword,
		});
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		if (result.status === 'skipped') return;
		const metrics = this.collectMetrics(test, result);
		this.collectedMetrics.push(...metrics);
	}

	async onEnd(): Promise<void> {
		if (!this.webhook.url || this.collectedMetrics.length === 0) return;
		// Checked here as well as in the sender, so an incomplete setup logs one line
		// rather than one per test.
		if (!this.webhook.user || !this.webhook.password) {
			console.log(`${LOG_PREFIX} QA_METRICS_WEBHOOK_USER/PASSWORD not set, skipping.`);
			return;
		}

		// Group by benchmark_name so each POST has a single top-level benchmark_name,
		// consistent with how script-based sources (build-stats, docker-stats, etc.) send.
		const byBenchmark = new Map<string, Metric[]>();
		for (const m of this.collectedMetrics) {
			const group = byBenchmark.get(m.benchmark_name) ?? [];
			group.push(m);
			byBenchmark.set(m.benchmark_name, group);
		}

		// One context for the whole run, so every payload carries the same timestamp
		// and the git fallback shells out once.
		const context = ciMetricsContext();

		const counts = await Promise.all(
			Array.from(
				byBenchmark,
				async ([benchmarkName, metrics]) =>
					await sendCiMetrics({
						benchmarkName,
						metrics,
						webhook: this.webhook,
						logPrefix: LOG_PREFIX,
						context,
					}),
			),
		);

		const sent = counts.reduce((total, n) => total + n, 0);
		console.log(
			`${LOG_PREFIX} Sent ${sent}/${this.collectedMetrics.length} metrics across ${byBenchmark.size} tests`,
		);
	}

	private collectMetrics(test: TestCase, result: TestResult): Metric[] {
		const metrics: Metric[] = [];

		for (const attachment of result.attachments) {
			if (!attachment.name.startsWith('metric:')) continue;
			const metricName = attachment.name.slice('metric:'.length);
			try {
				const parsed = metricDataSchema.parse(JSON.parse(attachment.body?.toString() ?? ''));
				metrics.push({
					benchmark_name: test.title,
					metric_name: metricName,
					value: parsed.value,
					unit: parsed.unit ?? null,
					dimensions: parsed.dimensions ?? null,
				});
			} catch (e) {
				console.warn(`${LOG_PREFIX} Failed to parse metric ${metricName}: ${(e as Error).message}`);
			}
		}

		return metrics;
	}
}

// eslint-disable-next-line import-x/no-default-export
export default MetricsReporter;
