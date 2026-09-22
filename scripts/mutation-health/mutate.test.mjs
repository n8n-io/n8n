import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
	buildNoTestsSummary,
	buildStrykerConfig,
	buildSummary,
	classifyRun,
	cliScopeError,
	coverageFromCounts,
	createCleanup,
	defaultConfigNameFor,
	filesToCheckout,
	findStrykerSetupFiles,
	formatMutateArg,
	isMutableSource,
	mergeRanges,
	parseArgs,
	parseHunkRanges,
	parseTestFiles,
	registerCleanupHandlers,
	removeStrykerSetupFiles,
	restoreFiles,
	scoreFromCounts,
	snapshotFiles,
	splitRange,
	strykerCliArgs,
	toPackageRelative,
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

describe('parseTestFiles', () => {
	it('splits a comma-separated value', () => {
		assert.deepEqual(parseTestFiles(['a.test.ts,b.test.ts']), ['a.test.ts', 'b.test.ts']);
	});

	it('collects a repeated flag', () => {
		assert.deepEqual(parseTestFiles(['a.test.ts', 'b.test.ts']), ['a.test.ts', 'b.test.ts']);
	});

	it('accepts both forms at once, and trims the spaces around a comma', () => {
		assert.deepEqual(parseTestFiles(['a.test.ts, b.test.ts', 'c.test.ts']), [
			'a.test.ts',
			'b.test.ts',
			'c.test.ts',
		]);
	});

	// A duplicate would make Stryker run the same file twice for every mutant.
	it('drops blanks and duplicates', () => {
		assert.deepEqual(parseTestFiles(['a.test.ts,,a.test.ts', '  ', 'b.test.ts']), [
			'a.test.ts',
			'b.test.ts',
		]);
	});

	it('returns nothing when the flag was not given', () => {
		assert.deepEqual(parseTestFiles([]), []);
	});
});

describe('parseArgs', () => {
	it('reads --test-files as a comma-separated list', () => {
		const parsed = parseArgs([
			'packages/cli/src/foo.ts:10-40',
			'--test-files',
			'packages/cli/src/__tests__/foo.test.ts,packages/cli/src/__tests__/bar.test.ts',
		]);
		assert.equal(parsed.targetArg, 'packages/cli/src/foo.ts:10-40');
		assert.deepEqual(parsed.testFiles, [
			'packages/cli/src/__tests__/foo.test.ts',
			'packages/cli/src/__tests__/bar.test.ts',
		]);
	});

	it('reads a repeated --test-files flag', () => {
		const parsed = parseArgs([
			'src/foo.ts',
			'--test-files',
			'src/__tests__/foo.test.ts',
			'--test-files',
			'src/__tests__/bar.test.ts',
		]);
		assert.deepEqual(parsed.testFiles, ['src/__tests__/foo.test.ts', 'src/__tests__/bar.test.ts']);
	});

	it('leaves testFiles empty when the flag is absent', () => {
		assert.deepEqual(parseArgs(['src/foo.ts']).testFiles, []);
	});

	it('keeps reading the other flags', () => {
		const parsed = parseArgs([
			'src/cron.ts',
			'--package-dir',
			'packages/workflow',
			'--config',
			'custom.mjs',
			'--base',
			'upstream/master',
		]);
		assert.equal(parsed.packageDirArg, 'packages/workflow');
		assert.equal(parsed.configArg, 'custom.mjs');
		assert.equal(parsed.baseArg, 'upstream/master');
		assert.equal(parsed.diffMode, false);
	});

	it('defaults the base ref and reads --diff', () => {
		const parsed = parseArgs(['--diff']);
		assert.equal(parsed.diffMode, true);
		assert.equal(parsed.baseArg, 'origin/master');
		assert.equal(parsed.targetArg, undefined);
	});

	it('reads --help', () => {
		assert.equal(parseArgs(['--help']).helpMode, true);
		assert.equal(parseArgs(['-h']).helpMode, true);
		assert.equal(parseArgs(['src/foo.ts']).helpMode, false);
	});
});

