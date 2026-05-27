/** Compute per-package scope and dispatch to jest/vitest with the right flags. */

import { spawnSync } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';

import { computeScope, type Runner, type ScopeResult } from './scope-analyzer.js';

export interface TestScopedOptions {
	runner: Runner;
	packageDir: string;
	rootDir: string;
	changedFiles: string[] | null;
	passthroughArgs: string[];
}

/**
 * Build the runner argv from a scope result. Paths are resolved to absolute
 * because pnpm/turbo runs `test:changed` with cwd=packageDir, while CHANGED_FILES
 * is repo-root-relative — handing a relative path to `jest --findRelatedTests` or
 * `vitest related` from inside the package would silently match zero files and
 * exit 0 with no tests run.
 */
export function buildRunnerArgs(
	runner: Runner,
	scope: Extract<ScopeResult, { kind: 'scoped' | 'full' }>,
	rootDir: string,
	passthroughArgs: string[],
): string[] {
	if (scope.kind === 'full') {
		return runner === 'vitest' ? ['run', ...passthroughArgs] : [...passthroughArgs];
	}
	const absoluteFiles = scope.files.map((f) => (isAbsolute(f) ? f : resolve(rootDir, f)));
	// `vitest related` defaults to watch mode and does NOT TTY-detect, so it
	// would hang the CI runner forever. `--run` forces a single-pass execution.
	return runner === 'jest'
		? ['--findRelatedTests', ...absoluteFiles, ...passthroughArgs]
		: ['related', ...absoluteFiles, '--run', ...passthroughArgs];
}

export function runTestScoped(options: TestScopedOptions): number {
	const scope = computeScope({
		runner: options.runner,
		packageDir: options.packageDir,
		rootDir: options.rootDir,
		changedFiles: options.changedFiles,
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

	const args = buildRunnerArgs(options.runner, scope, options.rootDir, options.passthroughArgs);
	// Pass cwd explicitly so an override via --package-dir is honoured
	// (otherwise spawnSync inherits the caller's cwd and jest/vitest would
	// resolve config + tests from the wrong project).
	return spawnSync(options.runner, args, { stdio: 'inherit', cwd: options.packageDir }).status ?? 1;
}
