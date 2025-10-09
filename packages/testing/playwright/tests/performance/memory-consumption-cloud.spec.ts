import { test, expect } from '../../fixtures/cloud';
import { attachMetric, pollMemoryMetric } from '../../utils/performance-helper';

test.describe('Memory Consumption', () => {
	const CONTAINER_STABILIZATION_TIME = 20000;
	const POLL_MEMORY_DURATION = 30000;
	const STARTER_PLAN_MEMORY_LIMIT = 768;

	test('Memory consumption baseline with starter plan resources @cloud:starter', async ({
		cloudContainer,
	}, testInfo) => {
		// Wait for container to stabilize
		await new Promise((resolve) => setTimeout(resolve, CONTAINER_STABILIZATION_TIME));

		// Poll memory metric for 30 seconds to get baseline
		const averageMemoryBytes = await pollMemoryMetric(
			cloudContainer.baseUrl,
			POLL_MEMORY_DURATION,
			1000,
		);
		const averageMemoryMB = averageMemoryBytes / 1024 / 1024;

		await attachMetric(testInfo, 'memory-consumption-baseline', averageMemoryMB, 'MB');

		// Verify memory is within starter plan limits (768MB)
		expect(averageMemoryMB).toBeLessThan(STARTER_PLAN_MEMORY_LIMIT);
		expect(averageMemoryMB).toBeGreaterThan(100);
	});
});