describe('toPackageRelative', () => {
	// Stryker matches testFiles against the files under its run cwd, which is
	// the package dir.
	it('strips the package prefix off a repo-relative path', () => {
		assert.equal(
			toPackageRelative('packages/cli/src/__tests__/foo.test.ts', 'packages/cli'),
			'src/__tests__/foo.test.ts',
		);
	});

	it('leaves an already package-relative path alone', () => {
		assert.equal(
			toPackageRelative('src/__tests__/foo.test.ts', 'packages/cli'),
			'src/__tests__/foo.test.ts',
		);
	});

	it('leaves a glob alone', () => {
		assert.equal(toPackageRelative('src/**/*.test.ts', 'packages/cli'), 'src/**/*.test.ts');
	});

	it('drops a leading ./', () => {
		assert.equal(toPackageRelative('./src/foo.test.ts', 'packages/cli'), 'src/foo.test.ts');
	});

	// `packages/cli-utils` must not lose its prefix to `packages/cli`.
	it('only strips a whole path segment', () => {
		assert.equal(
			toPackageRelative('packages/cli-utils/src/foo.test.ts', 'packages/cli'),
			'packages/cli-utils/src/foo.test.ts',
		);
	});
});

describe('buildStrykerConfig', () => {
	it('puts the supplied test files in the testFiles config field', () => {
		const config = buildStrykerConfig({
			targets: ['src/credentials/external-secrets.utils.ts:32-68'],
			testFiles: ['src/credentials/__tests__/external-secrets.utils.test.ts'],
		});
		assert.deepEqual(config.testFiles, [
			'src/credentials/__tests__/external-secrets.utils.test.ts',
		]);
		assert.deepEqual(config.mutate, ['src/credentials/external-secrets.utils.ts:32-68']);
	});

	// An empty `testFiles` is not the same as an absent one: Stryker reads a
	// non-empty list as "run only these", so an empty one must not be sent.
	it('leaves testFiles out when no test file was named', () => {
		const config = buildStrykerConfig({ targets: ['src/cron.ts'] });
		assert.equal('testFiles' in config, false);
	});
});

describe('strykerCliArgs', () => {
	it('forwards testFiles as one comma-joined flag', () => {
		const args = strykerCliArgs(
			buildStrykerConfig({
				targets: ['src/a.ts:1-4', 'src/b.ts'],
				testFiles: ['src/__tests__/a.test.ts', 'src/__tests__/b.test.ts'],
			}),
		);
		assert.deepEqual(args, [
			'--mutate',
			'src/a.ts:1-4,src/b.ts',
			'--testFiles',
			'src/__tests__/a.test.ts,src/__tests__/b.test.ts',
		]);
	});

	it('sends no --testFiles flag when no test file was named', () => {
		const args = strykerCliArgs(buildStrykerConfig({ targets: ['src/cron.ts'] }));
		assert.deepEqual(args, ['--mutate', 'src/cron.ts']);
	});
});

describe('cliScopeError', () => {
	it('refuses a packages/cli target with no --test-files', () => {
		const error = cliScopeError('packages/cli', []);
		assert.match(error, /--test-files/);
	});

	it('allows a packages/cli target once test files are named', () => {
		assert.equal(cliScopeError('packages/cli', ['src/__tests__/foo.test.ts']), null);
	});

	it('leaves every other package alone', () => {
		assert.equal(cliScopeError('packages/workflow', []), null);
		// A prefix match would sweep in an unrelated package.
		assert.equal(cliScopeError('packages/cli-utils', []), null);
	});
});

