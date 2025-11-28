import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { strict as assert } from 'assert';
import { execSync } from 'child_process';
import { z } from 'zod';

const metricDataSchema = z.object({
	value: z.number(),
	unit: z.string().optional(),
});

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

/**
 * Automatically collect performance metrics from Playwright tests and send them to a Webhook.
 * If your test contains a testInfo.attach() call with a name starting with 'metric:', the metric will be collected and sent to the Webhook.
 */
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
					const parsedData = JSON.parse(attachment.body?.toString() ?? '');
					const data = metricDataSchema.parse(parsedData);
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

		assert(gitInfo.commit, 'Git commit must be defined');
		assert(gitInfo.branch, 'Git branch must be defined');
		assert(gitInfo.author, 'Git author must be defined');

		const payload = {
			test_name: test.title,
			git_commit: gitInfo.commit,
			git_branch: gitInfo.branch,
			git_author: gitInfo.author,
			timestamp: new Date().toISOString(),
			metrics: metrics.map((metric) => ({
				metric_name: metric.name,
				metric_value: metric.value,
				metric_unit: metric.unit,
			})),
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
				console.warn(`[MetricsReporter] Webhook failed (${response.status}): ${test.title}`);
			}
		} catch (e) {
			console.warn(
				`[MetricsReporter] Failed to send metrics for test ${test.title}: ${(e as Error).message}`,
			);
		}
	}

	async onEnd(): Promise<void> {
		if (this.pendingRequests.length > 0) {
			await Promise.allSettled(this.pendingRequests);
		}
	}

	private getGitInfo(): { commit: string | null; branch: string | null; author: string | null } {
		try {
			return {
				commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
				branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
				author: execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf8' }).trim(),
			};
		} catch (e) {
			console.error(`[MetricsReporter] Failed to get Git info: ${(e as Error).message}`);
			return { commit: null, branch: null, author: null };
		}
	}
}

// eslint-disable-next-line import-x/no-default-export
export default MetricsReporter;
