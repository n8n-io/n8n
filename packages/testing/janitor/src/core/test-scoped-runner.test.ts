import { spawnSync } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { computeScope } from './scope-analyzer.js';
import {
	buildCoverageArgs,
	buildRunnerArgs,
	resolveCoverageArgs,
	resolveExitCode,
	runTestScoped,
} from './test-scoped-runner.js';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
vi.mock('./scope-analyzer.js', () => ({ computeScope: vi.fn() }));

const rootDir = '/repo/root';

describe('runTestScoped coverage wiring', () => {
	const base = {
		packageDir: '/repo/root/packages/cli',
		rootDir,
		passthroughArgs: ['--shard=1/2'],
	};

	beforeEach(() => {
		vi.mocked(spawnSync).mockReturnValue({ status: 0, signal: null } as never);
		vi.mocked(computeScope).mockReturnValue({
			kind: 'scoped',
			files: ['packages/cli/src/a.ts'],
		});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	const spawnedArgs = () => vi.mocked(spawnSync).mock.calls.at(-1)?.[1] ?? [];

	it('limits coverage to changed files when coverage is on and there is a change signal', () => {
		runTestScoped({ ...base, changedFiles: ['packages/cli/src/a.ts'], collectCoverage: true });
		expect(spawnedArgs()).toContain('--coverage.provider=istanbul');
		expect(spawnedArgs()).toContain('--coverage.include=src/a.ts');
		// Explicit passthrough flags stay last so they can override the coverage flags.
		expect(spawnedArgs().at(-1)).toBe('--shard=1/2');
	});

	it('adds no coverage flags when coverage is off', () => {
		runTestScoped({ ...base, changedFiles: ['packages/cli/src/a.ts'], collectCoverage: false });
		expect(spawnedArgs().some((a) => a.startsWith('--coverage'))).toBe(false);
	});

	it('keeps full coverage when there is no change signal (master and nightly runs)', () => {
		vi.mocked(computeScope).mockReturnValue({ kind: 'full', reason: 'no signal' });
		runTestScoped({ ...base, changedFiles: null, collectCoverage: true });
		expect(spawnedArgs()).toEqual(['run', '--shard=1/2']);
	});

	it('turns coverage off for a full run caused only by an upstream package change', () => {
		vi.mocked(computeScope).mockReturnValue({ kind: 'full', reason: 'upstream' });
		runTestScoped({ ...base, changedFiles: ['packages/core/src/x.ts'], collectCoverage: true });
		expect(spawnedArgs()).toEqual(['run', '--coverage.enabled=false', '--shard=1/2']);
	});
});

describe('resolveCoverageArgs', () => {
	const base = { packageDir: '/repo/root/packages/cli', rootDir };

	it('returns the changed-file coverage flags when coverage is on and there is a change signal', () => {
		expect(
			resolveCoverageArgs({
				...base,
				changedFiles: ['packages/cli/src/a.ts'],
				collectCoverage: true,
			}),
		).toEqual(['--coverage.provider=istanbul', '--coverage.include=src/a.ts']);
	});

	it('returns no flags when coverage is off', () => {
		expect(
			resolveCoverageArgs({
				...base,
				changedFiles: ['packages/cli/src/a.ts'],
				collectCoverage: false,
			}),
		).toEqual([]);
	});

	it('returns no flags when there is no change signal', () => {
		expect(resolveCoverageArgs({ ...base, changedFiles: null, collectCoverage: true })).toEqual([]);
	});
});

describe('buildCoverageArgs', () => {
	const packageDir = '/repo/root/packages/cli';

	it('includes only the changed source files of this package, relative to the package', () => {
		expect(
			buildCoverageArgs(
				[
					'packages/cli/src/a.ts',
					'packages/cli/src/nested/b.vue',
					'packages/core/src/other-package.ts',
					'packages/cli-other/src/prefix-sibling.ts',
				],
				packageDir,
				rootDir,
			),
		).toEqual([
			'--coverage.provider=istanbul',
			'--coverage.include=src/a.ts',
			'--coverage.include=src/nested/b.vue',
		]);
	});

	it('ignores test files, mocks, type declarations and non-code files', () => {
		expect(
			buildCoverageArgs(
				[
					'packages/cli/src/a.test.ts',
					'packages/cli/src/a.spec.ts',
					'packages/cli/src/__tests__/helper.ts',
					'packages/cli/src/__mocks__/mock.ts',
					'packages/cli/src/types.d.ts',
					'packages/cli/package.json',
					'packages/cli/README.md',
					'packages/cli/src/kept.ts',
				],
				packageDir,
				rootDir,
			),
		).toEqual(['--coverage.provider=istanbul', '--coverage.include=src/kept.ts']);
	});

	it('ignores vite and vitest config and setup files', () => {
		expect(
			buildCoverageArgs(
				[
					'packages/cli/vite.config.ts',
					'packages/cli/vite.config.mts',
					'packages/cli/vite.ui.config.mts',
					'packages/cli/vitest.config.ts',
					'packages/cli/vitest.config.integration.ts',
					'packages/cli/vitest.integration.config.mjs',
					'packages/cli/vitest.workspace.ts',
					'packages/cli/vitest.integration.setup.ts',
					'packages/cli/scripts/vitest-global-setup.ts',
					'packages/cli/src/vite-plugin-kept.mts',
				],
				packageDir,
				rootDir,
			),
		).toEqual(['--coverage.provider=istanbul', '--coverage.include=src/vite-plugin-kept.mts']);
	});

	it('turns coverage off when only a config file changed', () => {
		expect(buildCoverageArgs(['packages/cli/vite.config.ts'], packageDir, rootDir)).toEqual([
			'--coverage.enabled=false',
		]);
	});

	it('turns coverage off when the package has no changed source files', () => {
		expect(
			buildCoverageArgs(
				['packages/core/src/x.ts', 'packages/cli/src/x.test.ts'],
				packageDir,
				rootDir,
			),
		).toEqual(['--coverage.enabled=false']);
	});

	it('escapes glob characters so each path matches only itself', () => {
		expect(buildCoverageArgs(['packages/cli/src/[id]/(group).ts'], packageDir, rootDir)).toEqual([
			'--coverage.provider=istanbul',
			'--coverage.include=src/\\[id\\]/\\(group\\).ts',
		]);
	});

	it('resolves a relative package dir against the workspace root', () => {
		expect(buildCoverageArgs(['packages/cli/src/a.ts'], 'packages/cli', rootDir)).toEqual([
			'--coverage.provider=istanbul',
			'--coverage.include=src/a.ts',
		]);
	});
});

describe('buildRunnerArgs', () => {
	it('scoped: emits `related` with absolute paths and `--run` to avoid watch mode', () => {
		const args = buildRunnerArgs(
			{
				kind: 'scoped',
				files: ['packages/frontend/editor-ui/src/x.ts', 'packages/frontend/editor-ui/src/y.ts'],
			},
			rootDir,
			['--shard=1/2'],
		);
		expect(args[0]).toBe('related');
		expect(args.slice(1, 3).every(isAbsolute)).toBe(true);
		// `--run` is required: `vitest related` defaults to watch mode without
		// TTY-detection and would hang the CI runner forever.
		expect(args).toContain('--run');
		expect(args.at(-1)).toBe('--shard=1/2');
	});

	it('preserves already-absolute paths', () => {
		const args = buildRunnerArgs(
			{ kind: 'scoped', files: ['/already/absolute/path.ts'] },
			rootDir,
			[],
		);
		expect(args).toEqual(['related', '/already/absolute/path.ts', '--run']);
	});

	it('full: prepends `run` subcommand', () => {
		expect(buildRunnerArgs({ kind: 'full', reason: 'no signal' }, rootDir, ['--coverage'])).toEqual(
			['run', '--coverage'],
		);
	});
});

describe('resolveExitCode', () => {
	it('passes a normal exit status through unchanged', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(resolveExitCode({ status: 0, signal: null })).toBe(0);
		expect(resolveExitCode({ status: 1, signal: null })).toBe(1);
		expect(error).not.toHaveBeenCalled();
	});

	it('reports the spawn error when vitest does not start', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const enoent = new Error('spawnSync vitest ENOENT');
		expect(resolveExitCode({ status: null, signal: null, error: enoent })).toBe(1);
		expect(error).toHaveBeenCalledWith(expect.stringContaining('ENOENT'));
		expect(error).not.toHaveBeenCalledWith(expect.stringContaining('signal'));
	});

	it('names the signal and fails when vitest exits without a status', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(resolveExitCode({ status: null, signal: 'SIGKILL' })).toBe(1);
		expect(error).toHaveBeenCalledWith(expect.stringContaining('SIGKILL'));
	});
});
