import { TIER_CONFIG, buildCanvasBenchmarkWorkflow, type Tier } from './fixtures/generate-workflow';
import type { PinScenario } from './fixtures/pinned-payloads';
import { waitForCanvasReady } from './helpers/canvas-ready';
import { medianBy, withWarmup } from './helpers/iterate';
import {
	forceBrowserGc,
	logHeapLimitOnce,
	maybeCapturePostExecHeap,
} from './helpers/post-exec-heap';
import { test, expect } from '../../../fixtures/base';
import { attachMetric, measurePerformance } from '../../../utils/performance-helper';

// 1 warmup + 1 measured. Larger iteration counts accumulate browser-state
// (Pinia stores, retained run data, reactive proxies) across heavy-payload
// reloads, leading to a stuck page mount on the 3rd hot-load.
const ITERATIONS = 2;
const TIERS: Tier[] = ['S', 'M', 'L'];
const SCENARIOS: Array<Exclude<PinScenario, 'none'>> = [
	'small-spread',
	'medium-cluster',
	'heavy-concentrated',
];

const METRIC_SLUG: Record<Exclude<PinScenario, 'none'>, 'small' | 'medium' | 'heavy'> = {
	'small-spread': 'small',
	'medium-cluster': 'medium',
	'heavy-concentrated': 'heavy',
};

const TIER_TIMEOUT_MS: Record<Tier, number> = {
	S: 240_000,
	M: 360_000,
	L: 600_000,
};

const EXEC_TIMEOUT_MS: Record<Tier, number> = {
	S: 30_000,
	M: 60_000,
	L: 120_000,
};

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe(
	'Canvas Execution Benchmark',
	{ annotation: [{ type: 'owner', description: 'Canvas' }] },
	() => {
		for (const tier of TIERS) {
			test(`executes ${tier}-tier with pinned data @tier:${tier}`, async ({
				n8n,
				api,
				n8nContainer,
				services,
			}, testInfo) => {
				test.setTimeout(TIER_TIMEOUT_MS[tier]);
				await n8n.page.setViewportSize({ width: 1536, height: 960 });
				await n8n.page.emulateMedia({ reducedMotion: 'reduce' });

				for (const scenario of SCENARIOS) {
					const slug = METRIC_SLUG[scenario];
					const { workflow, pinnedDataBytes } = buildCanvasBenchmarkWorkflow({
						tier,
						pinScenario: scenario,
					});
					const created = await api.workflows.createWorkflow(workflow);
					const workflowId: string = String(created.id);
					const { nodes: flowNodes, stickyNotes } = TIER_CONFIG[tier];

					await attachMetric(
						testInfo,
						`canvas-exec-pin-bytes-${tier}-${slug}`,
						pinnedDataBytes,
						'bytes',
						{ tier, scenario },
					);

					// Mount the canvas ONCE per scenario. Re-mounting on every iteration
					// accumulates browser memory (147 k DOM elements per L-tier mount) and
					// crashes the tab on L / XL. Subsequent executions reuse the mounted
					// canvas — that's the cost we actually want to measure anyway, since
					// the mount cost is already captured by canvas-load.spec.ts.
					await n8n.page.goto('/workflows');
					await expect(n8n.page).toHaveURL(/\/workflows$/);
					await n8n.page.goto(`/workflow/${workflowId}`);
					await waitForCanvasReady(n8n.page, flowNodes, stickyNotes);

					// Verify Chromium's V8 heap limit reflects our launch arg (~8 GB expected,
					// ~2 GB means the flag was silently ignored). Logs once per page lifecycle.
					await logHeapLimitOnce(n8n.page, tier);

					const execSamples = await withWarmup(ITERATIONS, async () => {
						return await measurePerformance(n8n.page, `exec-${tier}-${slug}`, async () => {
							await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
								'Workflow executed successfully',
								{ timeout: EXEC_TIMEOUT_MS[tier] },
							);
						});
					});

					const dimensions = { tier, scenario };
					await attachMetric(
						testInfo,
						`canvas-exec-${slug}-${tier}-ms`,
						medianBy(execSamples, (sample) => sample),
						'ms',
						dimensions,
					);

					// Render-time proxy: how quickly execution status indicators paint across
					// the canvas once the run completes. Pinned and success badges are mutually
					// exclusive (pinned wins), so we count the union via
					// `getAllNodeExecutedIndicators()` — every traversed node lands in one bucket
					// or the other.
					const renderMs = await measurePerformance(
						n8n.page,
						`render-${tier}-${slug}`,
						async () => {
							await n8n.canvas.clickExecuteWorkflowButton();
							await expect(n8n.canvas.getAllNodeExecutedIndicators()).toHaveCount(
								TIER_CONFIG[tier].nodes,
								{ timeout: EXEC_TIMEOUT_MS[tier] },
							);
						},
					);
					await attachMetric(
						testInfo,
						`canvas-exec-render-${slug}-${tier}-ms`,
						renderMs,
						'ms',
						dimensions,
					);

					// Heap capture is expensive (40-55s stabilization). Only do it after the
					// heaviest scenario — that's the most meaningful leak signal anyway, and
					// running getStableHeap 3× per tier eats the test budget.
					await maybeCapturePostExecHeap({
						scenario,
						tier,
						testInfo,
						page: n8n.page,
						baseUrl: n8nContainer.baseUrl,
						metrics: services.observability.metrics,
					});

					console.log(
						`[CANVAS EXEC ${tier} ${slug}] exec=${medianBy(execSamples, (sample) => sample).toFixed(0)}ms · render=${renderMs.toFixed(0)}ms`,
					);

					expect(medianBy(execSamples, (sample) => sample)).toBeGreaterThan(0);

					// Reclaim what Chromium will let us free before mounting the next scenario.
					// Each L-tier mount allocates ~230 MB; without this, the tab crashes after
					// a few scenarios.
					await forceBrowserGc(n8n.page);
				}
			});
		}
	},
);
