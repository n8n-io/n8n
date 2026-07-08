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
			runner: 'vitest',
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
			runner: 'vitest',
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
			runner: 'vitest',
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
			runner: 'vitest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/other/package.json'],
		});
		expect(result.kind).toBe('skip');
	});

	it('bails to full on vitest.config change', () => {
		const rootDir = makePackageDir('packages/cli');
		const result = computeScope({
			runner: 'vitest',
			packageDir: 'packages/cli',
			rootDir,
			changedFiles: ['packages/cli/vitest.config.ts'],
		});
		expect(result.kind).toBe('full');
	});

	it('bails to full on vite.config change (vitest reads vite.config)', () => {
		const rootDir = makePackageDir('packages/frontend/editor-ui');
		const result = computeScope({
			runner: 'vitest',
			packageDir: 'packages/frontend/editor-ui',
			rootDir,
			changedFiles: ['packages/frontend/editor-ui/vite.config.mts'],
		});
		expect(result.kind).toBe('full');
	});

	it('bails to full on src/__tests__/setup.ts change', () => {
		const rootDir = makePackageDir('packages/frontend/editor-ui');
		const result = computeScope({
			runner: 'vitest',
			packageDir: 'packages/frontend/editor-ui',
			rootDir,
			changedFiles: ['packages/frontend/editor-ui/src/__tests__/setup.ts'],
		});
		expect(result.kind).toBe('full');
	});

	describe('global triggers force RUN_FULL', () => {
		it.each([
			['pnpm-lock.yaml', 'pnpm-lock.yaml'],
			['root package.json', 'package.json'],
			['@n8n/db entity', 'packages/@n8n/db/src/entities/user.entity.ts'],
			['workflow source', 'packages/workflow/src/Workflow.ts'],
			['core source', 'packages/core/src/x.ts'],
		])('bails to full on %s even when nothing changed in-package', (_label, changed) => {
			const rootDir = makePackageDir('packages/cli');
			const result = computeScope({
				runner: 'vitest',
				packageDir: 'packages/cli',
				rootDir,
				changedFiles: [changed],
			});
			expect(result.kind).toBe('full');
			expect(formatScope(result)).toBe('RUN_FULL');
		});

		it('a universal-sink change forces full for a downstream package too', () => {
			const rootDir = makePackageDir('packages/nodes-base');
			const result = computeScope({
				runner: 'vitest',
				packageDir: 'packages/nodes-base',
				rootDir,
				changedFiles: ['packages/workflow/src/Workflow.ts'],
			});
			expect(result.kind).toBe('full');
		});

		it('does NOT treat a per-package package.json as a global trigger', () => {
			const rootDir = makePackageDir('packages/cli');
			const result = computeScope({
				runner: 'vitest',
				packageDir: 'packages/cli',
				rootDir,
				changedFiles: ['packages/other/package.json'],
			});
			expect(result.kind).toBe('skip');
		});

		it('still SKIPs an unrelated cross-package change', () => {
			const rootDir = makePackageDir('packages/cli');
			const result = computeScope({
				runner: 'vitest',
				packageDir: 'packages/cli',
				rootDir,
				changedFiles: ['packages/nodes-base/nodes/Slack/Slack.node.ts'],
			});
			expect(result.kind).toBe('skip');
		});
	});
});
