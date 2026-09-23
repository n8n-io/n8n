import { isAbsolute } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { buildRunnerArgs, resolveExitCode } from './test-scoped-runner.js';

const rootDir = '/repo/root';

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

	it('uses the environment shard when no explicit shard is present', () => {
		expect(
			buildRunnerArgs({ kind: 'full', reason: 'no signal' }, rootDir, ['--coverage'], '1/4'),
		).toEqual(['run', '--coverage', '--shard=1/4']);
	});

	it('keeps an explicit shard instead of adding the environment shard', () => {
		expect(
			buildRunnerArgs({ kind: 'full', reason: 'no signal' }, rootDir, ['--shard=2/4'], '1/4'),
		).toEqual(['run', '--shard=2/4']);
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
