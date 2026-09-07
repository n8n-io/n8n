#!/usr/bin/env npx tsx
/**
 * Standalone heap analysis script.
 *
 * Usage:
 *   npx tsx utils/benchmark/run-heap-analysis.ts <baseline> <target> <final> [--output <dir>]
 *
 * Example:
 *   npx tsx utils/benchmark/run-heap-analysis.ts \
 *     test-results/.../baseline.heapsnapshot \
 *     test-results/.../target.heapsnapshot \
 *     test-results/.../final.heapsnapshot
 *
 * Can also be imported as a module:
 *   import { runFullHeapAnalysis } from './run-heap-analysis';
 *   const report = await runFullHeapAnalysis(baseline, target, final);
 */

import { findLeaksBySnapshotFilePaths, ConsoleMode } from '@memlab/api';
import {
	getFullHeapFromFile,
	ObjectUnboundGrowthAnalysis,
	ShapeUnboundGrowthAnalysis,
} from '@memlab/heap-analysis';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeapDiffEntry {
	name: string;
	type: string;
	countBaseline: number;
	countFinal: number;
	countDelta: number;
	sizeBaselineBytes: number;
	sizeFinalBytes: number;
	sizeDeltaBytes: number;
}

export interface FullHeapReport {
	memlabSuspects: number;
	memlabLeaks: unknown[];
	heapDiff: HeapDiffEntry[];
	unboundGrowthOutput: string | null;
	shapeGrowthOutput: string | null;
}

// ---------------------------------------------------------------------------
// Core analysis functions (importable)
// ---------------------------------------------------------------------------

/** Run memlab's standard leak detection (retainer-chain based). */
export async function findMemlabLeaks(
	baselinePath: string,
	targetPath: string,
	finalPath: string,
): Promise<unknown[]> {
	console.log('[ANALYSIS] Running memlab leak detection...');
	const leaks = await findLeaksBySnapshotFilePaths(baselinePath, targetPath, finalPath, {
		consoleMode: ConsoleMode.SILENT,
	});
	console.log(`[ANALYSIS]   suspects: ${leaks.length}`);
	return leaks;
}

/** Diff two heap snapshots by constructor name — returns entries sorted by size delta. */
export async function computeHeapDiff(
	baselinePath: string,
	finalPath: string,
): Promise<HeapDiffEntry[]> {
	console.log('[ANALYSIS] Computing heap diff (baseline vs final)...');

	const baselineHeap = await getFullHeapFromFile(baselinePath);
	const finalHeap = await getFullHeapFromFile(finalPath);

	const baseCounts = new Map<string, { count: number; size: number }>();
	const finalCounts = new Map<string, { count: number; size: number }>();

	baselineHeap.nodes.forEach((node) => {
		const key = `${node.type}::${node.name}`;
		const e = baseCounts.get(key) ?? { count: 0, size: 0 };
		e.count++;
		e.size += node.retainedSize;
		baseCounts.set(key, e);
	});

	finalHeap.nodes.forEach((node) => {
		const key = `${node.type}::${node.name}`;
		const e = finalCounts.get(key) ?? { count: 0, size: 0 };
		e.count++;
		e.size += node.retainedSize;
		finalCounts.set(key, e);
	});

	const allKeys = new Set([...baseCounts.keys(), ...finalCounts.keys()]);
	const diffs: HeapDiffEntry[] = [];

	for (const key of allKeys) {
		const b = baseCounts.get(key) ?? { count: 0, size: 0 };
		const f = finalCounts.get(key) ?? { count: 0, size: 0 };
		const sizeDelta = f.size - b.size;

		if (sizeDelta > 0) {
			const [type, name] = key.split('::');
			diffs.push({
				name,
				type,
				countBaseline: b.count,
				countFinal: f.count,
				countDelta: f.count - b.count,
				sizeBaselineBytes: b.size,
				sizeFinalBytes: f.size,
				sizeDeltaBytes: sizeDelta,
			});
		}
	}

	diffs.sort((a, b) => b.sizeDeltaBytes - a.sizeDeltaBytes);
	return diffs;
}

