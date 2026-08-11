import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Violation, Report, Severity } from './types.js';

const BASELINE_VERSION = 1;

export interface BaselineEntry {
	rule: string;
	line: number;
	message: string;
	hash: string;
}

export interface BaselineFile {
	version: number;
	generated: string;
	totalViolations: number;
	violations: Record<string, BaselineEntry[]>;
}

function hashViolation(violation: Violation, rootDir: string): string {
	const relativePath = path.relative(rootDir, violation.file);
	const content = `${relativePath}:${violation.rule}:${violation.message}`;
	return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

export function loadBaseline(filePath: string): BaselineFile | null {
	if (!fs.existsSync(filePath)) return null;

	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const baseline = JSON.parse(content) as BaselineFile;

		if (baseline.version !== BASELINE_VERSION) {
			console.warn(
				`Baseline version mismatch (got ${baseline.version}, expected ${BASELINE_VERSION}). Regenerate baseline.`,
			);
		}

		return baseline;
	} catch {
		return null;
	}
}

/**
 * Merge `report`'s violations into `previous` and return the combined baseline.
 *
 * Additive on purpose. A violation absent from the report may have been fixed, but it may equally
 * never have been looked at — the rule was disabled, or scoped to changed files and none of its
 * files changed. Those two cases are indistinguishable from a report, so dropping entries would
 * let a regeneration meant to record one new exception silently un-baseline unrelated rules.
 * Matching is by hash, so an entry for a violation that no longer exists is inert.
 *
 * To shrink the baseline, delete the file and regenerate it in a run that covers every rule.
 */
export function generateBaseline(
	report: Report,
	rootDir: string,
	previous?: BaselineFile | null,
): BaselineFile {
	const violations: Record<string, BaselineEntry[]> = {};
	const seen = new Set<string>();

	// The hash covers path, rule and message, so it dedupes across previous and report alike.
	const add = (relativePath: string, entry: BaselineEntry): void => {
		if (seen.has(entry.hash)) return;
		seen.add(entry.hash);
		violations[relativePath] ??= [];
		violations[relativePath].push(entry);
	};

	for (const [relativePath, entries] of Object.entries(previous?.violations ?? {})) {
		for (const entry of entries) add(relativePath, entry);
	}

	for (const result of report.results) {
		for (const violation of result.violations) {
			add(path.relative(rootDir, violation.file), {
				rule: violation.rule,
				line: violation.line,
				message: violation.message,
				hash: hashViolation(violation, rootDir),
			});
		}
	}

	return {
		version: BASELINE_VERSION,
		generated: new Date().toISOString(),
		totalViolations: seen.size,
		violations,
	};
}

export function saveBaseline(baseline: BaselineFile, filePath: string): void {
	fs.writeFileSync(filePath, JSON.stringify(baseline, null, '\t') + '\n');
}

function isInBaseline(violation: Violation, baseline: BaselineFile, rootDir: string): boolean {
	const relativePath = path.relative(rootDir, violation.file);
	const fileBaseline = baseline.violations[relativePath];
	if (!fileBaseline) return false;

	const violationHash = hashViolation(violation, rootDir);
	return fileBaseline.some((entry) => entry.hash === violationHash);
}

export function filterViolations(
	violations: Violation[],
	baseline: BaselineFile,
	rootDir: string,
): Violation[] {
	return violations.filter((v) => !isInBaseline(v, baseline, rootDir));
}

export function filterReportByBaseline(
	report: Report,
	baseline: BaselineFile,
	rootDir: string,
): Report {
	const filteredResults = report.results.map((result) => ({
		...result,
		violations: filterViolations(result.violations, baseline, rootDir),
	}));

	let totalViolations = 0;
	const byRule: Record<string, number> = {};
	const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };

	for (const result of filteredResults) {
		totalViolations += result.violations.length;
		byRule[result.rule] = result.violations.length;
		for (const violation of result.violations) {
			bySeverity[violation.severity]++;
		}
	}

	return {
		...report,
		results: filteredResults,
		summary: {
			...report.summary,
			totalViolations,
			byRule,
			bySeverity,
		},
	};
}
