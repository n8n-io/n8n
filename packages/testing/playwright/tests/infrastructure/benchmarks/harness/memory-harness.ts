import type { TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

import {
	attachMetric,
	getStableHeap,
	takeHeapSnapshot,
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
	/** Local paths to downloaded heap snapshots (for memlab analysis). Null if not captured. */
	snapshots: {
		baseline: string | null;
		target: string | null;
		final: string | null;
	};
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

	// --- Baseline ---
	let baseline = emptyHeap;
	if (!dryRun) {
		baseline = await getStableHeap(baseUrl, metrics, heapOptions);
		await attachMetric(testInfo, 'heap-baseline', baseline.heapUsedMB, 'MB', dimensions);
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

	// --- Target snapshot (peak state, before cleanup) ---
	if (!dryRun && captureSnapshots) {
		snapshotPaths.target = await takeHeapSnapshot(baseUrl, testInfo, 'target');
	}

	// --- Post-cleanup ---
	let postCleanup = emptyHeap;
	let leakMB = 0;

	if (!dryRun) {
		postCleanup = await getStableHeap(baseUrl, metrics, heapOptions);
		leakMB = postCleanup.heapUsedMB - baseline.heapUsedMB;

		await attachMetric(testInfo, 'heap-post-cleanup', postCleanup.heapUsedMB, 'MB', dimensions);
		await attachMetric(testInfo, 'leak-delta', leakMB, 'MB', dimensions);

		if (captureSnapshots) {
			snapshotPaths.final = await takeHeapSnapshot(baseUrl, testInfo, 'final');
		}

		console.log(
			`\n[MEMORY] ═══ Summary ═══\n` +
				`  Baseline:     ${baseline.heapUsedMB.toFixed(1)} MB\n` +
				`  Post-cleanup: ${postCleanup.heapUsedMB.toFixed(1)} MB\n` +
				`  Leak delta:   ${leakMB >= 0 ? '+' : ''}${leakMB.toFixed(1)} MB\n` +
				`  RSS baseline: ${baseline.rssMB.toFixed(1)} MB → final: ${postCleanup.rssMB.toFixed(1)} MB\n` +
				`  Phases:       ${phaseResults.length} measured\n`,
		);
	} else {
		console.log(`\n[MEMORY] ═══ Dry run complete ═══`);
	}

	return { baseline, phases: phaseResults, postCleanup, leakMB, snapshots: snapshotPaths };
}
