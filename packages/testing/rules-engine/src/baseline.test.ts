import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	generateBaseline,
	saveBaseline,
	loadBaseline,
	filterReportByBaseline,
} from './baseline.js';
import type { Report } from './types.js';

function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'rules-engine-test-'));
}

function makeReport(violations: Array<{ file: string; rule: string; message: string }>): Report {
	return {
		timestamp: new Date().toISOString(),
		projectRoot: '/root',
		rules: { enabled: ['test-rule'], disabled: [] },
		results: [
			{
				rule: 'test-rule',
				violations: violations.map((v) => ({
					file: v.file,
					line: 1,
					column: 1,
					rule: v.rule,
					message: v.message,
					severity: 'error' as const,
				})),
				filesAnalyzed: 1,
				executionTimeMs: 0,
			},
		],
		summary: {
			totalViolations: violations.length,
			byRule: { 'test-rule': violations.length },
			bySeverity: { error: violations.length, warning: 0, info: 0 },
			filesAnalyzed: 1,
		},
	};
}

describe('baseline', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = makeTempDir();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('generates baseline from report', () => {
		const report = makeReport([
			{ file: '/root/src/a.ts', rule: 'test-rule', message: 'bad thing' },
		]);

		const baseline = generateBaseline(report, '/root');

		expect(baseline.totalViolations).toBe(1);
		expect(baseline.violations['src/a.ts']).toHaveLength(1);
		expect(baseline.violations['src/a.ts'][0].rule).toBe('test-rule');
	});

	it('saves and loads baseline', () => {
		const report = makeReport([
			{ file: '/root/src/a.ts', rule: 'test-rule', message: 'bad thing' },
		]);
		const baseline = generateBaseline(report, '/root');
		const filePath = path.join(tmpDir, 'baseline.json');

		saveBaseline(baseline, filePath);
		const loaded = loadBaseline(filePath);

		expect(loaded).not.toBeNull();
		expect(loaded!.version).toBe(1);
		expect(loaded!.violations['src/a.ts']).toHaveLength(1);
		expect(loaded!.violations['src/a.ts'][0].hash).toBe(baseline.violations['src/a.ts'][0].hash);
	});

	// These sat at the top of the file, so two branches that both refreshed the baseline
	// conflicted there on every merge even when their entries merged cleanly.
	it('does not persist the derived timestamp and total', () => {
		const report = makeReport([
			{ file: '/root/src/a.ts', rule: 'test-rule', message: 'bad thing' },
		]);
		const baseline = generateBaseline(report, '/root');
		const filePath = path.join(tmpDir, 'baseline.json');

		saveBaseline(baseline, filePath);

		const persisted = fs.readFileSync(filePath, 'utf-8');
		expect(persisted).not.toContain('"generated"');
		expect(persisted).not.toContain('"totalViolations"');
	});

	it('returns null for missing baseline', () => {
		expect(loadBaseline(path.join(tmpDir, 'nope.json'))).toBeNull();
	});

	it('filters known violations from report', () => {
		const report = makeReport([
			{ file: '/root/src/a.ts', rule: 'test-rule', message: 'known issue' },
			{ file: '/root/src/b.ts', rule: 'test-rule', message: 'new issue' },
		]);

		const baseline = generateBaseline(
			makeReport([{ file: '/root/src/a.ts', rule: 'test-rule', message: 'known issue' }]),
			'/root',
		);

		const filtered = filterReportByBaseline(report, baseline, '/root');

		expect(filtered.summary.totalViolations).toBe(1);
		expect(filtered.results[0].violations[0].message).toBe('new issue');
	});

	it('uses file path in hash — same message in different files are distinct', () => {
		const report = makeReport([
			{ file: '/root/src/a.ts', rule: 'test-rule', message: 'same message' },
			{ file: '/root/src/b.ts', rule: 'test-rule', message: 'same message' },
		]);

		const baseline = generateBaseline(
			makeReport([{ file: '/root/src/a.ts', rule: 'test-rule', message: 'same message' }]),
			'/root',
		);

		const filtered = filterReportByBaseline(report, baseline, '/root');

		expect(filtered.summary.totalViolations).toBe(1);
		expect(filtered.results[0].violations[0].file).toBe('/root/src/b.ts');
	});
});

describe('generateBaseline carrying over uncovered rules', () => {
	function reportFor(rule: string, messages: string[]): Report {
		return {
			timestamp: new Date().toISOString(),
			projectRoot: '/root',
			rules: { enabled: [rule], disabled: [] },
			results: [
				{
					rule,
					violations: messages.map((message) => ({
						file: '/root/src/a.ts',
						line: 1,
						column: 1,
						rule,
						message,
						severity: 'error' as const,
					})),
					filesAnalyzed: 1,
					executionTimeMs: 0,
				},
			],
			summary: {
				totalViolations: messages.length,
				byRule: { [rule]: messages.length },
				bySeverity: { error: messages.length, warning: 0, info: 0 },
				filesAnalyzed: 1,
			},
		};
	}

	it('keeps exceptions for a rule the report does not cover', () => {
		const previous = generateBaseline(reportFor('disabled-rule', ['pre-existing']), '/root');

		const regenerated = generateBaseline(reportFor('other-rule', ['new']), '/root', previous);

		const rules = regenerated.violations['src/a.ts'].map((e) => e.rule);
		expect(rules).toContain('disabled-rule');
		expect(rules).toContain('other-rule');
		expect(regenerated.totalViolations).toBe(2);
	});

	// A rule scoped to changed files reports nothing when none of its files changed, which is
	// indistinguishable from every violation having been fixed.
	it('keeps entries a rule that did run no longer reports', () => {
		const previous = generateBaseline(
			reportFor('a-rule', ['unchanged file', 'still there']),
			'/root',
		);

		const regenerated = generateBaseline(reportFor('a-rule', ['still there']), '/root', previous);

		expect(regenerated.violations['src/a.ts'].map((e) => e.message)).toEqual([
			'unchanged file',
			'still there',
		]);
		expect(regenerated.totalViolations).toBe(2);
	});

	it('does not duplicate a violation present in both the previous baseline and the report', () => {
		const previous = generateBaseline(reportFor('a-rule', ['same']), '/root');

		const regenerated = generateBaseline(reportFor('a-rule', ['same']), '/root', previous);

		expect(regenerated.violations['src/a.ts']).toHaveLength(1);
		expect(regenerated.totalViolations).toBe(1);
	});

	it('counts the merged set, not just what the report saw', () => {
		const previous = generateBaseline(reportFor('disabled-rule', ['one', 'two']), '/root');

		const regenerated = generateBaseline(reportFor('other-rule', ['three']), '/root', previous);

		expect(regenerated.totalViolations).toBe(3);
	});

	it('builds from the report alone when given no previous baseline', () => {
		const baseline = generateBaseline(reportFor('a-rule', ['only']), '/root');

		expect(baseline.totalViolations).toBe(1);
	});
});
