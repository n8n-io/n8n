import { BENCHMARK_PROMPTS } from '../../../../utils/benchmark/instance-ai-driver';
import { runMemoryBenchmark } from '../harness/memory-harness';
import { test, instanceAiTestConfig } from './fixtures';

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

			await runMemoryBenchmark(
				{
					testInfo,
					baseUrl: backendUrl,
					metrics: services.observability.metrics,
					dimensions: { scenario: 'single-thread' },
					heapOptions,
					captureSnapshots: true,
				},
				[
					{
						name: 'build-workflow',
						action: async () => {
							// Single prompt in its own tab
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
		});
	},
);
