import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
	generateBaseline,
	saveBaseline,
	loadBaseline,
	hasBaseline,
	filterNewViolations,
	filterReportByBaseline,
	getBaselinePath,
	type BaselineFile,
} from './baseline.js';
import type { Violation, JanitorReport } from '../types.js';

describe('baseline', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'janitor-baseline-test-'));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe('getBaselinePath', () => {
		it('returns correct path', () => {
			const result = getBaselinePath('/some/project');
			expect(result).toBe('/some/project/.janitor-baseline.json');
		});
	});

	describe('hasBaseline', () => {
		it('returns false when no baseline exists', () => {
			expect(hasBaseline(tempDir)).toBe(false);
		});

		it('returns true when baseline exists', () => {
			fs.writeFileSync(path.join(tempDir, '.janitor-baseline.json'), '{}');
			expect(hasBaseline(tempDir)).toBe(true);
		});
	});

	describe('generateBaseline', () => {
		it('creates baseline from report', () => {
			const report: JanitorReport = {
				timestamp: '2024-01-01T00:00:00Z',
				projectRoot: tempDir,
				rules: { enabled: ['dead-code'], disabled: [] },
				results: [
					{
						rule: 'dead-code',
						violations: [
							{
								file: path.join(tempDir, 'pages/TestPage.ts'),
								line: 10,
								column: 1,
								rule: 'dead-code',
								message: 'Unused method: oldMethod',
								severity: 'warning',
							},
						],
						filesAnalyzed: 1,
						executionTimeMs: 10,
					},
				],
				summary: {
					totalViolations: 1,
					byRule: { 'dead-code': 1 },
					bySeverity: { error: 0, warning: 1, info: 0 },
					filesAnalyzed: 1,
				},
			};

			const baseline = generateBaseline(report, tempDir);

			expect(baseline.version).toBe(1);
			expect(baseline.totalViolations).toBe(1);
			expect(baseline.violations['pages/TestPage.ts']).toHaveLength(1);
			expect(baseline.violations['pages/TestPage.ts'][0].rule).toBe('dead-code');
			expect(baseline.violations['pages/TestPage.ts'][0].line).toBe(10);
			expect(baseline.violations['pages/TestPage.ts'][0].hash).toBeDefined();
		});
	});

	describe('saveBaseline / loadBaseline', () => {
		it('round-trips baseline to disk', () => {
			const baseline: BaselineFile = {
				version: 1,
				generated: '2024-01-01T00:00:00Z',
				totalViolations: 2,
				violations: {
					'pages/TestPage.ts': [
						{ rule: 'dead-code', line: 10, message: 'Unused method', hash: 'abc123' },
					],
				},
			};

			saveBaseline(baseline, tempDir);
			const loaded = loadBaseline(tempDir);

			expect(loaded).not.toBeNull();
			expect(loaded!.version).toBe(1);
			expect(loaded!.totalViolations).toBe(2);
			expect(loaded!.violations['pages/TestPage.ts']).toHaveLength(1);
		});

		it('returns null when no baseline exists', () => {
			const loaded = loadBaseline(tempDir);
			expect(loaded).toBeNull();
		});
	});

	describe('filterNewViolations', () => {
		const baseline: BaselineFile = {
			version: 1,
			generated: '2024-01-01T00:00:00Z',
			totalViolations: 1,
			violations: {
				'pages/TestPage.ts': [
					{
						rule: 'dead-code',
						line: 10,
						message: 'Unused method: oldMethod',
						hash: 'abc123', // This hash matches the violation below
					},
				],
			},
		};

		it('filters out violations in baseline', () => {
			// Create a violation that matches the baseline (same rule + message = same hash)
			const violations: Violation[] = [
				{
					file: path.join(tempDir, 'pages/TestPage.ts'),
					line: 10,
					column: 1,
					rule: 'dead-code',
					message: 'Unused method: oldMethod',
					severity: 'warning',
				},
			];

			// Generate a real baseline from these violations to get matching hashes
			const report: JanitorReport = {
				timestamp: '',
				projectRoot: tempDir,
				rules: { enabled: [], disabled: [] },
				results: [{ rule: 'dead-code', violations, filesAnalyzed: 1, executionTimeMs: 0 }],
				summary: {
					totalViolations: 1,
					byRule: {},
					bySeverity: { error: 0, warning: 0, info: 0 },
					filesAnalyzed: 1,
				},
			};
			const realBaseline = generateBaseline(report, tempDir);

			// Now filter - should find no new violations
			const newViolations = filterNewViolations(violations, realBaseline, tempDir);
			expect(newViolations).toHaveLength(0);
		});

		it('keeps violations not in baseline', () => {
			const violations: Violation[] = [
				{
					file: path.join(tempDir, 'pages/NewPage.ts'),
					line: 20,
					column: 1,
					rule: 'dead-code',
					message: 'Unused method: newMethod',
					severity: 'warning',
				},
			];

			const newViolations = filterNewViolations(violations, baseline, tempDir);
			expect(newViolations).toHaveLength(1);
		});

		it('matches by hash even if line number changed', () => {
			// Same rule + message but different line number
			const violations: Violation[] = [
				{
					file: path.join(tempDir, 'pages/TestPage.ts'),
					line: 15, // Line shifted from 10 to 15
					column: 1,
					rule: 'dead-code',
					message: 'Unused method: oldMethod', // Same message
					severity: 'warning',
				},
			];

			// Generate baseline with the original violation
			const originalViolation: Violation = {
				file: path.join(tempDir, 'pages/TestPage.ts'),
				line: 10,
				column: 1,
				rule: 'dead-code',
				message: 'Unused method: oldMethod',
				severity: 'warning',
			};
			const report: JanitorReport = {
				timestamp: '',
				projectRoot: tempDir,
				rules: { enabled: [], disabled: [] },
				results: [
					{
						rule: 'dead-code',
						violations: [originalViolation],
						filesAnalyzed: 1,
						executionTimeMs: 0,
					},
				],
				summary: {
					totalViolations: 1,
					byRule: {},
					bySeverity: { error: 0, warning: 0, info: 0 },
					filesAnalyzed: 1,
				},
			};
			const realBaseline = generateBaseline(report, tempDir);

			// Filter - should match even with different line number
			const newViolations = filterNewViolations(violations, realBaseline, tempDir);
			expect(newViolations).toHaveLength(0);
		});
	});

	describe('filterReportByBaseline', () => {
		it('recalculates summary after filtering', () => {
			const violations: Violation[] = [
				{
					file: path.join(tempDir, 'pages/TestPage.ts'),
					line: 10,
					column: 1,
					rule: 'dead-code',
					message: 'Unused method: oldMethod',
					severity: 'warning',
				},
				{
					file: path.join(tempDir, 'pages/TestPage.ts'),
					line: 20,
					column: 1,
					rule: 'dead-code',
					message: 'Unused method: newMethod',
					severity: 'warning',
				},
			];

			const report: JanitorReport = {
				timestamp: '2024-01-01T00:00:00Z',
				projectRoot: tempDir,
				rules: { enabled: ['dead-code'], disabled: [] },
				results: [
					{
						rule: 'dead-code',
						violations,
						filesAnalyzed: 1,
						executionTimeMs: 10,
					},
				],
				summary: {
					totalViolations: 2,
					byRule: { 'dead-code': 2 },
					bySeverity: { error: 0, warning: 2, info: 0 },
					filesAnalyzed: 1,
				},
			};

			// Create baseline with only the first violation
			const baselineReport: JanitorReport = {
				...report,
				results: [{ ...report.results[0], violations: [violations[0]] }],
				summary: { ...report.summary, totalViolations: 1 },
			};
			const baseline = generateBaseline(baselineReport, tempDir);

			// Filter - should have 1 new violation
			const filtered = filterReportByBaseline(report, baseline, tempDir);

			expect(filtered.summary.totalViolations).toBe(1);
			expect(filtered.results[0].violations).toHaveLength(1);
			expect(filtered.results[0].violations[0].message).toBe('Unused method: newMethod');
		});
	});
});
