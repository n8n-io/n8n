import type { TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

import {
	attachMetric,
	captureRssBreakdown,
	diffRssBreakdowns,
	getStableHeap,
	takeHeapSnapshot,
	type RssBreakdown,
	type RssBreakdownDiff,
	type StableHeapOptions,
	type StableHeapResult,
} from '../../../../utils/performance-helper';

export interface MemoryBenchmarkConfig {
	/** Playwright TestInfo for attaching metrics and artifacts */
	testInfo: TestInfo;
	/** Backend base URL for GC and heap-snapshot endpoints */
	baseUrl: string;
	/** VictoriaMetrics helper for heap queries */
	metrics: MetricsHelper;
	/** Extra dimensions to attach to all metrics (e.g., scenario name, node count) */
	dimensions?: Record<string, string | number>;
	/** Options for heap stabilization between phases */
	heapOptions?: StableHeapOptions;
	/** Whether to capture V8 heap snapshots at baseline and post-cleanup */
	captureSnapshots?: boolean;
	/**
	 * Skip all heap measurements — just run the phases and log timing.
	 * Useful for iterating on the e2e flow before enabling memory analysis.
	 */
	dryRun?: boolean;
	/**
	 * Optional warmup action run before baseline measurement.
	 * Pays one-time init costs (V8 JIT, lazy module loading, connection pools)
	 * so baseline reflects steady state rather than cold-start.
	 */
	warmup?: () => Promise<void>;
	/**
	 * Phase name after which to capture the target snapshot (mid-action, before cleanup).
	 * Gives memlab the contrast it needs: target has live + leaked objects, final has only leaked.
	 * If not set, target is captured after all phases (legacy behavior).
	 */
	captureTargetAfterPhase?: string;
	/** Max acceptable heap leak in MB (post-cleanup minus baseline). */
	maxLeakMB?: number;
	/** Max acceptable RSS growth in MB (post-cleanup minus baseline). */
	maxRssGrowthMB?: number;
}

export interface MemoryPhase {
	/** Human-readable name for this phase (used in metric names and logs) */
	name: string;
	/** The action to execute in this phase */
	action: () => Promise<void>;
	/** Whether to measure heap after this phase (default: true) */
	measureAfter?: boolean;
}

export interface PhaseResult {
	name: string;
	heap: StableHeapResult;
	/** Heap delta from baseline (MB) */
	deltaMB: number;
	/** Heap delta from previous phase (MB) */
	incrementMB: number;
}

export interface MemoryBenchmarkResult {
	baseline: StableHeapResult;
	phases: PhaseResult[];
	postCleanup: StableHeapResult;
	/** Post-cleanup heap minus baseline — the leaked amount (MB) */
	leakMB: number;
	/** Post-cleanup RSS minus baseline RSS (MB) */
	rssGrowthMB: number;
	/** Whether configured thresholds were met (true if no thresholds configured) */
	passed: boolean;
	/** Local paths to downloaded heap snapshots (for memlab analysis). Null if not captured. */
	snapshots: {
		baseline: string | null;
		target: string | null;
		final: string | null;
	};
	/** RSS breakdown diff between baseline and post-cleanup. Null if smaps unavailable. */
	rssBreakdown: RssBreakdownDiff | null;
}

/**
 * Run a memory benchmark with phased execution and heap measurement.
 *
 * Flow:
 * 1. GC + stabilize → record baseline
 * 2. For each phase: execute action → GC + stabilize → record delta
 * 3. Final GC + stabilize → compute leak = final - baseline
 * 4. Attach all metrics to test artifacts
 */
export async function runMemoryBenchmark(
	config: MemoryBenchmarkConfig,
	phases: MemoryPhase[],
): Promise<MemoryBenchmarkResult> {
	const {
		testInfo,
		baseUrl,
		metrics,
		dimensions = {},
		heapOptions,
		captureSnapshots,
		dryRun,
		warmup,
		captureTargetAfterPhase,
		maxLeakMB,
		maxRssGrowthMB,
	} = config;

	const emptyHeap: StableHeapResult = {
		heapUsedMB: 0,
		heapTotalMB: 0,
		rssMB: 0,
		pssMB: null,
		nonHeapOverheadMB: 0,
		stabilizationTimeMs: 0,
		readingsCount: 0,
	};

	console.log(
		`[MEMORY] Starting benchmark with ${phases.length} phases${dryRun ? ' (DRY RUN — no heap measurement)' : ''}`,
	);

	const snapshotPaths = {
		baseline: null as string | null,
		target: null as string | null,
		final: null as string | null,
	};

	// --- Warmup (optional) ---
	if (warmup) {
		console.log('[MEMORY] Warmup phase — paying one-time init costs before baseline');
		const warmupStart = Date.now();
		await warmup();
		const warmupElapsed = ((Date.now() - warmupStart) / 1000).toFixed(1);
		console.log(`[MEMORY] Warmup complete [${warmupElapsed}s]`);
	}

	// --- Baseline ---
	let baseline = emptyHeap;
	let baselineRss: RssBreakdown | null = null;
	if (!dryRun) {
		baseline = await getStableHeap(baseUrl, metrics, heapOptions);
		await attachMetric(testInfo, 'heap-pre-phase', baseline.heapUsedMB, 'MB', dimensions);
		baselineRss = await captureRssBreakdown(baseUrl, testInfo.outputDir, 'baseline');
		if (captureSnapshots) {
			snapshotPaths.baseline = await takeHeapSnapshot(baseUrl, testInfo, 'baseline');
		}
		console.log(`[MEMORY] Baseline: ${baseline.heapUsedMB.toFixed(1)} MB`);
	}

	// --- Execute phases ---
	const phaseResults: PhaseResult[] = [];
	let previousHeap = baseline.heapUsedMB;

	for (const phase of phases) {
		const shouldMeasure = !dryRun && phase.measureAfter !== false;
		const phaseStart = Date.now();

		console.log(`[MEMORY] Phase: ${phase.name}`);
		await phase.action();

		const elapsed = ((Date.now() - phaseStart) / 1000).toFixed(1);

		// Capture target snapshot mid-action if this is the designated phase
		if (
			!dryRun &&
			captureSnapshots &&
			captureTargetAfterPhase &&
			phase.name === captureTargetAfterPhase
		) {
			snapshotPaths.target = await takeHeapSnapshot(baseUrl, testInfo, 'target');
			console.log(`[MEMORY]   Target snapshot captured after phase "${phase.name}"`);
		}

		if (shouldMeasure) {
			const heap = await getStableHeap(baseUrl, metrics, heapOptions);
			const deltaMB = heap.heapUsedMB - baseline.heapUsedMB;
			const incrementMB = heap.heapUsedMB - previousHeap;

			phaseResults.push({ name: phase.name, heap, deltaMB, incrementMB });

			await attachMetric(testInfo, `heap-after-${phase.name}`, heap.heapUsedMB, 'MB', dimensions);

			console.log(
				`[MEMORY]   → ${heap.heapUsedMB.toFixed(1)} MB ` +
					`(Δ baseline: ${deltaMB >= 0 ? '+' : ''}${deltaMB.toFixed(1)} MB, ` +
					`Δ prev: ${incrementMB >= 0 ? '+' : ''}${incrementMB.toFixed(1)} MB) [${elapsed}s]`,
			);

			previousHeap = heap.heapUsedMB;
		} else {
			console.log(`[MEMORY]   → done [${elapsed}s]`);
		}
	}

	// --- Target snapshot fallback (only if not captured mid-phase) ---
	if (!dryRun && captureSnapshots && !snapshotPaths.target) {
		snapshotPaths.target = await takeHeapSnapshot(baseUrl, testInfo, 'target');
	}

	// --- Post-cleanup ---
	let postCleanup = emptyHeap;
	let leakMB = 0;
	let rssGrowthMB = 0;
	let passed = true;
	let rssBreakdown: RssBreakdownDiff | null = null;

	if (!dryRun) {
		postCleanup = await getStableHeap(baseUrl, metrics, heapOptions);
		leakMB = postCleanup.heapUsedMB - baseline.heapUsedMB;
		rssGrowthMB = postCleanup.rssMB - baseline.rssMB;

		await attachMetric(testInfo, 'heap-post-cleanup', postCleanup.heapUsedMB, 'MB', dimensions);
		await attachMetric(testInfo, 'leak-delta', leakMB, 'MB', dimensions);
		await attachMetric(testInfo, 'rss-growth', rssGrowthMB, 'MB', dimensions);

		if (captureSnapshots) {
			snapshotPaths.final = await takeHeapSnapshot(baseUrl, testInfo, 'final');
		}

		// Capture RSS breakdown and diff against baseline
		const finalRss = await captureRssBreakdown(baseUrl, testInfo.outputDir, 'final');
		if (baselineRss && finalRss) {
			rssBreakdown = diffRssBreakdowns(baselineRss, finalRss);

			await testInfo.attach('rss-breakdown-diff.json', {
				body: JSON.stringify(rssBreakdown, null, 2),
				contentType: 'application/json',
			});

			if (rssBreakdown.topGrowers.length > 0) {
				console.log('\n[RSS] ═══ Top RSS growers (baseline → final) ═══');
				for (const g of rssBreakdown.topGrowers.slice(0, 15)) {
					console.log(
						`  +${g.deltaMB.toFixed(1)} MB  ${g.name} (${g.baselineRssMB.toFixed(1)} → ${g.finalRssMB.toFixed(1)} MB)`,
					);
				}
			}
			if (rssBreakdown.topNew.length > 0) {
				console.log('[RSS] New mappings:');
				for (const n of rssBreakdown.topNew.slice(0, 10)) {
					console.log(`  +${n.rssMB.toFixed(1)} MB  ${n.name}`);
				}
			}
			if (rssBreakdown.rollupDiff) {
				console.log('[RSS] Rollup diff:');
				for (const [key, { baseline: b, final: f, delta }] of Object.entries(
					rssBreakdown.rollupDiff,
				)) {
					if (Math.abs(delta) > 1) {
						console.log(`  ${key}: ${b} → ${f} MB (${delta >= 0 ? '+' : ''}${delta} MB)`);
					}
				}
			}
		}

		// Check thresholds
		if (maxLeakMB !== undefined && leakMB > maxLeakMB) {
			console.error(
				`[MEMORY] THRESHOLD EXCEEDED: heap leak ${leakMB.toFixed(1)} MB > maxLeakMB ${maxLeakMB} MB`,
			);
			passed = false;
		}
		if (maxRssGrowthMB !== undefined && rssGrowthMB > maxRssGrowthMB) {
			console.error(
				`[MEMORY] THRESHOLD EXCEEDED: RSS growth ${rssGrowthMB.toFixed(1)} MB > maxRssGrowthMB ${maxRssGrowthMB} MB`,
			);
			passed = false;
		}

		console.log(
			'\n[MEMORY] ═══ Summary ═══\n' +
				`  Baseline:     ${baseline.heapUsedMB.toFixed(1)} MB\n` +
				`  Post-cleanup: ${postCleanup.heapUsedMB.toFixed(1)} MB\n` +
				`  Leak delta:   ${leakMB >= 0 ? '+' : ''}${leakMB.toFixed(1)} MB` +
				`${maxLeakMB !== undefined ? ` (threshold: ${maxLeakMB} MB)` : ''}\n` +
				`  RSS baseline: ${baseline.rssMB.toFixed(1)} MB → final: ${postCleanup.rssMB.toFixed(1)} MB` +
				` (Δ ${rssGrowthMB >= 0 ? '+' : ''}${rssGrowthMB.toFixed(1)} MB` +
				`${maxRssGrowthMB !== undefined ? `, threshold: ${maxRssGrowthMB} MB` : ''})\n` +
				`  Phases:       ${phaseResults.length} measured\n` +
				`  Result:       ${passed ? 'PASSED' : 'FAILED'}\n`,
		);
	} else {
		console.log('\n[MEMORY] ═══ Dry run complete ═══');
	}

	return {
		baseline,
		phases: phaseResults,
		postCleanup,
		leakMB,
		rssGrowthMB,
		passed,
		snapshots: snapshotPaths,
		rssBreakdown,
	};
}
