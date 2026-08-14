import { isAbsolute } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildRunnerArgs } from './test-scoped-runner.js';

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
});
