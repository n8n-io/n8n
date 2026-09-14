/**
 * Shared utility for extracting AST diffs from changed files.
 *
 * Used by both the standalone `impact` CLI command and the TCR executor
 * to enable method-level impact resolution.
 */

import { diffFileMethods, type FileDiffResult } from './ast-diff-analyzer.js';

/**
 * Extract AST diffs for source files (non-test .ts files).
 * Test files are skipped — they're already included as directly changed.
 */
export function extractDiffs(changedFiles: string[], baseRef: string): FileDiffResult[] {
	const diffs: FileDiffResult[] = [];
	for (const file of changedFiles) {
		if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
			diffs.push(diffFileMethods(file, baseRef));
		}
	}
	return diffs;
}
