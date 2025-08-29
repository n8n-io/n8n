import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import gitRevSync from 'git-rev-sync';

interface MetricData {
	value: number;
	unit?: string;
}

interface Metric {
	name: string;
	value: number;
	unit: string | null;
}

interface ReporterOptions {
	webhookUrl?: string;
	webhookUser?: string;
	webhookPassword?: string;
}

class MetricsReporter implements Reporter {
	private webhookUrl: string | undefined;
	private webhookUser: string | undefined;
	private webhookPassword: string | undefined;
	private pendingRequests: Array<Promise<void>> = [];

	constructor(options: ReporterOptions = {}) {
		this.webhookUrl = options.webhookUrl ?? process.env.QA_PERFORMANCE_METRICS_WEBHOOK_URL;
		this.webhookUser = options.webhookUser ?? process.env.QA_PERFORMANCE_METRICS_WEBHOOK_USER;
		this.webhookPassword =
			options.webhookPassword ?? process.env.QA_PERFORMANCE_METRICS_WEBHOOK_PASSWORD;
	}

	async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
		if (
			!this.webhookUrl ||
			!this.webhookUser ||
			!this.webhookPassword ||
			result.status === 'skipped'
		) {
			return;
		}

		const metrics = this.collectMetrics(result);
		if (metrics.length > 0) {
			const sendPromise = this.sendMetrics(test, metrics);
			this.pendingRequests.push(sendPromise);
			await sendPromise;
		}
	}

	private collectMetrics(result: TestResult): Metric[] {
		const metrics: Metric[] = [];

		result.attachments.forEach((attachment) => {
			if (attachment.name.startsWith('metric:')) {
				const metricName = attachment.name.replace('metric:', '');
				try {
					const data = JSON.parse(attachment.body?.toString() ?? '') as MetricData;
					metrics.push({
						name: metricName,
						value: data.value,
						unit: data.unit ?? null,
					});
				} catch (e) {
					console.warn(
						`[MetricsReporter] Failed to parse metric ${metricName}: ${(e as Error).message}`,
					);
				}
			}
		});

		return metrics;
	}

	private async sendMetrics(test: TestCase, metrics: Metric[]): Promise<void> {
		const gitInfo = this.getGitInfo();

		for (const metric of metrics) {
			const payload = {
				test_name: test.title,
				metric_name: metric.name,
				metric_value: metric.value,
				metric_unit: metric.unit ?? '', // Ensure non-null for BigQuery REQUIRED field
				git_commit: gitInfo.commit ?? 'unknown', // Ensure non-null for BigQuery REQUIRED field
				git_branch: gitInfo.branch ?? 'unknown', // Ensure non-null for BigQuery REQUIRED field
				timestamp: new Date().toISOString(),
			};

			try {
				const auth = Buffer.from(`${this.webhookUser}:${this.webhookPassword}`).toString('base64');

				const response = await fetch(this.webhookUrl!, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Basic ${auth}`,
					},
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(10000),
				});

				if (!response.ok) {
					console.warn(`[MetricsReporter] Webhook failed (${response.status}): ${metric.name}`);
				}
			} catch (e) {
				console.warn(
					`[MetricsReporter] Failed to send metric ${metric.name}: ${(e as Error).message}`,
				);
			}
		}
	}

	async onEnd(): Promise<void> {
		if (this.pendingRequests.length > 0) {
			await Promise.allSettled(this.pendingRequests);
		}
	}

	private getGitInfo(): { commit: string | null; branch: string | null } {
		try {
			return {
				commit: gitRevSync.long(),
				branch: gitRevSync.branch(),
			};
		} catch (e) {
			return { commit: null, branch: null };
		}
	}
}

// eslint-disable-next-line import-x/no-default-export
export default MetricsReporter;
