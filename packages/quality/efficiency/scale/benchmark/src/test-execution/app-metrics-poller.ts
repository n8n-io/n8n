/**
 * Polls the /metrics endpoint from an n8n instance to collect application metrics
 * during benchmark test runs.
 *
 * A Poller can be started and stopped once. After it's stopped, it cannot be restarted.
 * Instead, a new poller instance should be created.
 */
export class AppMetricsPoller {
	private intervalId: NodeJS.Timeout | undefined = undefined;
	private metricsData: string[] = [];
	private isRunning = false;
	private isStopped = false;

	constructor(
		private readonly metricsUrl: string,
		private readonly pollIntervalMs: number = 5000,
	) {}

	/**
	 * Starts polling the metrics endpoint
	 */
	start() {
		if (this.isRunning) {
			throw new Error('Metrics poller is already running');
		}
		if (this.isStopped) {
			throw new Error('Metrics poller has been stopped and cannot be restarted');
		}

		this.isRunning = true;
		this.metricsData = [];

		// Immediately poll once to get initial metrics
		void this.pollMetrics();

		// Set up interval polling
		this.intervalId = setInterval(() => {
			void this.pollMetrics();
		}, this.pollIntervalMs);
	}

	/**
	 * Stops polling the metrics endpoint
	 */
	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		this.isRunning = false;
		this.isStopped = true;
	}

	/**
	 * Gets all collected metrics data
	 */
	getMetricsData(): string[] {
		return this.metricsData;
	}

	/**
	 * Polls the metrics endpoint once
	 */
	private async pollMetrics() {
		try {
			const response = await fetch(this.metricsUrl);

			if (!response.ok) {
				console.warn(`Failed to poll metrics: ${response.status} ${response.statusText}`);
				return;
			}

			const metricsText = await response.text();
			this.metricsData.push(metricsText);
		} catch (error) {
			console.warn(
				`Error polling metrics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
