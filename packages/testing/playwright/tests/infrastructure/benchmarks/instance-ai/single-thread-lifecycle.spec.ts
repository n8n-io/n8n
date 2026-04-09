import { test, expect, instanceAiTestConfig } from './fixtures';
import { BENCHMARK_PROMPTS, WARMUP_PROMPT } from '../../../../utils/benchmark/instance-ai-driver';
import { runMemoryBenchmark } from '../harness/memory-harness';

test.use(instanceAiTestConfig);

test.describe(
	'Instance-AI Memory: Single Thread Lifecycle @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('heap returns to baseline after single build + delete', async ({
			instanceAiDriver: driver,
			backendUrl,
			services,
		}, testInfo) => {
			test.setTimeout(600_000);

			const heapOptions = {
				maxWaitMs: 120_000,
				thresholdMB: 5,
				stableReadingsRequired: 3,
			};

			const result = await runMemoryBenchmark(
				{
					testInfo,
					baseUrl: backendUrl,
					metrics: services.observability.metrics,
					dimensions: { scenario: 'single-thread' },
					heapOptions,
					captureSnapshots: true,
					warmup: async () => {
						await driver.runParallel([WARMUP_PROMPT]);
						await driver.cleanup();
					},
					captureTargetAfterPhase: 'build-workflow',
					maxLeakMB: 50,
					maxRssGrowthMB: 300,
				},
				[
					{
						name: 'build-workflow',
						action: async () => {
							await driver.runParallel([BENCHMARK_PROMPTS[0]]);
						},
					},
					{
						name: 'cleanup',
						action: async () => {
							await driver.cleanup();
						},
					},
				],
			);

			expect(result.passed).toBe(true);
		});
	},
);
