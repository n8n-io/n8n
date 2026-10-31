/**
 * `test-run`: run a package set's tests, reusing turbo's cache first and
 * falling back to janitor scoping.
 *
 * 1. A turbo dry run of the full task finds the packages whose result is
 *    already cached (same inputs, dependencies, lockfile subset and env).
 * 2. Every other package gets janitor's decision: skip, scoped, or full.
 * 3. Cached and full packages run the full, cacheable task, so a hit replays
 *    and a miss stores a result for the next push. Scoped packages run the
 *    scoped task, which `vitest related` limits to the changed files.
 *
 * A package that has no scoped task runs the full task: it must never skip
 * tests that a scoped run would have run.
 */
import { spawnSync } from 'node:child_process';

import type { ScopeResult } from './scope-analyzer.js';

export interface TestRunArgs {
	fullTask: string;
	scopedTask?: string;
	/** Turbo flags other than package filters, e.g. `--only`, `--continue`. */
	turboFlags: string[];
	/** Turbo package filters that choose the job's packages. */
	filters: string[];
	/** Arguments after `--`, forwarded to every task (for example `--shard=1/2`). */
	taskArgs: string[];
}

export function parseTestRunArgs(argv: string[]): TestRunArgs {
	const args: TestRunArgs = { fullTask: '', turboFlags: [], filters: [], taskArgs: [] };
	const separator = argv.indexOf('--');
	const own = separator === -1 ? argv : argv.slice(0, separator);
	if (separator !== -1) args.taskArgs = argv.slice(separator + 1);
	for (const arg of own) {
		if (arg.startsWith('--full-task=')) args.fullTask = arg.slice('--full-task='.length);
		else if (arg.startsWith('--scoped-task=')) args.scopedTask = arg.slice('--scoped-task='.length);
		else if (arg.startsWith('--filter=')) args.filters.push(arg);
		// janitor's own flags, read by the CLI, not turbo
		else if (arg.startsWith('--base=') || arg.startsWith('--changed-files=')) continue;
		else args.turboFlags.push(arg);
	}
	if (!args.fullTask) throw new Error('test-run needs --full-task=<turbo task>');
	return args;
}

/** One task of `turbo run --dry=json`. */
export interface DryRunTask {
	task: string;
	package: string;
	directory: string;
	command: string;
	cache: { status: string };
}

export type PackageDecision = 'cached' | 'full' | 'scoped' | 'skip';

export interface PlannedPackage {
	name: string;
	decision: PackageDecision;
	reason: string;
}

/** Packages that define `task`, with their dry-run entry. */
export function tasksFor(task: string, dryRun: DryRunTask[]): DryRunTask[] {
	return dryRun.filter((t) => t.task === task && t.command !== '<NONEXISTENT>');
}

/** Pure planning step: see the module comment for the order of the checks. */
export function planTestRun(
	fullTasks: DryRunTask[],
	scopedPackages: ReadonlySet<string>,
	decide: (task: DryRunTask) => ScopeResult,
): PlannedPackage[] {
	return fullTasks.map((task) => {
		if (task.cache.status === 'HIT') {
			return { name: task.package, decision: 'cached', reason: 'turbo cache hit' };
		}
		const scope = decide(task);
		if (scope.kind === 'skip')
			return { name: task.package, decision: 'skip', reason: scope.reason };
		if (scope.kind === 'full')
			return { name: task.package, decision: 'full', reason: scope.reason };
		if (!scopedPackages.has(task.package)) {
			return { name: task.package, decision: 'full', reason: 'No scoped task' };
		}
		return {
			name: task.package,
			decision: 'scoped',
			reason: `${scope.files.length} changed file(s)`,
		};
	});
}

export function formatPlan(plan: PlannedPackage[]): string {
	const width = Math.max(0, ...plan.map((p) => p.name.length));
	return plan
		.map((p) => `[janitor:test-run] ${p.name.padEnd(width)}  ${p.decision.padEnd(6)}  ${p.reason}`)
		.join('\n');
}

export interface TestRunDeps {
	dryRun(task: string, flags: string[], filters: string[], taskArgs: string[]): DryRunTask[];
	run(task: string, flags: string[], filters: string[], taskArgs: string[]): number;
	decide(task: DryRunTask): ScopeResult;
	log(message: string): void;
}

const isSummarize = (flag: string) => flag === '--summarize' || flag.startsWith('--summarize=');

export function runTestRun(args: TestRunArgs, deps: TestRunDeps): number {
	// A dry run writes no summary; keep `--summarize` for the real runs only.
	const dryFlags = args.turboFlags.filter((flag) => !isSummarize(flag));
	let plan: PlannedPackage[];
	try {
		const fullTasks = tasksFor(
			args.fullTask,
			deps.dryRun(args.fullTask, dryFlags, args.filters, args.taskArgs),
		);
		const scopedPackages = new Set(
			args.scopedTask
				? tasksFor(
						args.scopedTask,
						deps.dryRun(args.scopedTask, dryFlags, args.filters, args.taskArgs),
					).map((t) => t.package)
				: [],
		);
		plan = planTestRun(fullTasks, scopedPackages, deps.decide);
	} catch (error) {
		// Without a plan, run what the job ran before: the scoped task if it has
		// one (janitor still scopes each package), else the full task.
		deps.log(`[janitor:test-run] could not plan (${(error as Error).message}), running unplanned`);
		return deps.run(args.scopedTask ?? args.fullTask, args.turboFlags, args.filters, args.taskArgs);
	}
	deps.log(formatPlan(plan));

	const byName = (decisions: PackageDecision[]) =>
		plan.filter((p) => decisions.includes(p.decision)).map((p) => `--filter=${p.name}`);
	const full = byName(['cached', 'full']);
	const scoped = byName(['scoped']);

	let exitCode = 0;
	if (full.length > 0) {
		exitCode ||= deps.run(args.fullTask, args.turboFlags, full, args.taskArgs);
	}
	if (scoped.length > 0 && args.scopedTask) {
		exitCode ||= deps.run(args.scopedTask, args.turboFlags, scoped, args.taskArgs);
	}
	return exitCode;
}

function turboArgs(task: string, flags: string[], filters: string[], taskArgs: string[]) {
	return [
		'turbo',
		'run',
		task,
		...flags,
		...filters,
		...(taskArgs.length ? ['--', ...taskArgs] : []),
	];
}

export function spawnDryRun(
	cwd: string,
): (task: string, flags: string[], filters: string[], taskArgs: string[]) => DryRunTask[] {
	return (task, flags, filters, taskArgs) => {
		const args = turboArgs(task, flags, filters, taskArgs);
		args.splice(3, 0, '--dry=json');
		const result = spawnSync('pnpm', ['exec', ...args], {
			cwd,
			encoding: 'utf-8',
			maxBuffer: 256 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'inherit'],
		});
		if (result.status !== 0) throw new Error(`turbo dry run failed for ${task}`);
		const parsed = JSON.parse(result.stdout) as { tasks?: DryRunTask[] };
		return parsed.tasks ?? [];
	};
}

export function spawnRun(
	cwd: string,
): (task: string, flags: string[], filters: string[], taskArgs: string[]) => number {
	return (task, flags, filters, taskArgs) => {
		const result = spawnSync('pnpm', ['exec', ...turboArgs(task, flags, filters, taskArgs)], {
			cwd,
			stdio: 'inherit',
		});
		return result.status ?? 1;
	};
}
