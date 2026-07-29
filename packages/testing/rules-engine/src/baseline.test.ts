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
		expect(loaded!.totalViolations).toBe(1);
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
