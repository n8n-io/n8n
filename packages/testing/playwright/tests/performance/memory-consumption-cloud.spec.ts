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
	const STARTER_PLAN_MEMORY_LIMIT_MB = 768;
	const METRICS_TIMEOUT_MS = 60000; // Wait up to 60s for metrics to be available

	test('Memory consumption baseline with starter plan resources', async ({
		n8nContainer,
	}, testInfo) => {
		const obs = new ObservabilityHelper(n8nContainer.observability!);

		// Wait for metrics to be scraped by VictoriaMetrics (polls until available)
		const memoryQuery = 'avg_over_time(n8n_process_resident_memory_bytes[30s]) / 1024 / 1024';
		const result = await obs.metrics.waitForMetric(memoryQuery, {
			timeoutMs: METRICS_TIMEOUT_MS,
			intervalMs: 2000,
		});

		expect(result, 'Expected metrics result to be available').not.toBeNull();
		const averageMemoryMB = result!.value;

		await attachMetric(testInfo, 'memory-consumption-baseline', averageMemoryMB, 'MB');

		// Verify memory is within starter plan limits (768MB)
		expect(averageMemoryMB).toBeLessThan(STARTER_PLAN_MEMORY_LIMIT_MB);
		expect(averageMemoryMB).toBeGreaterThan(100);
	});
});