/** Run ObjectUnboundGrowthAnalysis and ShapeUnboundGrowthAnalysis across snapshots. */
export async function runGrowthAnalysis(
	baselinePath: string,
	targetPath: string,
	finalPath: string,
	workDir: string,
): Promise<{ unboundGrowthOutput: string | null; shapeGrowthOutput: string | null }> {
	console.log('[ANALYSIS] Running growth analysis...');

	const analysisDir = join(workDir, 'growth-analysis');
	await mkdir(analysisDir, { recursive: true });
	await copyFile(baselinePath, join(analysisDir, 's1.heapsnapshot'));
	await copyFile(targetPath, join(analysisDir, 's2.heapsnapshot'));
	await copyFile(finalPath, join(analysisDir, 's3.heapsnapshot'));

	let unboundGrowthOutput: string | null = null;
	let shapeGrowthOutput: string | null = null;

	try {
		const oa = new ObjectUnboundGrowthAnalysis();
		const or = await oa.analyzeSnapshotsInDirectory(analysisDir, {
			workDir: join(analysisDir, 'object-growth'),
		});
		unboundGrowthOutput = await readFile(or.analysisOutputFile, 'utf-8');
		console.log('[ANALYSIS]   Object growth analysis complete');
	} catch (error) {
		console.warn(`[ANALYSIS]   Object growth failed: ${(error as Error).message}`);
	}

	try {
		const sa = new ShapeUnboundGrowthAnalysis();
		const sr = await sa.analyzeSnapshotsInDirectory(analysisDir, {
			workDir: join(analysisDir, 'shape-growth'),
		});
		shapeGrowthOutput = await readFile(sr.analysisOutputFile, 'utf-8');
		console.log('[ANALYSIS]   Shape growth analysis complete');
	} catch (error) {
		console.warn(`[ANALYSIS]   Shape growth failed: ${(error as Error).message}`);
	}

	return { unboundGrowthOutput, shapeGrowthOutput };
}

/** Run all three analyses and return a combined report. */
export async function runFullHeapAnalysis(
	baselinePath: string,
	targetPath: string,
	finalPath: string,
	workDir?: string,
): Promise<FullHeapReport> {
	const outputDir = workDir ?? dirname(finalPath);

	const leaks = await findMemlabLeaks(baselinePath, targetPath, finalPath);
	const heapDiff = await computeHeapDiff(baselinePath, finalPath);
	const { unboundGrowthOutput, shapeGrowthOutput } = await runGrowthAnalysis(
		baselinePath,
		targetPath,
		finalPath,
		outputDir,
	);

	const report: FullHeapReport = {
		memlabSuspects: leaks.length,
		memlabLeaks: leaks,
		heapDiff,
		unboundGrowthOutput,
		shapeGrowthOutput,
	};

	// Print summary
	console.log('\n[ANALYSIS] ═══ Report ═══');
	console.log(`  memlab suspects: ${report.memlabSuspects}`);
	console.log('  Heap diff (top 25 by retained size growth):');
	for (const entry of heapDiff.slice(0, 25)) {
		const sizeMB = (entry.sizeDeltaBytes / 1024 / 1024).toFixed(2);
		console.log(`    +${entry.countDelta} × ${entry.name} (${entry.type}) — ${sizeMB} MB`);
	}

	return report;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

async function main() {
	const rawArgs = process.argv.slice(2);
	const outputIdx = rawArgs.indexOf('--output');
	const outputDir = outputIdx !== -1 ? rawArgs[outputIdx + 1] : undefined;

	const args: string[] = [];
	for (let i = 0; i < rawArgs.length; i++) {
		if (rawArgs[i].startsWith('--')) {
			i++; // skip the flag's value
			continue;
		}
		args.push(rawArgs[i]);
	}

	if (args.length < 3) {
		console.error('Usage: run-heap-analysis.ts <baseline> <target> <final> [--output <dir>]');
		process.exit(1);
	}

	const [baseline, target, finalSnapshot] = args;
	const report = await runFullHeapAnalysis(baseline, target, finalSnapshot, outputDir);

	const reportPath = join(outputDir ?? dirname(finalSnapshot), 'heap-analysis-report.json');
	await writeFile(reportPath, JSON.stringify(report, null, 2));
	console.log(`\n[ANALYSIS] Full report saved to ${reportPath}`);
}

// Run if executed directly
const isDirectExecution = process.argv[1]?.includes('run-heap-analysis');
if (isDirectExecution) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
