import { analyzeHeapLeaks } from '../../../../utils/benchmark/heap-analysis';
import { runMemoryBenchmark } from '../harness/memory-harness';
import { test, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

const ROUNDS = 3;

const DATA_TABLE_PROMPT =
	`Without asking any questions, go straight to building. ` +
	`Create 5 data tables with sample data:\n` +
	`1. "Bench Employees" with columns: name (text), email (text), department (text) — add 3 rows\n` +
	`2. "Bench Products" with columns: sku (text), name (text), price (number) — add 3 rows\n` +
	`3. "Bench Orders" with columns: orderId (text), product (text), quantity (number) — add 3 rows\n` +
	`4. "Bench Inventory" with columns: warehouse (text), sku (text), count (number) — add 3 rows\n` +
	`5. "Bench Logs" with columns: timestamp (text), level (text), message (text) — add 3 rows\n` +
	`After creating all 5, delete all of them.`;

test.describe(
	'Instance-AI Memory: Data Table CRUD @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('heap returns to baseline after data table create/delete rounds', async ({
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
					dimensions: { scenario: 'data-tables', rounds: ROUNDS },
					heapOptions,
					captureSnapshots: true,
					dryRun: false,
				},
				[
					...Array.from({ length: ROUNDS }, (_, round) => ({
						name: `round-${round + 1}`,
						action: async () => {
							const results = await driver.runParallel([DATA_TABLE_PROMPT]);
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
