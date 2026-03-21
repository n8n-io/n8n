/**
 * Baseline Management
 *
 * Stores known violations so incremental cleanup doesn't fail on pre-existing issues.
 * Only NEW violations (not in baseline) will cause failures.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Violation, JanitorReport } from '../types.js';

const BASELINE_FILENAME = '.janitor-baseline.json';
const BASELINE_VERSION = 1;

export interface BaselineEntry {
	rule: string;
	line: number;
	message: string;
	/** Hash of message + context for fuzzy matching when lines shift */
	hash: string;
}

export interface BaselineFile {
	version: number;
	generated: string;
	totalViolations: number;
	violations: Record<string, BaselineEntry[]>;
}

/**
 * Generate a hash for a violation to enable fuzzy matching
 * when line numbers shift due to edits above the violation
 */
function hashViolation(violation: Violation): string {
	// Hash based on rule + message (not line number)
	const content = `${violation.rule}:${violation.message}`;
	return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

/**
 * Get the baseline file path for a given root directory
 */
export function getBaselinePath(rootDir: string): string {
	return path.join(rootDir, BASELINE_FILENAME);
}

/**
 * Check if a baseline file exists
 */
export function hasBaseline(rootDir: string): boolean {
	return fs.existsSync(getBaselinePath(rootDir));
}

/**
 * Load baseline from disk if it exists
 */
export function loadBaseline(rootDir: string): BaselineFile | null {
	const baselinePath = getBaselinePath(rootDir);

	if (!fs.existsSync(baselinePath)) {
		return null;
	}

	try {
		const content = fs.readFileSync(baselinePath, 'utf-8');
		const baseline = JSON.parse(content) as BaselineFile;

		// Version check for future compatibility
		if (baseline.version !== BASELINE_VERSION) {
			console.warn(
				`Baseline version mismatch (got ${baseline.version}, expected ${BASELINE_VERSION}). Regenerate with: janitor baseline`,
			);
		}

		return baseline;
	} catch (error) {
		console.warn(`Failed to load baseline: ${(error as Error).message}`);
		return null;
	}
}

/**
 * Generate a baseline from a janitor report
 */
export function generateBaseline(report: JanitorReport, rootDir: string): BaselineFile {
	const violations: Record<string, BaselineEntry[]> = {};

	for (const result of report.results) {
		for (const violation of result.violations) {
			// Use relative path for portability
			const relativePath = path.relative(rootDir, violation.file);

			if (!violations[relativePath]) {
				violations[relativePath] = [];
			}

			violations[relativePath].push({
				rule: violation.rule,
				line: violation.line,
				message: violation.message,
				hash: hashViolation(violation),
			});
		}
	}

	return {
		version: BASELINE_VERSION,
		generated: new Date().toISOString(),
		totalViolations: report.summary.totalViolations,
		violations,
	};
}

/**
 * Save baseline to disk
 */
export function saveBaseline(baseline: BaselineFile, rootDir: string): void {
	const baselinePath = getBaselinePath(rootDir);
	fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, '\t') + '\n');
}

/**
 * Check if a violation exists in the baseline
 * Uses fuzzy matching: same file + same hash (rule + message)
 */
function isInBaseline(violation: Violation, baseline: BaselineFile, rootDir: string): boolean {
	const relativePath = path.relative(rootDir, violation.file);
	const fileBaseline = baseline.violations[relativePath];

	if (!fileBaseline) {
		return false;
	}

	const violationHash = hashViolation(violation);

	// Check for matching hash (same rule + message, regardless of line shift)
	return fileBaseline.some((entry) => entry.hash === violationHash);
}

/**
 * Filter violations to only return NEW ones (not in baseline)
 */
export function filterNewViolations(
	violations: Violation[],
	baseline: BaselineFile,
	rootDir: string,
): Violation[] {
	return violations.filter((v) => !isInBaseline(v, baseline, rootDir));
}

/**
 * Filter a full report to only include new violations
 */
export function filterReportByBaseline(
	report: JanitorReport,
	baseline: BaselineFile,
	rootDir: string,
): JanitorReport {
	const filteredResults = report.results.map((result) => ({
		...result,
		violations: filterNewViolations(result.violations, baseline, rootDir),
	}));

	// Recalculate summary
	let totalViolations = 0;
	const byRule: Record<string, number> = {};
	const bySeverity: Record<string, number> = { error: 0, warning: 0, info: 0 };

	for (const result of filteredResults) {
		totalViolations += result.violations.length;
		byRule[result.rule] = result.violations.length;

		for (const violation of result.violations) {
			bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
		}
	}

	return {
		...report,
		results: filteredResults,
		summary: {
			...report.summary,
			totalViolations,
			byRule,
			bySeverity: bySeverity as Record<'error' | 'warning' | 'info', number>,
		},
	};
}

/**
 * Format baseline info for console output
 */
export function formatBaselineInfo(baseline: BaselineFile): string {
	const lines: string[] = [
		`Baseline loaded (${baseline.totalViolations} known violations from ${baseline.generated})`,
	];

	const fileCount = Object.keys(baseline.violations).length;
	lines.push(`  Files with violations: ${fileCount}`);

	return lines.join('\n');
}
