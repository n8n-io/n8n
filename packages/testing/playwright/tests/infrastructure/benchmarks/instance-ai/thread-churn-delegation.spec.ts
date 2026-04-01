import { analyzeHeapLeaks } from '../../../../utils/benchmark/heap-analysis';
import { runMemoryBenchmark } from '../harness/memory-harness';
import { test, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

const ROUNDS = 5;

const DELEGATION_PROMPT =
	`Without asking any questions, go straight to execution. ` +
	`Create a plan with three parallel delegation tasks and execute them all:\n` +
	`1. List all credentials and confirm the list is empty\n` +
	`2. List all workflow executions and confirm the list is empty\n` +
	`3. List all workflows and confirm the list is empty\n` +
	`Report the results of all three tasks.`;

test.describe(
	'Instance-AI Memory: Lightweight Delegation @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('heap returns to baseline after delegation rounds', async ({
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
					dimensions: { scenario: 'delegation', rounds: ROUNDS },
					heapOptions,
					captureSnapshots: true,
					dryRun: false,
				},
				[
					...Array.from({ length: ROUNDS }, (_, round) => ({
						name: `round-${round + 1}`,
						action: async () => {
							const results = await driver.runParallel([DELEGATION_PROMPT]);
							const completed = results.filter((r) => r.completed).length;
							console.log(`[ROUND ${round + 1}] ${completed}/${results.length} builds completed`);
							await driver.cleanup();
						},
					})),
				],
			);

			const { baseline, target, final: finalSnap } = result.snapshots;
			if (baseline && target && finalSnap) {
				await analyzeHeapLeaks(baseline, target, finalSnap, testInfo);
			}
		});
	},
);
