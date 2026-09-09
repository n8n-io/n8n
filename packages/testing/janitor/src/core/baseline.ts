import {
	filterReportByBaseline as engineFilterReportByBaseline,
	filterViolations as engineFilterViolations,
	generateBaseline as engineGenerateBaseline,
	loadBaseline as engineLoadBaseline,
	saveBaseline as engineSaveBaseline,
} from '@n8n/rules-engine';
import type { BaselineFile } from '@n8n/rules-engine';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { JanitorReport, Violation } from '../types.js';

export type { BaselineFile, BaselineEntry } from '@n8n/rules-engine';

const BASELINE_FILENAME = '.janitor-baseline.json';

export function getBaselinePath(rootDir: string): string {
	return path.join(rootDir, BASELINE_FILENAME);
}

export function hasBaseline(rootDir: string): boolean {
	return fs.existsSync(getBaselinePath(rootDir));
}

export function loadBaseline(rootDir: string): BaselineFile | null {
	return engineLoadBaseline(getBaselinePath(rootDir));
}

export function generateBaseline(report: JanitorReport, rootDir: string): BaselineFile {
	return engineGenerateBaseline(report, rootDir);
}

export function saveBaseline(baseline: BaselineFile, rootDir: string): void {
	engineSaveBaseline(baseline, getBaselinePath(rootDir));
}

export function filterNewViolations(
	violations: Violation[],
	baseline: BaselineFile,
	rootDir: string,
): Violation[] {
	return engineFilterViolations(violations, baseline, rootDir);
}

export function filterReportByBaseline(
	report: JanitorReport,
	baseline: BaselineFile,
	rootDir: string,
): JanitorReport {
	return engineFilterReportByBaseline(report, baseline, rootDir);
}

export function formatBaselineInfo(baseline: BaselineFile): string {
	const fileCount = Object.keys(baseline.violations).length;
	const totalViolations = Object.values(baseline.violations).reduce(
		(sum, entries) => sum + entries.length,
		0,
	);
	return `Baseline loaded (${totalViolations} known violations)\n  Files with violations: ${fileCount}`;
}
