/**
 * Parses Prometheus metrics text format and extracts time series data
 */
export class PrometheusMetricsParser {
	/**
	 * Extracts all values for a specific metric from collected metrics data
	 */
	static extractMetricValues(metricsData: string[], metricName: string): number[] {
		const values: number[] = [];

		for (const metricsText of metricsData) {
			const lines = metricsText.split('\n');

			for (const line of lines) {
				// Skip comments and empty lines
				if (line.startsWith('#') || line.trim() === '') {
					continue;
				}

				// Parse metric line: metric_name{labels} value
				// For example: n8n_nodejs_heap_size_total_bytes 149159936
				// For simplicity, we'll just check if the line starts with the metric name
				if (line.startsWith(metricName)) {
					const parts = line.split(/\s+/);
					if (parts.length >= 2) {
						const value = parseFloat(parts[parts.length - 1]);
						if (!isNaN(value)) {
							values.push(value);
						}
					}
				}
			}
		}

		return values;
	}

	/**
	 * Calculates statistics for a metric from collected data
	 */
	static calculateMetricStats(
		metricsData: string[],
		metricName: string,
	): { max: number; avg: number; min: number; count: number } | null {
		const values = this.extractMetricValues(metricsData, metricName);

		if (values.length === 0) {
			return null;
		}

		const max = Math.max(...values);
		const min = Math.min(...values);
		const sum = values.reduce((a, b) => a + b, 0);
		const avg = sum / values.length;

		return {
			max,
			min,
			avg,
			count: values.length,
		};
	}
}
