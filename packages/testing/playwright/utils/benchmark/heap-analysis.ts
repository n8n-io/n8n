import type { TestInfo } from '@playwright/test';
import { findLeaksBySnapshotFilePaths, ConsoleMode } from '@memlab/api';

export interface LeakReport {
	leakCount: number;
	leaks: Array<Record<string, unknown>>;
}

/**
 * Analyze three heap snapshots using memlab to detect memory leaks.
 *
 * memlab's three-snapshot model:
 * - baseline: before any work (clean state)
 * - target: after work is done (peak memory, before cleanup)
 * - final: after cleanup (should return to baseline — anything retained is a leak)
 *
 * Objects allocated between baseline→target that still exist in final are leak suspects.
 */
export async function analyzeHeapLeaks(
	baselinePath: string,
	targetPath: string,
	finalPath: string,
	testInfo: TestInfo,
): Promise<LeakReport> {
	console.log('[HEAP-ANALYSIS] Running memlab leak detection...');
	console.log(`  baseline: ${baselinePath}`);
	console.log(`  target:   ${targetPath}`);
	console.log(`  final:    ${finalPath}`);

	const leaks = await findLeaksBySnapshotFilePaths(baselinePath, targetPath, finalPath, {
		consoleMode: ConsoleMode.SILENT,
	});

	const report: LeakReport = {
		leakCount: leaks.length,
		leaks: leaks as unknown as Array<Record<string, unknown>>,
	};

	// Attach structured report as test artifact — agents parse this
	await testInfo.attach('leak-analysis.json', {
		body: JSON.stringify(report, null, 2),
		contentType: 'application/json',
	});

	// Human-readable summary
	console.log(`\n[HEAP-ANALYSIS] ═══ Leak Report ═══`);
	console.log(`  Leak suspects: ${report.leakCount}`);

	if (report.leakCount > 0) {
		for (const leak of report.leaks.slice(0, 10)) {
			// ISerializedInfo is a recursive key-value — log the top-level keys
			const keys = Object.keys(leak);
			console.log(`  - ${JSON.stringify(leak).slice(0, 200)}`);
			if (keys.length > 3) {
				console.log(`    (${keys.length} properties)`);
			}
		}
		if (report.leakCount > 10) {
			console.log(`  ... and ${report.leakCount - 10} more`);
		}
	} else {
		console.log('  No leaks detected!');
	}

	return report;
}
