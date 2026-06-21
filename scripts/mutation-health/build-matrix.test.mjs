import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	assertNoLedgerDivergence,
	buildMatrixFromPicked,
	buildMatrixRowForFile,
	fileSlug,
	findPackageForSourceFile,
	modeForEffectiveStatus,
	slugForPackage,
} from './build-matrix.mjs';
import { ELIGIBLE_PACKAGES } from './pick-next.mjs';

const ELIGIBLE = ELIGIBLE_PACKAGES;

describe('slugForPackage', () => {
	it('returns the trailing path segment of `dir`', () => {
		assert.equal(slugForPackage({ name: 'n8n-workflow', dir: 'packages/workflow' }), 'workflow');
		assert.equal(slugForPackage({ name: '@n8n/crdt', dir: 'packages/@n8n/crdt' }), 'crdt');
		assert.equal(
			slugForPackage({ name: '@n8n/decorators', dir: 'packages/@n8n/decorators' }),
			'decorators',
		);
	});
});

describe('fileSlug', () => {
	it('sanitises a repo-relative path into an artefact-safe slug', () => {
		assert.equal(
			fileSlug('packages/workflow/src/cron.ts'),
			'packages-workflow-src-cron-ts',
		);
		assert.equal(
			fileSlug('packages/@n8n/crdt/src/utils.ts'),
			'packages-n8n-crdt-src-utils-ts',
		);
	});

	it('collapses runs of separators and trims edges', () => {
		assert.equal(fileSlug('a//b///c.ts'), 'a-b-c-ts');
		assert.equal(fileSlug('.hidden/file.ts'), 'hidden-file-ts');
	});
});

describe('modeForEffectiveStatus', () => {
	it('maps new → baseline and red/stale → coverage', () => {
		assert.equal(modeForEffectiveStatus('new'), 'baseline');
		assert.equal(modeForEffectiveStatus('red'), 'coverage');
		assert.equal(modeForEffectiveStatus('stale'), 'coverage');
	});

	it('throws on green or unknown — green never enters the candidate set', () => {
		assert.throws(() => modeForEffectiveStatus('green'), /Cannot map/);
		assert.throws(() => modeForEffectiveStatus(undefined), /Cannot map/);
	});
});

describe('findPackageForSourceFile', () => {
	it('matches by exact dir prefix with a trailing separator', () => {
		const pkg = findPackageForSourceFile('packages/workflow/src/cron.ts', ELIGIBLE);
		assert.ok(pkg);
		assert.equal(pkg.name, 'n8n-workflow');
	});

	it('returns undefined for unowned paths', () => {
		assert.equal(
			findPackageForSourceFile('packages/@n8n/expression-runtime/src/foo.ts', ELIGIBLE),
			undefined,
		);
		assert.equal(findPackageForSourceFile('README.md', ELIGIBLE), undefined);
	});
});

describe('buildMatrixRowForFile (on-demand re-score path)', () => {
	it('emits a single matrix row with mode=file for an owned file', () => {
		const row = buildMatrixRowForFile('packages/@n8n/crdt/src/utils.ts', ELIGIBLE);
		assert.deepEqual(row, {
			name: '@n8n/crdt',
			dir: 'packages/@n8n/crdt',
			slug: 'crdt',
			mode: 'file',
			source_file: 'packages/@n8n/crdt/src/utils.ts',
			file_slug: 'packages-n8n-crdt-src-utils-ts',
		});
	});

	it('throws for files outside ELIGIBLE_PACKAGES', () => {
		assert.throws(
			() => buildMatrixRowForFile('packages/cli/src/server.ts', ELIGIBLE),
			/No mutation-tracked package owns/,
		);
	});
});

describe('assertNoLedgerDivergence (die-loud guard)', () => {
	it('is a no-op when the ledger is empty (every package is genuinely fresh)', () => {
		assert.doesNotThrow(() => assertNoLedgerDivergence([], ELIGIBLE));
	});

	it('passes when every eligible package has at least one non-`new` row', () => {
		const rows = ELIGIBLE.map((pkg, i) => ({
			source_file_path: `${pkg.dir}/src/seed-${i}.ts`,
			package: pkg.name,
			status: 'green',
		}));
		assert.doesNotThrow(() => assertNoLedgerDivergence(rows, ELIGIBLE));
	});

	it('fails loudly when an eligible package has zero non-`new` rows in a non-empty ledger', () => {
		// First package has a real row; second has zero. Mimics ELIGIBLE_PACKAGES
		// vs ledger.package divergence (e.g. a rename like n8n-workflow vs workflow).
		const rows = [
			{
				source_file_path: 'packages/workflow/src/cron.ts',
				package: 'n8n-workflow',
				status: 'green',
			},
		];
		assert.throws(
			() => assertNoLedgerDivergence(rows, ELIGIBLE),
			/zero prior-status \(non-"new"\) rows for eligible package/,
		);
	});

	it('ignores `new` rows when counting prior-status hits', () => {
		// Even with rows present, if they're all `new` it counts as zero prior-status.
		const rows = ELIGIBLE.map((pkg, i) => ({
			source_file_path: `${pkg.dir}/src/seed-${i}.ts`,
			package: pkg.name,
			status: 'new',
		}));
		assert.throws(() => assertNoLedgerDivergence(rows, ELIGIBLE), /zero prior-status/);
	});
});

describe('buildMatrixFromPicked (global picker → matrix shape)', () => {
	it('consumes the global-mode array shape and emits one row per pick', () => {
		const picked = [
			{
				source_file_path: 'packages/workflow/src/cron.ts',
				package: 'n8n-workflow',
				prior_status: 'new',
				effective_status: 'new',
				value: 3.5,
			},
			{
				source_file_path: 'packages/@n8n/crdt/src/utils.ts',
				package: '@n8n/crdt',
				prior_status: 'red',
				effective_status: 'red',
				value: 2.1,
			},
		];
		const matrix = buildMatrixFromPicked(picked, ELIGIBLE);
		assert.equal(matrix.include.length, 2);
		assert.deepEqual(matrix.include[0], {
			name: 'n8n-workflow',
			dir: 'packages/workflow',
			slug: 'workflow',
			mode: 'baseline',
			source_file: 'packages/workflow/src/cron.ts',
			file_slug: 'packages-workflow-src-cron-ts',
		});
		assert.equal(matrix.include[1].mode, 'coverage');
		assert.equal(matrix.include[1].slug, 'crdt');
	});

	it('returns an empty include[] when the picker has no work (picked: [])', () => {
		assert.deepEqual(buildMatrixFromPicked([], ELIGIBLE), { include: [] });
	});

	it('throws when the picker output is not an array (per-package shape would leak through)', () => {
		assert.throws(
			() => buildMatrixFromPicked({ source_file_path: 'x.ts' }, ELIGIBLE),
			/not an array/,
		);
		assert.throws(() => buildMatrixFromPicked(null, ELIGIBLE), /not an array/);
	});

	it('refuses to schedule a job for a package outside ELIGIBLE_PACKAGES', () => {
		// Defence in depth: if the picker ever leaked a row for a non-eligible
		// package (e.g. via a future bug or a stale ledger row), the matrix
		// builder dies rather than spawning a mutate job we can't service.
		const picked = [
			{
				source_file_path: 'packages/@n8n/expression-runtime/src/foo.ts',
				package: '@n8n/expression-runtime',
				prior_status: 'new',
				effective_status: 'new',
				value: 1,
			},
		];
		assert.throws(
			() => buildMatrixFromPicked(picked, ELIGIBLE),
			/not in ELIGIBLE_PACKAGES/,
		);
	});
});
