/** Compute per-package scope and dispatch to vitest with the right flags. */

import { spawnSync } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';

import { computeScope, type ScopeResult } from './scope-analyzer.js';

export interface TestScopedOptions {
	packageDir: string;
	rootDir: string;
	changedFiles: string[] | null;
	packageName?: string;
	affectedPackages?: string[] | null;
	passthroughArgs: string[];
}

/**
 * Build the runner argv from a scope result. Paths are resolved to absolute
 * because pnpm/turbo runs `test:changed` with cwd=packageDir, while CHANGED_FILES
 * is repo-root-relative — handing a relative path to `vitest related` from inside
 * the package would silently match zero files and exit 0 with no tests run.
 */
export function buildRunnerArgs(
	scope: Extract<ScopeResult, { kind: 'scoped' | 'full' }>,
	rootDir: string,
	passthroughArgs: string[],
	shard?: string,
): string[] {
	const runnerArgs =
		shard && !passthroughArgs.some((arg) => arg === '--shard' || arg.startsWith('--shard='))
			? [...passthroughArgs, `--shard=${shard}`]
			: passthroughArgs;
	if (scope.kind === 'full') {
		return ['run', ...runnerArgs];
	}
	const absoluteFiles = scope.files.map((f) => (isAbsolute(f) ? f : resolve(rootDir, f)));
	// `vitest related` defaults to watch mode and does NOT TTY-detect, so it
	// would hang the CI runner forever. `--run` forces a single-pass execution.
	return ['related', ...absoluteFiles, '--run', ...runnerArgs];
}

export function runTestScoped(options: TestScopedOptions): number {
	const scope = computeScope({
		packageDir: options.packageDir,
		rootDir: options.rootDir,
		changedFiles: options.changedFiles,
		packageName: options.packageName,
		affectedPackages: options.affectedPackages,
	});

	if (scope.kind === 'skip') {
		console.log(`[janitor:test-scoped] ${scope.reason} → skipping`);
		return 0;
	}

	if (scope.kind === 'full') {
		console.log(`[janitor:test-scoped] ${scope.reason} → full suite`);
	} else {
		console.log(`[janitor:test-scoped] scoping to ${scope.files.length} file(s)`);
	}

	const args = buildRunnerArgs(
		scope,
		options.rootDir,
		options.passthroughArgs,
		process.env.VITEST_SHARD,
	);
	// Pass cwd explicitly so an override via --package-dir is honoured
	// (otherwise spawnSync inherits the caller's cwd and vitest would
	// resolve config + tests from the wrong project).
	const result = spawnSync('vitest', args, { stdio: 'inherit', cwd: options.packageDir });
	return resolveExitCode(result);
}

// A signal-killed vitest has no status and prints no summary, so name the signal.
// A spawn failure has no status either; with inherited stdio, only `error` reports it.
export function resolveExitCode(result: {
	status: number | null;
	signal: NodeJS.Signals | null;
	error?: Error;
}): number {
	if (result.status !== null) return result.status;
	if (result.error) {
		console.error(`[janitor:test-scoped] vitest failed to start: ${result.error.message}`);
		return 1;
	}
	console.error(
		`[janitor:test-scoped] vitest exited without a status (signal: ${result.signal ?? 'unknown'}). ` +
			'The process was killed before it could report results; check the runner for memory pressure.',
	);
	return 1;
}
