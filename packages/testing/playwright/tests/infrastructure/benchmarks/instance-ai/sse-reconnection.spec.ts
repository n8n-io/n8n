import { BENCHMARK_PROMPTS } from '../../../../utils/benchmark/instance-ai-driver';
import { InstanceAiPage } from '../../../../pages/InstanceAiPage';
import { runMemoryBenchmark, type MemoryPhase } from '../harness/memory-harness';
import { test, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

const RECONNECT_CYCLES = 10;

test.describe(
	'Instance-AI Memory: SSE Reconnection @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('no event listener leaks from repeated SSE reconnections', async ({
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

			// First: build one workflow so the thread has content
			const results = await driver.runParallel([BENCHMARK_PROMPTS[0]]);
			const threadId = results[0]?.threadId;
			const threadPage = driver['openedPages'][0];

			const phases: MemoryPhase[] = [];

			// Each cycle: navigate away (breaks SSE) → navigate back (reconnects SSE)
			for (let i = 0; i < RECONNECT_CYCLES; i++) {
				phases.push({
					name: `reconnect-${i + 1}`,
					action: async () => {
						await threadPage.goto('/home/workflows');
						await threadPage.waitForLoadState('networkidle');
						await threadPage.goto(`/instance-ai/${threadId}`);
						const ai = new InstanceAiPage(threadPage);
						await ai.getChatInput().waitFor({ state: 'visible', timeout: 10_000 });
					},
					measureAfter: (i + 1) % 5 === 0 || i === RECONNECT_CYCLES - 1,
				});
			}

			// Cleanup
			phases.push({
				name: 'cleanup',
				action: async () => {
					await driver.cleanup();
				},
			});

			await runMemoryBenchmark(
				{
					testInfo,
					baseUrl: backendUrl,
					metrics: services.observability.metrics,
					dimensions: { scenario: 'sse-reconnection', cycles: RECONNECT_CYCLES },
					heapOptions,
				},
				phases,
			);
		});
	},
);
