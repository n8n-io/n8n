import { describe, expect, it, vi } from 'vitest';

import type { ScopeResult } from './scope-analyzer.js';
import { parseTestRunArgs, runTestRun, type DryRunTask, type TestRunDeps } from './test-run.js';

const task = (
	name: string,
	taskName: string,
	status = 'MISS',
	command = 'vitest run',
): DryRunTask => ({
	task: taskName,
	package: name,
	directory: `packages/${name}`,
	command,
	cache: { status },
});

function deps(decisions: Record<string, ScopeResult>, dryRuns: Record<string, DryRunTask[]>) {
	const run = vi.fn<TestRunDeps['run']>().mockReturnValue(0);
	const dryRun = vi.fn<TestRunDeps['dryRun']>((t) => dryRuns[t] ?? []);
	return {
		run,
		dryRun,
		deps: { run, dryRun, decide: (t: DryRunTask) => decisions[t.package], log: () => {} },
	};
}

describe('test-run', () => {
	const args = parseTestRunArgs([
		'--full-task=test:unit',
		'--scoped-task=test:unit:changed',
		'--filter=!./packages/frontend/**',
		'--only',
		'--summarize',
		'--',
		'--shard=1/2',
	]);

	it('replays cached packages, runs full and scoped packages, and skips the rest', () => {
		const {
			run,
			dryRun,
			deps: d,
		} = deps(
			{
				miss: { kind: 'full', reason: 'Lockfile changed its dependencies' },
				scoped: { kind: 'scoped', files: ['packages/scoped/src/a.ts'] },
				noScopedTask: { kind: 'scoped', files: ['packages/noScopedTask/src/a.ts'] },
				skipped: { kind: 'skip', reason: 'No changed files in package' },
			},
			{
				'test:unit': [
					task('hit', 'test:unit', 'HIT'),
					task('miss', 'test:unit'),
					task('scoped', 'test:unit'),
					task('noScopedTask', 'test:unit'),
					task('skipped', 'test:unit'),
					task('noTests', 'test:unit', 'MISS', '<NONEXISTENT>'),
				],
				'test:unit:changed': [
					task('scoped', 'test:unit:changed'),
					task('skipped', 'test:unit:changed'),
				],
			},
		);

		expect(runTestRun(args, d)).toBe(0);

		// Dry runs keep the job's filters but drop --summarize.
		expect(dryRun).toHaveBeenCalledWith(
			'test:unit',
			['--only'],
			['--filter=!./packages/frontend/**'],
			['--shard=1/2'],
		);
		expect(run.mock.calls).toEqual([
			[
				'test:unit',
				['--only', '--summarize'],
				['--filter=hit', '--filter=miss', '--filter=noScopedTask'],
				['--shard=1/2'],
			],
			['test:unit:changed', ['--only', '--summarize'], ['--filter=scoped'], ['--shard=1/2']],
		]);
	});

	it('runs the job unplanned when the dry run fails', () => {
		const { run, deps: d } = deps({}, {});
		d.dryRun.mockImplementation(() => {
			throw new Error('turbo failed');
		});

		runTestRun(args, d);

		expect(run.mock.calls).toEqual([
			[
				'test:unit:changed',
				['--only', '--summarize'],
				['--filter=!./packages/frontend/**'],
				['--shard=1/2'],
			],
		]);
	});
});
