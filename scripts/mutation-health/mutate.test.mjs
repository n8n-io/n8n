import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	buildNoTestsSummary,
	buildSummary,
	classifyRun,
	coverageFromCounts,
	formatMutateArg,
	isMutableSource,
	mergeRanges,
	parseHunkRanges,
	scoreFromCounts,
	splitRange,
} from './mutate.mjs';

// A minimal Stryker Mutation Testing Elements report for one source file. Mix
// of statuses so coverage (anything that ran / ran + no-coverage) is a genuine
// fraction strictly between 0 and 1: 3 ran (killed/survived/timeout), 1 sat
// uncovered.
const RAW_FIXTURE = {
	files: {
		'src/cron.ts': {
			source: 'export const a = 1;\nexport const b = 2;\nexport const c = 3;\n',
			mutants: [
				{
					id: '1',
					mutatorName: 'ArithmeticOperator',
					status: 'Killed',
					location: { start: { line: 1, column: 18 }, end: { line: 1, column: 19 } },
					replacement: '2',
				},
				{
					id: '2',
					mutatorName: 'BooleanLiteral',
					status: 'Survived',
					location: { start: { line: 2, column: 18 }, end: { line: 2, column: 19 } },
					replacement: '3',
					coveredBy: ['t1'],
				},
				{
					id: '3',
					mutatorName: 'BlockStatement',
					status: 'Timeout',
					location: { start: { line: 3, column: 18 }, end: { line: 3, column: 19 } },
					replacement: '4',
				},
				{
					id: '4',
					mutatorName: 'StringLiteral',
					status: 'NoCoverage',
					location: { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
					replacement: '""',
				},
			],
		},
	},
	testFiles: {
		'src/cron.test.ts': {
			tests: [{ id: 't1', name: 'cron computes next run' }],
		},
	},
};

const RUN_META = { threshold: 80, target: 'src/cron.ts', generatedAt: '2026-06-21T00:00:00.000Z' };

function isFractionInUnitInterval(v) {
	return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

describe('coverageFromCounts', () => {
	it('is the share of mutants that ran (ran / ran + no-coverage)', () => {
		// 3 ran (killed + timeout), 1 uncovered → 3/4
		const counts = { killed: 2, survived: 0, timeout: 1, noCoverage: 1, runtimeError: 0 };
		assert.equal(coverageFromCounts(counts), 0.75);
	});

	it('counts survived and runtime-error mutants as covered (they ran)', () => {
		const counts = { killed: 0, survived: 1, timeout: 0, noCoverage: 1, runtimeError: 1 };
		assert.equal(coverageFromCounts(counts), 0.6667);
	});

	it('is 1 when every mutant was covered', () => {
		assert.equal(coverageFromCounts({ killed: 5, survived: 0, timeout: 0, noCoverage: 0 }), 1);
	});

	it('is 0 when no mutant was covered', () => {
		assert.equal(coverageFromCounts({ killed: 0, survived: 0, timeout: 0, noCoverage: 7 }), 0);
	});

	it('is 0 — never NaN — when there is nothing to cover', () => {
		assert.equal(coverageFromCounts({ killed: 0, survived: 0, timeout: 0, noCoverage: 0 }), 0);
	});

	it('ignores compile-error and ignored mutants (they never ran for coverage reasons)', () => {
		const counts = {
			killed: 1,
			survived: 0,
			timeout: 0,
			noCoverage: 1,
			compileError: 3,
			ignored: 4,
			runtimeError: 0,
		};
		// only killed (ran) + noCoverage count → 1/2
		assert.equal(coverageFromCounts(counts), 0.5);
	});

	it('always lands in [0,1]', () => {
		for (const counts of [
			{ killed: 1, survived: 2, timeout: 3, noCoverage: 4, runtimeError: 5 },
			{ killed: 0, survived: 0, timeout: 0, noCoverage: 0 },
			{ killed: 9, survived: 0, timeout: 0, noCoverage: 0 },
		]) {
			assert.ok(isFractionInUnitInterval(coverageFromCounts(counts)));
		}
	});
});

describe('buildSummary', () => {
	it('writes a per-file coverage fraction in [0,1] onto every file row', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		assert.equal(summary.files.length, 1);
		const file = summary.files[0];
		assert.ok(isFractionInUnitInterval(file.coverage));
		// 3 ran (killed/survived/timeout) of 4 coverable → 0.75
		assert.equal(file.coverage, 0.75);
	});

	it('writes an overall coverage fraction in [0,1]', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		assert.ok(isFractionInUnitInterval(summary.overall.coverage));
	});

	it('preserves the existing summary contract (score, counts, survivors)', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		const file = summary.files[0];
		assert.equal(file.score, scoreFromCounts(file.counts));
		assert.equal(file.counts.killed, 1);
		assert.equal(file.counts.survived, 1);
		assert.equal(file.counts.noCoverage, 1);
		assert.equal(file.counts.timeout, 1);
		// Survived + NoCoverage are unjustified survivors
		assert.equal(file.survivors.length, 2);
		// names the covering test for the survived mutant
		const survived = file.survivors.find((s) => s.status === 'Survived');
		assert.deepEqual(survived.coveringTests, ['cron computes next run']);
	});
});

