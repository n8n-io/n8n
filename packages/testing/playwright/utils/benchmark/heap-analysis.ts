import type { TestInfo } from '@playwright/test';

import { runFullHeapAnalysis, type FullHeapReport } from './run-heap-analysis';

/**
 * Run heap analysis and attach results as Playwright test artifacts.
 * Thin wrapper around the reusable `runFullHeapAnalysis` module.
 */
export async function analyzeHeapLeaks(
	baselinePath: string,
	targetPath: string,
	finalPath: string,
	testInfo: TestInfo,
): Promise<FullHeapReport> {
	const report = await runFullHeapAnalysis(baselinePath, targetPath, finalPath, testInfo.outputDir);

	await testInfo.attach('leak-analysis.json', {
		body: JSON.stringify(report, null, 2),
		contentType: 'application/json',
	});

	return report;
}

export type { FullHeapReport, HeapDiffEntry } from './run-heap-analysis';
