/**
 * E2E Performance: Execution Data Load
 *
 * Measures real-world performance of loading and displaying execution data
 * in the editor. These tests quantify the impact of the shallowRef optimization
 * on actual user-facing latency.
 *
 * Run: pnpm --filter=n8n-playwright test:local tests/e2e/performance/execution-data-load.spec.ts --reporter=list 2>&1 | tail -50
 *
 * Compare before/after by running on master vs the feature branch.
 * Results are logged to console — look for "PERF:" lines.
 */
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Performance: Execution Data Load',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should measure execution data load time on workflow with 1K items across 5 nodes', async ({
			n8n,
		}) => {
			// Setup: import workflow with 5 Code nodes producing 1K items each
			await n8n.start.fromImportedWorkflow('large-execution-perf.json');

			// Execute the workflow and wait for completion
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Success', {
				timeout: 30_000,
			});

			// Measure: inject performance mark, then open execution details
			const metrics = await n8n.page.evaluate(() => {
				const entries = performance.getEntriesByType('resource');
				const executionEntries = entries.filter((e) => e.name.includes('/executions'));
				return {
					executionResourceCount: executionEntries.length,
					totalExecutionLoadMs: executionEntries.reduce((sum, e) => sum + e.duration, 0),
				};
			});

			console.log(`PERF: execution resource loads: ${metrics.executionResourceCount}`);
			console.log(`PERF: total execution data network time: ${metrics.totalExecutionLoadMs}ms`);

			// Measure Vue reactivity cost by timing store updates via evaluate
			const reactivityMetrics = await n8n.page.evaluate(() => {
				// Access the Vue app's Pinia store
				/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention */
				const appEl = document.querySelector('#app') as unknown as
					| (Element & { __vue_app__?: { config: { globalProperties: Record<string, any> } } })
					| null;
				const app = appEl?.__vue_app__;
				/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention */
				if (!app) return { error: 'Vue app not found' };

				const pinia = app.config.globalProperties.$pinia;
				if (!pinia) return { error: 'Pinia not found' };

				const store = pinia._s.get('workflows');
				if (!store) return { error: 'Workflows store not found' };

				// Measure re-assignment cost
				const currentData = store.workflowExecutionData;
				if (!currentData) return { error: 'No execution data' };

				const iterations = 100;
				const start = performance.now();
				for (let i = 0; i < iterations; i++) {
					store.workflowExecutionData = { ...currentData };
				}
				const elapsed = performance.now() - start;

				return {
					assignmentTimeMs: elapsed,
					assignmentAvgMs: elapsed / iterations,
					iterations,
					dataKeys: currentData.data
						? Object.keys(currentData.data.resultData?.runData ?? {}).length
						: 0,
				};
			});

			console.log(`PERF: store assignment (${reactivityMetrics.iterations}x):`, {
				totalMs: reactivityMetrics.assignmentTimeMs?.toFixed(2),
				avgMs: reactivityMetrics.assignmentAvgMs?.toFixed(3),
				nodeCount: reactivityMetrics.dataKeys,
			});

			// Verify execution completed — the performance data is in the console output
			await expect(n8n.canvas.canvasPane()).toBeVisible();
		});

		test('should measure execution history navigation performance', async ({ n8n, api }) => {
			// Setup: create a workflow and run it multiple times
			const workflowName = `Perf History ${nanoid()}`;
			await n8n.start.fromBlankCanvas();

			// Create a simple workflow via API for fast setup
			const workflow = await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						parameters: {},
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						id: `trigger-${nanoid()}`,
						name: 'Manual Trigger',
					},
					{
						parameters: {
							jsCode:
								"const items = [];\nfor (let i = 0; i < 500; i++) {\n  items.push({ json: { id: i, data: 'x'.repeat(100) } });\n}\nreturn items;",
						},
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [220, 0],
						id: `code-${nanoid()}`,
						name: 'Generate Data',
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Generate Data', type: 'main', index: 0 }]],
					},
				},
			});

			// Execute the workflow 3 times via API to build execution history
			for (let i = 0; i < 3; i++) {
				await api.workflows.runManually(workflow.id, 'Manual Trigger');
				// Brief pause to ensure executions are sequential
				await n8n.page.waitForTimeout(1000);
			}

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Measure performance of opening execution log
			const historyLoadStart = Date.now();

			// Click on executions tab/panel
			await n8n.page.getByTestId('radio-button-executions').click();

			// Wait for execution list to appear
			await n8n.page.waitForResponse(
				(response) =>
					response.url().includes('/executions') && response.request().method() === 'GET',
			);

			const historyLoadEnd = Date.now();
			const historyLoadMs = historyLoadEnd - historyLoadStart;

			console.log(`PERF: execution history load: ${historyLoadMs}ms`);

			// Measure clicking on an execution entry (switching execution data)
			const switchMetrics = await n8n.page.evaluate(() => {
				/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention */
				const appEl = document.querySelector('#app') as unknown as
					| (Element & { __vue_app__?: { config: { globalProperties: Record<string, any> } } })
					| null;
				const app = appEl?.__vue_app__;
				/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention */
				if (!app) return { error: 'Vue app not found' };
				const pinia = app.config.globalProperties.$pinia;
				if (!pinia) return { error: 'Pinia not found' };
				const store = pinia._s.get('workflows');
				if (!store) return { error: 'Workflows store not found' };

				const currentData = store.workflowExecutionData;
				if (!currentData) return { noData: true };

				// Simulate rapid execution switching (like scrolling through history)
				const switchCount = 50;
				const start = performance.now();
				for (let i = 0; i < switchCount; i++) {
					// Alternate between null and data to simulate switching
					store.workflowExecutionData = null;
					store.workflowExecutionData = { ...currentData };
				}
				const elapsed = performance.now() - start;

				return {
					switchTimeMs: elapsed,
					switchAvgMs: elapsed / switchCount,
					switchCount,
				};
			});

			console.log(`PERF: execution switch (${switchMetrics.switchCount}x):`, {
				totalMs: switchMetrics.switchTimeMs?.toFixed(2),
				avgMs: switchMetrics.switchAvgMs?.toFixed(3),
			});
		});
	},
);