describe('buildNoTestsSummary (no covering tests)', () => {
	it('reports coverage 0 in [0,1] when nothing covers the file', () => {
		const summary = buildNoTestsSummary({
			threshold: 80,
			target: 'src/cron.ts',
			noCoverage: 12,
			generatedAt: RUN_META.generatedAt,
		});
		assert.equal(summary.files[0].coverage, 0);
		assert.ok(isFractionInUnitInterval(summary.files[0].coverage));
		assert.ok(isFractionInUnitInterval(summary.overall.coverage));
	});
});

describe('classifyRun', () => {
	const DONE = 'Instrumented 1 source file(s) with 8 mutant(s)';
	const NO_TESTS = 'ERROR Stryker No tests were executed. Stryker will exit prematurely.';

	it('is complete when the run wrote a report and exited zero', () => {
		assert.equal(classifyRun({ exitCode: 0, output: DONE, hasReport: true }), 'complete');
	});

	it('is partial when the run wrote a report and then exited non-zero', () => {
		assert.equal(classifyRun({ exitCode: 1, output: DONE, hasReport: true }), 'partial');
	});

	it('is no-tests when nothing covers the target', () => {
		assert.equal(classifyRun({ exitCode: 1, output: NO_TESTS, hasReport: false }), 'no-tests');
	});

	it('is failed when the run produced no report', () => {
		assert.equal(classifyRun({ exitCode: 1, output: 'SIGABRT', hasReport: false }), 'failed');
	});

	// The caller deletes the previous reports before each run. Without that, a
	// crashed run finds the earlier report and is classified `partial`, so it
	// reports the earlier target and its score instead of failing.
	it('trusts hasReport as this run only — a report plus a crash is partial, never failed', () => {
		assert.equal(classifyRun({ exitCode: 3, output: 'SIGABRT', hasReport: true }), 'partial');
	});

	// Same trap for the no-tests path: a leftover report used to suppress it, and
	// a genuine score-0 red was reported as the earlier run's passing score.
	it('still detects no-tests when the run crashed without a report', () => {
		assert.equal(classifyRun({ exitCode: 3, output: NO_TESTS, hasReport: false }), 'no-tests');
	});
});

describe('isMutableSource', () => {
	it('accepts product source wherever a package keeps it', () => {
		assert.ok(isMutableSource('packages/workflow/src/cron.ts'));
		// nodes-base has no src/. An allowlist drops the largest surface in the repo.
		assert.ok(isMutableSource('packages/nodes-base/nodes/Slack/Slack.node.ts'));
		assert.ok(isMutableSource('packages/nodes-base/credentials/SlackApi.credentials.ts'));
		assert.ok(isMutableSource('packages/frontend/editor-ui/src/stores/ui.store.ts'));
		// `[cm]?` in the extension test is there for the ESM/CJS variants.
		assert.ok(isMutableSource('packages/@n8n/db/src/index.mts'));
		assert.ok(isMutableSource('packages/@n8n/db/src/index.cts'));
	});

	it('rejects tests, declarations, configs and build output', () => {
		assert.equal(isMutableSource('packages/workflow/src/cron.test.ts'), false);
		assert.equal(isMutableSource('packages/workflow/src/cron.spec.ts'), false);
		// The ESM/CJS variants are accepted as source, so they have to be
		// excluded as tests too.
		assert.equal(isMutableSource('packages/workflow/src/cron.test.mts'), false);
		assert.equal(isMutableSource('packages/workflow/src/__tests__/cron.ts'), false);
		assert.equal(isMutableSource('packages/workflow/src/__mocks__/cron.ts'), false);
		assert.equal(isMutableSource('packages/workflow/src/types.d.ts'), false);
		assert.equal(isMutableSource('packages/cli/vitest.config.ts'), false);
		assert.equal(isMutableSource('packages/workflow/dist/cron.js'), false);
		assert.equal(isMutableSource('packages/workflow/test/helper.ts'), false);
		assert.equal(isMutableSource('packages/@n8n/db/src/migrations/sqlite/x.ts'), false);
		assert.equal(isMutableSource('packages/design-system/src/Button.stories.ts'), false);
		// The extension test is anchored: `.ts` has to end the path, not merely
		// appear in it. Committed snapshots sit next to their source and would
		// otherwise be handed to Stryker as mutable TypeScript.
		assert.equal(isMutableSource('packages/cli/src/__snapshots__/foo.test.ts.snap'), false);
	});

	// .vue stays out. Each SFC package crashed Stryker's mutate step in the
	// 2026-06 sweep, and the component layer gives little value.
	it('rejects everything that is not TypeScript', () => {
		assert.equal(isMutableSource('packages/frontend/editor-ui/src/App.vue'), false);
		assert.equal(isMutableSource('packages/workflow/src/cron.js'), false);
		assert.equal(isMutableSource('README.md'), false);
		assert.equal(isMutableSource('packages/workflow/package.json'), false);
	});
});

