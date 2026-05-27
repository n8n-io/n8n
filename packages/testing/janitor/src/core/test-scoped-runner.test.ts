import { isAbsolute } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildRunnerArgs } from './test-scoped-runner.js';

const rootDir = '/repo/root';

describe('buildRunnerArgs', () => {
	it('jest scoped: emits --findRelatedTests with absolute paths', () => {
		const args = buildRunnerArgs(
			'jest',
			{ kind: 'scoped', files: ['packages/nodes-base/nodes/Foo.node.ts'] },
			rootDir,
			['--summarize'],
		);
		expect(args[0]).toBe('--findRelatedTests');
		expect(isAbsolute(args[1])).toBe(true);
		expect(args[1]).toBe('/repo/root/packages/nodes-base/nodes/Foo.node.ts');
		expect(args[2]).toBe('--summarize');
	});

	it('vitest scoped: emits `related` with absolute paths and `--run` to avoid watch mode', () => {
		const args = buildRunnerArgs(
			'vitest',
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
			'jest',
			{ kind: 'scoped', files: ['/already/absolute/path.ts'] },
			rootDir,
			[],
		);
		expect(args).toEqual(['--findRelatedTests', '/already/absolute/path.ts']);
	});

	it('jest full: passes through args with no related-tests flag', () => {
		expect(
			buildRunnerArgs('jest', { kind: 'full', reason: 'config change' }, rootDir, ['--summarize']),
		).toEqual(['--summarize']);
	});

	it('vitest full: prepends `run` subcommand', () => {
		expect(
			buildRunnerArgs('vitest', { kind: 'full', reason: 'no signal' }, rootDir, ['--coverage']),
		).toEqual(['run', '--coverage']);
	});
});
