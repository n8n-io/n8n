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

		// Dry runs keep the job's filters but drop --summarize. The full task never
		// gets --only: without dependency tasks, turbo's hash misses dependency changes.
		expect(dryRun).toHaveBeenCalledWith(
			'test:unit',
			[],
			['--filter=!./packages/frontend/**'],
			['--shard=1/2'],
		);
		expect(run.mock.calls).toEqual([
			[
				'test:unit',
				['--summarize'],
				['--filter=hit', '--filter=miss', '--filter=noScopedTask'],
				['--shard=1/2'],
			],
			['test:unit:changed', ['--only', '--summarize'], ['--filter=scoped'], ['--shard=1/2']],
		]);
	});

	it('runs a package that janitor would skip when the job has no scoped task', () => {
		const { run, deps: d } = deps(
			{ skipped: { kind: 'skip', reason: 'No changed files in package' } },
			{ 'test:unit': [task('skipped', 'test:unit')] },
		);

		runTestRun(parseTestRunArgs(['--full-task=test:unit', '--filter=!n8n']), d);

		expect(run.mock.calls).toEqual([['test:unit', [], ['--filter=skipped'], []]]);
	});

	it('runs the scoped batch after a failed full batch and reports the failure', () => {
		const { run, deps: d } = deps(
			{
				miss: { kind: 'full', reason: 'Sink package changed' },
				scoped: { kind: 'scoped', files: ['packages/scoped/src/a.ts'] },
			},
			{
				'test:unit': [task('miss', 'test:unit'), task('scoped', 'test:unit')],
				'test:unit:changed': [task('scoped', 'test:unit:changed')],
			},
		);
		run.mockImplementation((t) => (t === 'test:unit' ? 1 : 0));

		expect(runTestRun(args, d)).toBe(1);
		expect(run).toHaveBeenCalledTimes(2);

		run.mockImplementation((t) => (t === 'test:unit' ? 0 : 1));
		expect(runTestRun(args, d)).toBe(1);
	});

	it('fails when no named package defines the full task', () => {
		const { run, deps: d } = deps({}, { 'test:unit': [] });

		expect(runTestRun(parseTestRunArgs(['--full-task=test:unit', '--filter=n8n']), d)).toBe(1);
		expect(run).not.toHaveBeenCalled();
	});

	it('runs the job unplanned when the dry run fails', () => {
		const { run, deps: d } = deps({}, {});
		d.dryRun.mockImplementation(() => {
			throw new Error('turbo failed');
		});

		d.run.mockReturnValue(1);

		expect(runTestRun(args, d)).toBe(1);
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
