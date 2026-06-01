import { test, expect, instanceAiTestConfig } from './fixtures';
import { analyzeHeapLeaks } from '../../../../utils/benchmark/heap-analysis';
import { BENCHMARK_PROMPTS, WARMUP_PROMPT } from '../../../../utils/benchmark/instance-ai-driver';
import { runMemoryBenchmark } from '../harness/memory-harness';

test.use(instanceAiTestConfig);

/** Number of parallel-build rounds. Each round opens 3 tabs, builds, then cleans up. */
const ROUNDS = 3;

test.describe(
	'Instance-AI Memory: Parallel Workflow Builds @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('heap returns to baseline after parallel build rounds', async ({
			instanceAiDriver: driver,
			backendUrl,
			services,
		}, testInfo) => {
			test.setTimeout(900_000);

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
					dimensions: {
						scenario: 'parallel-builds',
						rounds: ROUNDS,
						promptsPerRound: BENCHMARK_PROMPTS.length,
					},
					heapOptions,
					captureSnapshots: true,
					dryRun: false,
					warmup: async () => {
						await driver.runParallel([WARMUP_PROMPT]);
						await driver.cleanup();
					},
					captureTargetAfterPhase: `round-${ROUNDS - 1}`,
					maxLeakMB: 50,
					maxRssGrowthMB: 600,
				},
				[
					// Each round: open 3 tabs, build in parallel, close tabs, delete threads
					...Array.from({ length: ROUNDS }, (_, round) => ({
						name: `round-${round + 1}`,
						action: async () => {
							const results = await driver.runParallel(BENCHMARK_PROMPTS);
							const completed = results.filter((r) => r.completed).length;
							console.log(`[ROUND ${round + 1}] ${completed}/${results.length} builds completed`);
							await driver.cleanup();
						},
					})),
				],
			);

			expect(result.passed).toBe(true);

			// Run memlab analysis if all three snapshots were captured
			const { baseline, target, final: finalSnap } = result.snapshots;
			// eslint-disable-next-line playwright/no-conditional-in-test
			if (baseline && target && finalSnap) {
				await analyzeHeapLeaks(baseline, target, finalSnap, testInfo);
			}
		});
	},
);
