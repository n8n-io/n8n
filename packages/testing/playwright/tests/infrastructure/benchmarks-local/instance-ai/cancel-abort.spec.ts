import { test, expect, instanceAiTestConfig } from './fixtures';
import { InstanceAiPage } from '../../../../pages/InstanceAiPage';
import { BENCHMARK_PROMPTS, WARMUP_PROMPT } from '../../../../utils/benchmark/instance-ai-driver';
import { runMemoryBenchmark, type MemoryPhase } from '../harness/memory-harness';

test.use(instanceAiTestConfig);

const CANCEL_ITERATIONS = 5;

test.describe(
	'Instance-AI Memory: Cancel/Abort Cleanup @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('heap is cleaned up after cancelling runs mid-flight', async ({
			instanceAiDriver: driver,
			n8n,
			backendUrl,
			services,
		}, testInfo) => {
			test.setTimeout(600_000);

			const heapOptions = {
				maxWaitMs: 120_000,
				thresholdMB: 5,
				stableReadingsRequired: 3,
			};

			const phases: MemoryPhase[] = [];

			for (let i = 0; i < CANCEL_ITERATIONS; i++) {
				phases.push({
					name: `cancel-${i + 1}`,
					action: async () => {
						// Open a tab, send prompt, then cancel mid-flight
						const page = await n8n.page.context().newPage();
						const ai = new InstanceAiPage(page);

						await page.goto('/instance-ai');
						await ai.getContainer().waitFor({ state: 'visible', timeout: 15_000 });
						await ai.getChatInput().waitFor({ state: 'visible', timeout: 10_000 });
						await ai.sidebar.getNewThreadButton().click();
						await page.waitForURL(/\/instance-ai\/[0-9a-f-]+/, { timeout: 10_000 });

						const threadId = page.url().match(/\/instance-ai\/([0-9a-f-]+)/)?.[1];

						await ai.getChatInput().fill(BENCHMARK_PROMPTS[i % BENCHMARK_PROMPTS.length]);
						await ai.getSendButton().click();

						// Wait for run to start, then cancel
						await ai.getStopButton().waitFor({ state: 'visible', timeout: 30_000 });
						await ai.getStopButton().click();
						await ai.waitForRunComplete(30_000);

						console.log(`[CANCEL ${i + 1}] Cancelled thread ${threadId}`);

						await page.close();
						if (threadId) await driver.deleteThread(threadId);
					},
					measureAfter: (i + 1) % 2 === 0 || i === CANCEL_ITERATIONS - 1,
				});
			}

			const result = await runMemoryBenchmark(
				{
					testInfo,
					baseUrl: backendUrl,
					metrics: services.observability.metrics,
					dimensions: { scenario: 'cancel-abort', iterations: CANCEL_ITERATIONS },
					heapOptions,
					captureSnapshots: true,
					warmup: async () => {
						await driver.runParallel([WARMUP_PROMPT]);
						await driver.cleanup();
					},
					maxLeakMB: 50,
					maxRssGrowthMB: 300,
				},
				phases,
			);

			expect(result.passed).toBe(true);
		});
	},
);
