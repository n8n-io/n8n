import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { execSync } from 'node:child_process';
import * as os from 'node:os';
import { z } from 'zod';

const metricDataSchema = z.object({
	value: z.number(),
	unit: z.string().optional(),
	dimensions: z.record(z.union([z.string(), z.number()])).optional(),
});

interface Metric {
	benchmark_name: string;
	metric_name: string;
	value: number;
	unit: string | null;
	dimensions: Record<string, string | number> | null;
}

interface ReporterOptions {
	webhookUrl?: string;
	webhookUser?: string;
	webhookPassword?: string;
}

/**
 * Automatically collect performance metrics from Playwright tests and send them to a Webhook.
 * If your test contains a testInfo.attach() call with a name starting with 'metric:', the metric
 * will be collected and sent as a single batched payload at the end of the run.
 *
 * See utils/performance-helper.ts for the attachMetric() helper.
 */
class MetricsReporter implements Reporter {
	private webhookUrl: string | undefined;
	private webhookUser: string | undefined;
	private webhookPassword: string | undefined;
	private collectedMetrics: Metric[] = [];

	constructor(options: ReporterOptions = {}) {
		this.webhookUrl = options.webhookUrl ?? process.env.QA_METRICS_WEBHOOK_URL;
		this.webhookUser = options.webhookUser ?? process.env.QA_METRICS_WEBHOOK_USER;
		this.webhookPassword = options.webhookPassword ?? process.env.QA_METRICS_WEBHOOK_PASSWORD;
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		if (result.status === 'skipped') return;
		const metrics = this.collectMetrics(test, result);
		this.collectedMetrics.push(...metrics);
	}

	async onEnd(): Promise<void> {
		const webhookUrl = this.webhookUrl;
		if (!webhookUrl || this.collectedMetrics.length === 0) return;
		if (!this.webhookUser || !this.webhookPassword) {
			console.log('[MetricsReporter] QA_METRICS_WEBHOOK_USER/PASSWORD not set, skipping.');
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

		const auth = Buffer.from(`${this.webhookUser}:${this.webhookPassword}`).toString('base64');
		const context = this.getContext();

		const counts = await Promise.all(
			Array.from(byBenchmark, async ([benchmarkName, metrics]) => {
				const payload = { ...context, benchmark_name: benchmarkName, metrics };
				try {
					const response = await fetch(webhookUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Basic ${auth}`,
						},
						body: JSON.stringify(payload),
						signal: AbortSignal.timeout(30000),
					});

					if (!response.ok) {
						console.warn(
							`[MetricsReporter] Webhook failed (${response.status}) for "${benchmarkName}": ${metrics.length} metrics dropped`,
						);
						return 0;
					}
					return metrics.length;
				} catch (e) {
					console.warn(
						`[MetricsReporter] Failed to send metrics for "${benchmarkName}": ${(e as Error).message}`,
					);
					return 0;
				}
			}),
		);

		const sent = counts.reduce((total, n) => total + n, 0);
		console.log(
			`[MetricsReporter] Sent ${sent}/${this.collectedMetrics.length} metrics across ${byBenchmark.size} tests`,
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
				console.warn(
					`[MetricsReporter] Failed to parse metric ${metricName}: ${(e as Error).message}`,
				);
			}
		}

		return metrics;
	}

	private getContext() {
		const ref = process.env.GITHUB_REF ?? '';
		const prMatch = ref.match(/refs\/pull\/(\d+)/);
		const runId = process.env.GITHUB_RUN_ID ?? null;

		return {
			timestamp: new Date().toISOString(),
			git: {
				sha: (process.env.GITHUB_SHA ?? this.gitFallback('rev-parse HEAD'))?.slice(0, 8) ?? null,
				branch:
					process.env.GITHUB_HEAD_REF ??
					process.env.GITHUB_REF_NAME ??
					this.gitFallback('rev-parse --abbrev-ref HEAD'),
				pr: prMatch ? parseInt(prMatch[1], 10) : null,
			},
			ci: {
				runId,
				runUrl:
					runId && process.env.GITHUB_REPOSITORY
						? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
						: null,
				workflow: process.env.GITHUB_WORKFLOW ?? null,
				job: process.env.GITHUB_JOB ?? null,
				attempt: process.env.GITHUB_RUN_ATTEMPT
					? parseInt(process.env.GITHUB_RUN_ATTEMPT, 10)
					: null,
			},
			runner: {
				provider: !process.env.CI
					? 'local'
					: process.env.RUNNER_ENVIRONMENT === 'github-hosted'
						? 'github'
						: 'blacksmith',
				cpuCores: os.cpus().length,
				memoryGb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
			},
		};
	}

	private gitFallback(command: string): string | null {
		try {
			return execSync(`git ${command}`, {
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'ignore'],
			}).trim();
		} catch {
			return null;
		}
	}
}

// eslint-disable-next-line import-x/no-default-export
export default MetricsReporter;
