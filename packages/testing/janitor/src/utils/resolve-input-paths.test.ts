import * as path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { setConfig, resetConfig, defineConfig } from '../config.js';
import { resolveInputPaths } from './paths.js';

describe('resolveInputPaths', () => {
	const rootDir = '/repo/packages/testing/playwright';
	const gitRoot = '/repo';

	beforeEach(() => {
		setConfig(defineConfig({ rootDir }));
	});

	afterEach(() => {
		resetConfig();
	});

	it('returns absolute paths unchanged', () => {
		const files = ['/repo/packages/testing/playwright/pages/CanvasPage.ts'];
		const result = resolveInputPaths(files, gitRoot);

		expect(result).toEqual(['/repo/packages/testing/playwright/pages/CanvasPage.ts']);
	});

	it('resolves rootDir-relative paths against rootDir', () => {
		const files = ['pages/CanvasPage.ts', 'tests/canvas.spec.ts'];
		const result = resolveInputPaths(files, gitRoot);

		expect(result).toEqual([
			path.resolve(rootDir, 'pages/CanvasPage.ts'),
			path.resolve(rootDir, 'tests/canvas.spec.ts'),
		]);
	});

	it('resolves repo-root-relative paths against gitRoot', () => {
		const files = [
			'packages/testing/playwright/pages/CanvasPage.ts',
			'packages/testing/playwright/tests/canvas.spec.ts',
		];
		const result = resolveInputPaths(files, gitRoot);

		expect(result).toEqual([
			'/repo/packages/testing/playwright/pages/CanvasPage.ts',
			'/repo/packages/testing/playwright/tests/canvas.spec.ts',
		]);
	});

	it('handles mixed path formats', () => {
		const files = [
			'/repo/packages/testing/playwright/pages/Absolute.ts',
			'pages/RootDirRelative.ts',
			'packages/testing/playwright/pages/RepoRootRelative.ts',
		];
		const result = resolveInputPaths(files, gitRoot);

		expect(result).toEqual([
			'/repo/packages/testing/playwright/pages/Absolute.ts',
			path.resolve(rootDir, 'pages/RootDirRelative.ts'),
			'/repo/packages/testing/playwright/pages/RepoRootRelative.ts',
		]);
	});

	it('works when rootDir equals gitRoot (single-package repo)', () => {
		resetConfig();
		setConfig(defineConfig({ rootDir: '/my-project' }));

		const files = ['tests/foo.spec.ts', 'pages/Bar.ts'];
		const result = resolveInputPaths(files, '/my-project');

		// Both git-root-relative and rootDir-relative resolve the same
		expect(result).toEqual(['/my-project/tests/foo.spec.ts', '/my-project/pages/Bar.ts']);
	});

	it('falls back to rootDir when path is outside git scope', () => {
		// A path that doesn't land within rootDir when resolved from gitRoot
		const files = ['some-other-package/utils.ts'];
		const result = resolveInputPaths(files, gitRoot);

		// /repo/some-other-package/utils.ts does NOT start with rootDir,
		// so it falls back to rootDir-relative resolution
		expect(result).toEqual([path.resolve(rootDir, 'some-other-package/utils.ts')]);
	});

	it('does not match sibling directories sharing a prefix with rootDir', () => {
		// "playwright-utils" shares the prefix "playwright" with rootDir
		const files = ['packages/testing/playwright-utils/helper.ts'];
		const result = resolveInputPaths(files, gitRoot);

		// Should NOT match rootDir (/repo/packages/testing/playwright)
		// Should fall back to rootDir-relative resolution
		expect(result).toEqual([path.resolve(rootDir, 'packages/testing/playwright-utils/helper.ts')]);
	});

	it('handles empty input', () => {
		expect(resolveInputPaths([], gitRoot)).toEqual([]);
	});
});
