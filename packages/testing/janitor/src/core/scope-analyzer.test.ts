import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { computeScope, formatScope } from './scope-analyzer.js';

function makePackageDir(name: string): string {
	const root = join(tmpdir(), `janitor-scope-${Math.random().toString(36).slice(2)}`);
	const pkgDir = join(root, name);
	mkdirSync(pkgDir, { recursive: true });
	writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'some-pkg' }));
	return root;
}

describe('computeScope', () => {
	it('returns full when CHANGED_FILES signal is missing (local dev)', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'jest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: null,
		});
		expect(result.kind).toBe('full');
		expect(formatScope(result)).toBe('RUN_FULL');
	});

	it('returns skip when no in-package files changed', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'jest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/other/src/x.ts'],
		});
		expect(result).toEqual({ kind: 'skip', reason: 'No changed files in package' });
		expect(formatScope(result)).toBe('SKIP');
	});

	it('returns scoped list when only source files changed', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'jest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/cli/src/a.ts', 'packages/cli/src/b.ts'],
		});
		expect(result).toEqual({
			kind: 'scoped',
			files: ['packages/cli/src/a.ts', 'packages/cli/src/b.ts'],
		});
		expect(formatScope(result)).toBe('packages/cli/src/a.ts packages/cli/src/b.ts');
	});

	it('bails to full on jest.config change for jest runner', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'jest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/cli/jest.config.js'],
		});
		expect(result.kind).toBe('full');
		expect(formatScope(result)).toBe('RUN_FULL');
	});

	it('bails to full on package.json change', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'vitest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/cli/package.json'],
		});
		expect(result.kind).toBe('full');
	});

	it('bails to full on tsconfig change', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'vitest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/cli/tsconfig.build.json'],
		});
		expect(result.kind).toBe('full');
	});

	it('ignores files outside the package even when configs match', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'jest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/other/package.json'],
		});
		expect(result.kind).toBe('skip');
	});

	it('does NOT bail on vitest.config when runner is jest', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'jest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/cli/vitest.config.ts'],
		});
		// vitest.config in a jest-tested package is not a runner bailout trigger.
		// (It's unusual but the bailout is runner-specific.)
		expect(result.kind).toBe('scoped');
	});
});
