import { ObservabilityHelper } from 'n8n-containers';

import { test, expect } from '../../fixtures/base';
import { attachMetric } from '../../utils/performance-helper';

test.use({
	addContainerCapability: {
		resourceQuota: {
			memory: 0.75,
			cpu: 0.5,
		},
		observability: true,
	},
});

test.describe('Memory Consumption @capability:observability', () => {
	const CONTAINER_STABILIZATION_TIME = 20000;
	const STARTER_PLAN_MEMORY_LIMIT_MB = 768;

	test('Memory consumption baseline with starter plan resources', async ({
		n8nContainer,
	}, testInfo) => {
		const obs = new ObservabilityHelper(n8nContainer.observability!);

		// Wait for container to stabilize and metrics to be scraped
		await new Promise((resolve) => setTimeout(resolve, CONTAINER_STABILIZATION_TIME));

		// Query average memory over last 30 seconds (converted to MB in PromQL)
		const result = await obs.metrics.query(
			'avg_over_time(n8n_process_resident_memory_bytes[30s]) / 1024 / 1024',
		);
		expect(result.length, 'Expected metrics result to have at least one value').toBeGreaterThan(0);
		const averageMemoryMB = result[0].value;

		await attachMetric(testInfo, 'memory-consumption-baseline', averageMemoryMB, 'MB');

		// Verify memory is within starter plan limits (768MB)
		expect(averageMemoryMB).toBeLessThan(STARTER_PLAN_MEMORY_LIMIT_MB);
		expect(averageMemoryMB).toBeGreaterThan(100);
	});
});
