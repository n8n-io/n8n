import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
	MutateError,
	changedTestFilesForPackage,
	cliScopeError,
	defaultConfigNameFor,
	formatMutateArg,
	isMutableSource,
	mergeRanges,
	parseHunkRanges,
	parseTestFiles,
	splitRange,
	repoRoot,
	toPackageRelative,
} from './targets.mjs';

describe('repoRoot', () => {
	// Plans, configs and the sandbox mirror all resolve from it.
	it('is a folder above this tool', () => {
		assert.ok(import.meta.dirname.startsWith(`${repoRoot}${path.sep}`));
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

	// A named target is checked as a package-relative path, so a test or build
	// folder can be the first segment.
	it('rejects test, mock and build folders at the start of a package-relative path', () => {
		for (const rel of [
			'__tests__/helper.ts',
			'__mocks__/fs.ts',
			'test/helper.ts',
			'tests/helper.ts',
			'dist/index.ts',
			'coverage/x.ts',
			'migrations/1-init.ts',
		]) {
			assert.equal(isMutableSource(rel), false, rel);
		}
	});

	it('rejects the ESM and CJS variants of stories and configs', () => {
		assert.equal(isMutableSource('src/Button.stories.mts'), false);
		assert.equal(isMutableSource('vite.config.mts'), false);
		assert.equal(isMutableSource('vitest.config.cts'), false);
	});

	// A name part such as `.config.js` in the middle of a name does not make a
	// source file a config, a test, a story or a declaration.
	it('reads only the end of a file name', () => {
		for (const file of [
			'src/schema.d.ts-builder.ts',
			'src/run.test.ts-helpers.ts',
			'src/button.stories.ts-loader.ts',
			'src/app.config.json-schema.ts',
		]) {
			assert.equal(isMutableSource(file), true, file);
		}
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

describe('changedTestFilesForPackage', () => {
	it('selects changed test files from the exact package', () => {
		const changedFiles = [
			'packages/@n8n/engine/src/runtime/__tests__/create-engine-runtime.test.ts',
			'packages/cli/src/modules/engine-v2/__tests__/engine-v2.runtime.test.ts',
			'packages/cli/src/modules/engine-v2/__tests__/in-memory-execution-response.test.ts',
			'packages/cli/src/modules/engine-v2/engine-v2.runtime.ts',
			'packages/cli-utils/src/foo.test.ts',
		];

		assert.deepEqual(changedTestFilesForPackage(changedFiles, 'packages/cli'), [
			'packages/cli/src/modules/engine-v2/__tests__/engine-v2.runtime.test.ts',
			'packages/cli/src/modules/engine-v2/__tests__/in-memory-execution-response.test.ts',
		]);
	});

	it('accepts paths with a leading ./', () => {
		assert.deepEqual(changedTestFilesForPackage(['./packages/cli/src/a.test.ts'], 'packages/cli'), [
			'packages/cli/src/a.test.ts',
		]);
	});

	// `packages/xyz/` has the same length as `packages/cli/`, so only the
	// prefix check keeps its tests out.
	it('leaves out the tests of another package', () => {
		assert.deepEqual(
			changedTestFilesForPackage(['packages/xyz/src/a.test.ts'], 'packages/cli'),
			[],
		);
	});

	it('matches the CLI unit Vitest config roots and extensions', () => {
		assert.deepEqual(
			changedTestFilesForPackage(
				[
					'packages/cli/src/a.test.ts',
					'packages/cli/test/unit/b.spec.ts',
					'packages/cli/src/c.integration.test.ts',
					'packages/cli/test/integration/d.test.ts',
					'packages/cli/src/e.test.mts',
					'packages/cli/src/f.test.tsx',
				],
				'packages/cli/',
			),
			['packages/cli/src/a.test.ts', 'packages/cli/test/unit/b.spec.ts'],
		);
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
		const ranges = [
			{ start: 1, end: 5 },
			{ start: 3, end: 9 },
		];
		assert.deepEqual(mergeRanges(ranges), [{ start: 1, end: 9 }]);
	});

	it('merges adjacent ranges so Stryker gets one span per region', () => {
		const ranges = [
			{ start: 1, end: 4 },
			{ start: 5, end: 8 },
		];
		assert.deepEqual(mergeRanges(ranges), [{ start: 1, end: 8 }]);
	});

	it('keeps ranges with a real gap apart, and sorts them', () => {
		const ranges = [
			{ start: 20, end: 22 },
			{ start: 1, end: 4 },
		];
		assert.deepEqual(mergeRanges(ranges), [
			{ start: 1, end: 4 },
			{ start: 20, end: 22 },
		]);
	});

	it('leaves a fully-contained range absorbed', () => {
		const ranges = [
			{ start: 1, end: 20 },
			{ start: 5, end: 9 },
		];
		assert.deepEqual(mergeRanges(ranges), [{ start: 1, end: 20 }]);
	});
});

describe('formatMutateArg', () => {
	it('joins every target into one label', () => {
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

	it('reads a range only at the end of the target', () => {
		assert.deepEqual(splitRange('src/a.ts:10-20.bak'), { file: 'src/a.ts:10-20.bak', range: null });
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

describe('toPackageRelative', () => {
	// Stryker runs in the package dir, so test files are matched from there.
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

	it('drops ./ only at the start, so a path that leaves the package stays as it is', () => {
		assert.equal(toPackageRelative('../shared/a.test.ts', 'packages/cli'), '../shared/a.test.ts');
	});

	// `packages/cli-utils` must not lose its prefix to `packages/cli`.
	it('only strips a whole path segment', () => {
		assert.equal(
			toPackageRelative('packages/cli-utils/src/foo.test.ts', 'packages/cli'),
			'packages/cli-utils/src/foo.test.ts',
		);
	});
});

describe('cliScopeError', () => {
	it('refuses a packages/cli target with no --test-files and shows how to name them', () => {
		const error = cliScopeError('packages/cli', []);
		assert.match(error, /^Mutating packages\/cli needs --test-files\.\n/);
		assert.match(error, /forks a process for each one and never finishes/);
		assert.match(
			error,
			/ {2}pnpm mutate packages\/cli\/src\/foo\.ts:10-40 --test-files packages\/cli\/src\/__tests__\/foo\.test\.ts$/,
		);
		assert.doesNotMatch(error, /--diff/);
	});

	it('allows a packages/cli target once test files are named', () => {
		assert.equal(cliScopeError('packages/cli', ['src/__tests__/foo.test.ts']), null);
	});

	it('explains how to scope a CLI diff with no changed test file', () => {
		const error = cliScopeError('packages/cli', [], true);
		assert.match(error, /changed test file/);
		assert.match(error, /named target with --test-files/);
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

describe('MutateError', () => {
	it('carries the exit code and prints no usage text unless asked', () => {
		const error = new MutateError(3, 'Stryker did not start');
		assert.ok(error instanceof Error);
		assert.equal(error.name, 'MutateError');
		assert.equal(error.exitCode, 3);
		assert.equal(error.message, 'Stryker did not start');
		assert.equal(error.showUsage, false);
		assert.equal(new MutateError(2, 'Missing target', { showUsage: true }).showUsage, true);
	});
});
