import { test, expect } from 'n8n-playwright/containers';
import { getStableHeap } from 'n8n-playwright/memory';
import { attachMetric } from 'n8n-playwright/metrics';

export function runMemoryBaseline({ name, owner }: { name: string; owner: string }) {
	test.describe(
		`Module Memory Impact · ${name}`,
		{ annotation: [{ type: 'owner', description: owner }] },
		() => {
			test(`Idle baseline · ${name}`, async ({ n8nContainer, dbSetup }, testInfo) => {
				// Keep the seeded instance state used by the original baseline.
				void dbSetup;
				const obs = n8nContainer.services.observability;
				const result = await getStableHeap(n8nContainer.baseUrl, obs.metrics);

				await attachMetric(testInfo, `${name}-heap-used-baseline`, result.heapUsedMB, 'MB');
				await attachMetric(testInfo, `${name}-heap-total-baseline`, result.heapTotalMB, 'MB');
				await attachMetric(testInfo, `${name}-rss-baseline`, result.rssMB, 'MB');
				await attachMetric(testInfo, `${name}-pss-baseline`, result.pssMB ?? 0, 'MB');
				await attachMetric(
					testInfo,
					`${name}-non-heap-overhead-baseline`,
					result.nonHeapOverheadMB,
					'MB',
				);

				expect(result.heapUsedMB).toBeGreaterThan(0);
				expect(result.heapTotalMB).toBeGreaterThan(0);
				expect(result.rssMB).toBeGreaterThan(0);

				console.log(
					`[${name.toUpperCase()} IDLE] Heap used: ${result.heapUsedMB.toFixed(1)} MB | ` +
						`Heap total: ${result.heapTotalMB.toFixed(1)} MB | ` +
						`RSS: ${result.rssMB.toFixed(1)} MB | ` +
						`Non-heap overhead: ${result.nonHeapOverheadMB.toFixed(1)} MB`,
				);
			});
		},
	);
}
