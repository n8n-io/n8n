import { TestError } from '../Types';
import type { ApiHelpers } from './api-helper';

/** Reads Prometheus counters from `/metrics` (requires `N8N_METRICS=true`). */
export class MetricsApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/** Returns the value of the first metric line starting with `name`, or 0 when absent. */
	async getCounter(name: string): Promise<number> {
		const response = await this.api.request.get('/metrics');
		if (!response.ok()) {
			throw new TestError(
				`Failed to fetch /metrics (is N8N_METRICS enabled?): ${response.status()}`,
			);
		}
		const metrics = await response.text();
		const line = metrics.split('\n').find((l) => l.startsWith(name));

		return line ? Number(line.split(' ')[1]) : 0;
	}
}
