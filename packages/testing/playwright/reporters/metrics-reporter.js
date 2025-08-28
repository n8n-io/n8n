import gitRevSync from 'git-rev-sync';

class MetricsReporter {
	constructor(options = {}) {
		this.webhookUrl = options.webhookUrl || process.env.METRICS_WEBHOOK_URL;
	}

	async onTestEnd(test, result) {
		if (!this.webhookUrl || result.status === 'skipped') return;

		const metrics = this.collectMetrics(result);
		if (metrics.length > 0) {
			await this.sendMetrics(test, metrics);
		}
	}

	collectMetrics(result) {
		const metrics = [];

		result.attachments.forEach((attachment) => {
			if (attachment.name.startsWith('metric:')) {
				const metricName = attachment.name.replace('metric:', '');
				try {
					const data = JSON.parse(attachment.body.toString());
					metrics.push({
						name: metricName,
						value: data.value,
						unit: data.unit || null,
					});
				} catch (e) {
					// Skip invalid metric attachments silently
				}
			}
		});

		return metrics;
	}

	async sendMetrics(test, metrics) {
		const gitInfo = this.getGitInfo();

		for (const metric of metrics) {
			const payload = {
				test_name: test.title,
				metric_name: metric.name,
				metric_value: metric.value,
				metric_unit: metric.unit,
				commit: gitInfo.commit,
				branch: gitInfo.branch,
				timestamp: new Date().toISOString(),
			};

			try {
				await fetch(this.webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
			} catch (e) {
				// Fail silently - don't break tests
				console.warn('Failed to send metric:', e.message);
			}
		}
	}

	getGitInfo() {
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

export default MetricsReporter;
