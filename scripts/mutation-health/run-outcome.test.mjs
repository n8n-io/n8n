import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { classifyRun, survivorsWithNoTestRun, testsNotRunLines } from './summary.mjs';

// A mutant on line `line` of a report. `coveredBy` and `testsCompleted` are
// what Stryker records about its tests. `tests` can set either one to undefined.
function mutant(status, line, tests = {}) {
	return {
		id: String(line),
		mutatorName: 'ConditionalExpression',
		status,
		location: { start: { line, column: 4 }, end: { line, column: 9 } },
		replacement: 'true',
		coveredBy: ['t1'],
		testsCompleted: 1,
		...tests,
	};
}

const reportOf = (files) => ({
	files: Object.fromEntries(
		Object.entries(files).map(([file, mutants]) => [file, { source: '', mutants }]),
	),
});

// A mutant that tests cover but that survived with no test run.
const notRun = (line) => mutant('Survived', line, { testsCompleted: 0 });

const HEALTHY = reportOf({ 'src/a.ts': [mutant('Killed', 1), mutant('Survived', 2)] });

describe('survivorsWithNoTestRun', () => {
	it('lists each covered survivor with no test run, by its location', () => {
		const report = reportOf({ 'src/a.ts': [mutant('Killed', 1), notRun(3), notRun(7)] });
		assert.deepEqual(survivorsWithNoTestRun(report), ['src/a.ts:3:4', 'src/a.ts:7:4']);
	});

	it('lists them across files, in report order', () => {
		const report = reportOf({ 'src/b.ts': [notRun(2)], 'src/a.ts': [notRun(1)] });
		assert.deepEqual(survivorsWithNoTestRun(report), ['src/b.ts:2:4', 'src/a.ts:1:4']);
	});

	// Each case breaks exactly one of the three conditions.
	const kept = {
		'a survivor whose covering tests ran': mutant('Survived', 1, { testsCompleted: 1 }),
		'a killed mutant with no test count': mutant('Killed', 1, { testsCompleted: 0 }),
		'a timeout': mutant('Timeout', 1, { testsCompleted: 0 }),
		'a survivor with no coverage data (the command runner)': mutant('Survived', 1, {
			coveredBy: undefined,
			testsCompleted: 0,
		}),
		'a survivor that no test covers': mutant('Survived', 1, { coveredBy: [], testsCompleted: 0 }),
		'a survivor without a test count': mutant('Survived', 1, { testsCompleted: undefined }),
		'a mutant with no coverage': mutant('NoCoverage', 1, { coveredBy: [], testsCompleted: 0 }),
	};
	for (const [what, m] of Object.entries(kept)) {
		it(`leaves out ${what}`, () => {
			assert.deepEqual(survivorsWithNoTestRun(reportOf({ 'src/a.ts': [m] })), []);
		});
	}

	it('reads a report with no files or no mutants as empty', () => {
		assert.deepEqual(survivorsWithNoTestRun({}), []);
		assert.deepEqual(survivorsWithNoTestRun({ files: { 'src/a.ts': { source: '' } } }), []);
	});
});

describe('testsNotRunLines', () => {
	const notRunReport = (count) =>
		reportOf({ 'src/a.ts': Array.from({ length: count }, (_, i) => notRun(i + 1)) });

	it('names the package, the count and each location, then what it means', () => {
		assert.deepEqual(testsNotRunLines('packages/a', notRunReport(2)), [
			'✗ packages/a: 2 mutant(s) survived with no test run, but tests cover them:',
			'   - src/a.ts:1:4',
			'   - src/a.ts:2:4',
			'  The test runner did not run their covering tests, so the score is not valid.',
			'  See "Vitest 5" in scripts/mutation-health/README.md.',
		]);
	});

	it('lists five locations and no remainder line when there are exactly five', () => {
		const lines = testsNotRunLines('packages/a', notRunReport(5));
		assert.equal(lines.filter((line) => line.startsWith('   - ')).length, 5);
		assert.equal(
			lines.some((line) => line.includes('more')),
			false,
		);
	});

	it('lists the first five locations and counts the rest', () => {
		const lines = testsNotRunLines('packages/a', notRunReport(7));
		assert.equal(
			lines[0],
			'✗ packages/a: 7 mutant(s) survived with no test run, but tests cover them:',
		);
		assert.deepEqual(lines.slice(1, 7), [
			'   - src/a.ts:1:4',
			'   - src/a.ts:2:4',
			'   - src/a.ts:3:4',
			'   - src/a.ts:4:4',
			'   - src/a.ts:5:4',
			'   … and 2 more',
		]);
	});
});

describe('classifyRun', () => {
	const DONE = 'Instrumented 1 source file(s) with 8 mutant(s)';
	const NO_TESTS = 'ERROR Stryker No tests were executed. Stryker will exit prematurely.';

	it('is complete when the run wrote a report and exited zero', () => {
		assert.equal(classifyRun({ exitCode: 0, output: DONE, report: HEALTHY }), 'complete');
	});

	it('is partial when the run wrote a report and then exited non-zero', () => {
		assert.equal(classifyRun({ exitCode: 1, output: DONE, report: HEALTHY }), 'partial');
	});

	it('is no-tests when nothing covers the target', () => {
		assert.equal(classifyRun({ exitCode: 1, output: NO_TESTS, report: null }), 'no-tests');
	});

	// With the command runner, a test command that matches no file fails the
	// dry run. Vitest says so, and the run is the same score-0 result.
	it('is no-tests when the test command finds no test file', () => {
		const output = 'No test files found, exiting with code 1';
		assert.equal(classifyRun({ exitCode: 1, output, report: null }), 'no-tests');
	});

	it('is failed when the run produced no report', () => {
		assert.equal(classifyRun({ exitCode: 1, output: 'SIGABRT', report: null }), 'failed');
	});

	// The caller deletes the previous reports before each run. Without that, a
	// crashed run finds the earlier report and is classified `partial`, so it
	// reports the earlier target and its score instead of failing.
	it('trusts the report as this run only — a report plus a crash is partial, never failed', () => {
		assert.equal(classifyRun({ exitCode: 3, output: 'SIGABRT', report: HEALTHY }), 'partial');
	});

	// Same trap for the no-tests path: a leftover report used to suppress it, and
	// a genuine score-0 red was reported as the earlier run's passing score.
	it('still detects no-tests when the run crashed without a report', () => {
		assert.equal(classifyRun({ exitCode: 3, output: NO_TESTS, report: null }), 'no-tests');
	});

	// The plain vitest runner under Vitest 5: every mutant survived and Stryker
	// ran 0.00 tests per mutant. A score of zero would hide the broken runner.
	it('is tests-not-run when a covered mutant survived with no test run', () => {
		const report = reportOf({ 'src/a.ts': [mutant('Killed', 1), notRun(2)] });
		assert.equal(classifyRun({ exitCode: 0, output: DONE, report }), 'tests-not-run');
		assert.equal(classifyRun({ exitCode: 1, output: DONE, report }), 'tests-not-run');
	});
});
