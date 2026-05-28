import { TIER_CONFIG, buildCanvasBenchmarkWorkflow, type Tier } from './fixtures/generate-workflow';
import { waitForCanvasReady } from './helpers/canvas-ready';
import { bytesToMb, captureCdpMetrics } from './helpers/cdp-metrics';
import { medianBy, withWarmup } from './helpers/iterate';
import { fmt, formatReport } from './helpers/report';
import { test, expect } from '../../../fixtures/base';
import { attachMetric, getStableHeap } from '../../../utils/performance-helper';

const ITERATIONS = 3;
const TIERS: Tier[] = ['S', 'M', 'L'];

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe(
	'Canvas Load Benchmark',
	{ annotation: [{ type: 'owner', description: 'Canvas' }] },
	() => {
		for (const tier of TIERS) {
			test(`loads ${tier}-tier workflow @tier:${tier}`, async ({
				n8n,
				api,
				n8nContainer,
				services,
			}, testInfo) => {
				test.skip(
					tier !== 'S' && !!process.env.CI,
					'CI only runs S tier; M / L run locally via `pnpm bench:canvas`',
				);

				const { workflow } = buildCanvasBenchmarkWorkflow({ tier });
				const created = await api.workflows.createWorkflow(workflow);
				const workflowId: string = String(created.id);
				const { nodes: flowNodes, stickyNotes } = TIER_CONFIG[tier];

				await n8n.page.setViewportSize({ width: 1536, height: 960 });
				await n8n.page.emulateMedia({ reducedMotion: 'reduce' });

				const samples = await withWarmup(ITERATIONS, async () => {
					await n8n.page.goto('/workflows');
					await expect(n8n.page).toHaveURL(/\/workflows$/);

					const navigationStart = Date.now();
					await n8n.page.goto(`/workflow/${workflowId}`);
					await waitForCanvasReady(n8n.page, flowNodes, stickyNotes);
					const coldLoadMs = Date.now() - navigationStart;

					const cdp = await captureCdpMetrics(n8n.page);

					return {
						coldLoadMs,
						browserHeapMB: bytesToMb(cdp.JSHeapUsedSize),
						domNodes: cdp.Nodes ?? 0,
						layoutDurationMs: (cdp.LayoutDuration ?? 0) * 1000,
						scriptDurationMs: (cdp.ScriptDuration ?? 0) * 1000,
					};
				});

				const server = await getStableHeap(n8nContainer.baseUrl, services.observability.metrics, {
					logGC: false,
				});

				const dimensions = { tier };
				const medianLoad = medianBy(samples, (sample) => sample.coldLoadMs);
				const medianBrowserHeap = medianBy(samples, (sample) => sample.browserHeapMB);
				const medianDomNodes = medianBy(samples, (sample) => sample.domNodes);
				const medianLayout = medianBy(samples, (sample) => sample.layoutDurationMs);
				const medianScript = medianBy(samples, (sample) => sample.scriptDurationMs);

				await attachMetric(testInfo, `canvas-cold-load-${tier}-ms`, medianLoad, 'ms', dimensions);
				await attachMetric(
					testInfo,
					`canvas-server-heap-${tier}-mb`,
					server.heapUsedMB,
					'MB',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-server-rss-${tier}-mb`,
					server.rssMB,
					'MB',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-browser-heap-${tier}-mb`,
					medianBrowserHeap,
					'MB',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-dom-nodes-${tier}`,
					medianDomNodes,
					'count',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-layout-duration-${tier}-ms`,
					medianLayout,
					'ms',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-script-duration-${tier}-ms`,
					medianScript,
					'ms',
					dimensions,
				);

				console.log(
					formatReport(`Canvas Load Benchmark — ${tier} tier`, [
						{
							heading: 'Page',
							rows: [
								{ label: 'Cold load', value: fmt.ms(medianLoad) },
								{ label: 'DOM nodes', value: fmt.count(medianDomNodes) },
								{ label: 'Layout duration', value: fmt.ms(medianLayout) },
								{ label: 'Script duration', value: fmt.ms(medianScript) },
							],
						},
						{
							heading: 'Memory',
							rows: [
								{ label: 'Server heap', value: fmt.mb(server.heapUsedMB) },
								{ label: 'Server RSS', value: fmt.mb(server.rssMB) },
								{ label: 'Browser heap', value: fmt.mb(medianBrowserHeap) },
							],
						},
					]),
				);

				expect(medianLoad).toBeGreaterThan(0);
				expect(server.heapUsedMB).toBeGreaterThan(0);
				expect(medianDomNodes).toBeGreaterThan(0);
			});
		}
	},
);