describe('defaultConfigNameFor', () => {
	it('gives packages/cli its own config, so related-test discovery stays off', () => {
		assert.equal(defaultConfigNameFor('packages/cli'), 'stryker.cli.mjs');
	});

	it('gives every other package the shared default', () => {
		assert.equal(defaultConfigNameFor('packages/workflow'), 'stryker.default.mjs');
		assert.equal(defaultConfigNameFor('packages/@n8n/decorators'), 'stryker.default.mjs');
	});
});

describe('the cli scope guard end to end', () => {
	const wrapper = path.join(import.meta.dirname, 'mutate.mjs');
	const target = 'packages/cli/src/credentials/external-secrets.utils.ts:32-68';

	function run(args) {
		return spawnSync(process.execPath, [wrapper, ...args], {
			cwd: path.resolve(import.meta.dirname, '../..'),
			encoding: 'utf8',
		});
	}

	// The run must stop before Stryker starts, so a mistyped command costs
	// nothing instead of forking a process for each of the package's test files.
	it('exits non-zero and names the flag when a cli target has no --test-files', () => {
		const res = run([target]);
		assert.equal(res.status, 2);
		assert.match(res.stderr, /--test-files/);
		// Stryker never started.
		assert.doesNotMatch(res.stderr, /Running Stryker/);
	});

	it('refuses --test-files together with --diff', () => {
		const res = run(['--diff', '--test-files', 'packages/cli/src/__tests__/foo.test.ts']);
		assert.equal(res.status, 2);
		assert.match(res.stderr, /--diff/);
	});

	it('documents the flag in --help', () => {
		const res = run(['--help']);
		assert.equal(res.status, 0);
		assert.match(res.stdout, /--test-files/);
	});
});

describe('filesToCheckout', () => {
	it('picks the files the run made dirty', () => {
		assert.deepEqual(filesToCheckout(['a.ts'], ['a.ts', 'b.ts']), ['b.ts']);
	});

	// A file that was dirty before the run holds the user's uncommitted work.
	// `git checkout --` would throw it away; the byte snapshot restores it.
	it('leaves the already-dirty files to the byte snapshot', () => {
		assert.deepEqual(filesToCheckout(['a.ts', 'b.ts'], ['a.ts', 'b.ts']), []);
	});

	it('returns nothing when the run left the tree as it found it', () => {
		assert.deepEqual(filesToCheckout([], []), []);
	});
});

describe('createCleanup', () => {
	it('restores the tree and then removes the setup files', () => {
		const calls = [];
		const cleanup = createCleanup({
			restore: () => {
				calls.push('restore');
				return ['src/cron.ts'];
			},
			removeSetupFiles: () => {
				calls.push('remove');
				return ['stryker-setup-0.js'];
			},
		});
		assert.deepEqual(cleanup(), { restored: ['src/cron.ts'], removed: ['stryker-setup-0.js'] });
		assert.deepEqual(calls, ['restore', 'remove']);
	});

	// Four exit paths are wired to the same routine, and more than one can fire
	// (SIGINT, then `exit`). Doing the work twice would undo a restore the user
	// made in between.
	it('does the work once however many exit paths call it', () => {
		let restores = 0;
		let removals = 0;
		const cleanup = createCleanup({
			restore: () => {
				restores++;
				return [];
			},
			removeSetupFiles: () => {
				removals++;
				return [];
			},
		});
		cleanup();
		cleanup();
		cleanup();
		assert.equal(restores, 1);
		assert.equal(removals, 1);
	});

	it('still removes the setup files when the restore throws', () => {
		let removals = 0;
		const cleanup = createCleanup({
			restore: () => {
				throw new Error('working tree is locked');
			},
			removeSetupFiles: () => {
				removals++;
				return ['stryker-setup-0.js'];
			},
		});
		assert.deepEqual(cleanup(), { restored: [], removed: ['stryker-setup-0.js'] });
		assert.equal(removals, 1);
	});
});