describe('parseHunkRanges', () => {
	it('reads new-side ranges out of `git diff -U0` headers', () => {
		const diff = [
			'diff --git a/src/cron.ts b/src/cron.ts',
			'--- a/src/cron.ts',
			'+++ b/src/cron.ts',
			'@@ -12,0 +13,4 @@ export function tick() {',
			'+const a = 1;',
			'@@ -40,2 +44,2 @@',
			'+const b = 2;',
			// Counts run past one digit on both sides for any hunk of ten lines
			// or more, which is most of them.
			'@@ -80,12 +90,14 @@',
			'+const c = 3;',
		].join('\n');
		assert.deepEqual(parseHunkRanges(diff), [
			{ start: 13, end: 16 },
			{ start: 44, end: 45 },
			{ start: 90, end: 103 },
		]);
	});

	// `git diff` of a file that itself talks about diffs (a patch fixture, this
	// very test file) carries hunk-header text inside `+`/`-` content lines.
	// Only a header at the start of a line is a header.
	it('ignores hunk-header text that appears inside a content line', () => {
		const diff = ['@@ -1,0 +5,1 @@', "+const H = '@@ -1,2 +300,4 @@';"].join('\n');
		assert.deepEqual(parseHunkRanges(diff), [{ start: 5, end: 5 }]);
	});

	it('treats a header with no new-side count as a single line', () => {
		assert.deepEqual(parseHunkRanges('@@ -5 +7 @@'), [{ start: 7, end: 7 }]);
	});

	it('drops pure deletions — nothing survives there to mutate', () => {
		assert.deepEqual(parseHunkRanges('@@ -10,4 +9,0 @@'), []);
	});

	it('returns nothing for a diff with no hunks', () => {
		assert.deepEqual(parseHunkRanges(''), []);
	});
});

describe('mergeRanges', () => {
	it('merges overlapping ranges', () => {
		assert.deepEqual(
			mergeRanges([
				{ start: 1, end: 5 },
				{ start: 3, end: 9 },
			]),
			[{ start: 1, end: 9 }],
		);
	});

	it('merges adjacent ranges so Stryker gets one span per region', () => {
		assert.deepEqual(
			mergeRanges([
				{ start: 1, end: 4 },
				{ start: 5, end: 8 },
			]),
			[{ start: 1, end: 8 }],
		);
	});

	it('keeps ranges with a real gap apart, and sorts them', () => {
		assert.deepEqual(
			mergeRanges([
				{ start: 20, end: 22 },
				{ start: 1, end: 4 },
			]),
			[
				{ start: 1, end: 4 },
				{ start: 20, end: 22 },
			],
		);
	});

	it('leaves a fully-contained range absorbed', () => {
		assert.deepEqual(
			mergeRanges([
				{ start: 1, end: 20 },
				{ start: 5, end: 9 },
			]),
			[{ start: 1, end: 20 }],
		);
	});
});

describe('formatMutateArg', () => {
	it('comma-joins every target into one flag value', () => {
		assert.equal(
			formatMutateArg(['src/a.ts:1-4', 'src/a.ts:20-22', 'src/b.ts']),
			'src/a.ts:1-4,src/a.ts:20-22,src/b.ts',
		);
	});
});

describe('splitRange', () => {
	it('splits a trailing line range off the path', () => {
		assert.deepEqual(splitRange('src/cron.ts:13-16'), { file: 'src/cron.ts', range: '13-16' });
	});

	it('leaves a bare path alone', () => {
		assert.deepEqual(splitRange('src/cron.ts'), { file: 'src/cron.ts', range: null });
	});

	it('does not mistake a Windows drive letter or a colon in a dirname for a range', () => {
		assert.deepEqual(splitRange('src/a:b/cron.ts'), { file: 'src/a:b/cron.ts', range: null });
	});
});