describe('registerCleanupHandlers', () => {
	// A stand-in process, so the tests can fire the handlers without signalling
	// or ending the test runner.
	function harness({ onSignal } = {}) {
		const proc = new EventEmitter();
		const exits = [];
		const writes = [];
		let cleaned = 0;
		const handlers = registerCleanupHandlers({
			cleanup: () => {
				cleaned++;
				return { restored: [], removed: [] };
			},
			onSignal,
			proc,
			exit: (code) => exits.push(code),
			write: (msg) => writes.push(msg),
		});
		return { proc, exits, writes, handlers, cleaned: () => cleaned };
	}

	it('cleans up on the usual exit path', () => {
		const h = harness();
		h.proc.emit('exit', 0);
		assert.equal(h.cleaned(), 1);
	});

	it('cleans up and exits 130 on SIGINT', () => {
		const h = harness({ onSignal: () => false });
		h.proc.emit('SIGINT');
		assert.equal(h.cleaned(), 1);
		assert.deepEqual(h.exits, [130]);
	});

	it('cleans up and exits 143 on SIGTERM', () => {
		const h = harness({ onSignal: () => false });
		h.proc.emit('SIGTERM');
		assert.equal(h.cleaned(), 1);
		assert.deepEqual(h.exits, [143]);
	});

	// While Stryker is alive the run has to unwind first: a restore that races
	// Stryker's own writes fixes nothing. The run's `finally` then cleans up.
	it('defers to a live run, which still reaches cleanup', () => {
		const seen = [];
		const h = harness({
			onSignal: (signal) => {
				seen.push(signal);
				return true;
			},
		});
		h.proc.emit('SIGINT');
		h.proc.emit('SIGTERM');
		assert.deepEqual(seen, ['SIGINT', 'SIGTERM']);
		assert.equal(h.cleaned(), 0);
		assert.deepEqual(h.exits, []);

		h.proc.emit('exit', 130);
		assert.equal(h.cleaned(), 1);
	});

	it('cleans up on an uncaught exception and exits 3', () => {
		const h = harness();
		h.proc.emit('uncaughtException', new Error('boom'));
		assert.equal(h.cleaned(), 1);
		assert.deepEqual(h.exits, [3]);
		assert.match(h.writes.join(''), /boom/);
	});

	it('stops listening after dispose, so the next job owns its own snapshot', () => {
		const h = harness({ onSignal: () => false });
		h.handlers.dispose();
		h.proc.emit('exit', 0);
		h.proc.emit('SIGINT');
		h.proc.emit('SIGTERM');
		h.proc.emit('uncaughtException', new Error('boom'));
		assert.equal(h.cleaned(), 0);
		assert.deepEqual(h.exits, []);
	});
});

describe('working-tree cleanup', () => {
	let root;

	beforeEach(() => {
		root = mkdtempSync(path.join(tmpdir(), 'mutate-cleanup-'));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	// A mutate target plus two files outside it. The old target-only snapshot
	// restored the target and left the other two mutated.
	function seedTree() {
		mkdirSync(path.join(root, 'packages/pkg/src'), { recursive: true });
		mkdirSync(path.join(root, 'packages/other/src'), { recursive: true });
		const files = {
			target: path.join(root, 'packages/pkg/src/cron.ts'),
			sibling: path.join(root, 'packages/pkg/src/helper.ts'),
			test: path.join(root, 'packages/other/src/cron.test.ts'),
		};
		for (const [name, file] of Object.entries(files)) writeFileSync(file, `original ${name}\n`);
		return files;
	}

	// A stand-in for Stryker: a real child process that rewrites each file it is
	// given and drops a setup file for each worker, the way the vitest runner
	// does. `--inPlace` means those writes hit the working tree.
	function runMockStryker({ mutates = [], setupFiles = [] }) {
		const script = [
			"const { writeFileSync } = require('node:fs');",
			`for (const f of ${JSON.stringify(mutates)}) writeFileSync(f, 'Stryker was here!\\n');`,
			`for (const f of ${JSON.stringify(setupFiles)}) writeFileSync(f, '// stryker setup\\n');`,
		].join('\n');
		const res = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
		assert.equal(res.status, 0, res.stderr);
	}

	it('restores every file the run modified, not only the mutate targets', () => {
		const files = seedTree();
		const snap = snapshotFiles(Object.values(files));

		runMockStryker({ mutates: Object.values(files) });
		for (const file of Object.values(files)) {
			assert.equal(readFileSync(file, 'utf8'), 'Stryker was here!\n');
		}

		assert.deepEqual(new Set(restoreFiles(snap)), new Set(Object.values(files)));
		for (const [name, file] of Object.entries(files)) {
			assert.equal(readFileSync(file, 'utf8'), `original ${name}\n`);
		}
	});

	it('reports only the files it had to write back', () => {
		const files = seedTree();
		const snap = snapshotFiles(Object.values(files));

		runMockStryker({ mutates: [files.sibling] });

		assert.deepEqual(restoreFiles(snap), [files.sibling]);
	});

	it('skips a file the run deleted instead of throwing', () => {
		const files = seedTree();
		const snap = snapshotFiles(Object.values(files));
		rmSync(files.test);

		assert.deepEqual(restoreFiles(snap), []);
	});

	it('deletes every stryker-setup-*.js under the repo root', () => {
		const files = seedTree();
		const setupFiles = [
			path.join(root, 'stryker-setup-0.js'),
			path.join(root, 'packages/pkg/stryker-setup-1.js'),
			path.join(root, 'packages/other/src/stryker-setup-12.js'),
		];
		runMockStryker({ setupFiles });

		assert.deepEqual(new Set(removeStrykerSetupFiles(root)), new Set(setupFiles));
		for (const file of setupFiles) assert.equal(existsSync(file), false);
		assert.deepEqual(findStrykerSetupFiles(root), []);
		// The sources stay where they are.
		assert.ok(existsSync(files.target));
	});

	it('leaves files that only look like a setup file alone', () => {
		seedTree();
		const keep = [
			path.join(root, 'stryker-setup.js'),
			path.join(root, 'stryker-setup-0.ts'),
			path.join(root, 'my-stryker-setup-0.js'),
		];
		runMockStryker({ setupFiles: keep });

		assert.deepEqual(removeStrykerSetupFiles(root), []);
		for (const file of keep) assert.ok(existsSync(file));
	});

	// A full-repo walk that enters node_modules takes minutes, and Stryker's own
	// packaged `stryker-setup.js` lives there.
	it('does not walk node_modules', () => {
		mkdirSync(path.join(root, 'node_modules/@stryker-mutator'), { recursive: true });
		const inside = path.join(root, 'node_modules/@stryker-mutator/stryker-setup-0.js');
		runMockStryker({ setupFiles: [inside] });

		assert.deepEqual(removeStrykerSetupFiles(root), []);
		assert.ok(existsSync(inside));
	});

	it('leaves neither mutants nor setup files behind when a run is interrupted', () => {
		const files = seedTree();
		const setupFiles = [path.join(root, 'packages/pkg/stryker-setup-0.js')];
		const snap = snapshotFiles(Object.values(files));

		const cleanup = createCleanup({
			restore: () => restoreFiles(snap),
			removeSetupFiles: () => removeStrykerSetupFiles(root),
		});
		const proc = new EventEmitter();
		const exits = [];
		registerCleanupHandlers({
			cleanup,
			onSignal: () => false, // Stryker is already gone
			proc,
			exit: (code) => exits.push(code),
			write: () => {},
		});

		runMockStryker({ mutates: Object.values(files), setupFiles });
		proc.emit('SIGINT'); // the user hits Ctrl-C mid-run

		for (const [name, file] of Object.entries(files)) {
			assert.equal(readFileSync(file, 'utf8'), `original ${name}\n`);
		}
		assert.deepEqual(findStrykerSetupFiles(root), []);
		assert.deepEqual(exits, [130]);
	});
});
