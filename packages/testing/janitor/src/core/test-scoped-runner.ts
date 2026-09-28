/** Compute per-package scope and dispatch to vitest with the right flags. */

import { changedCoverageIncludes } from '@n8n/vitest-config/changed-file-coverage';
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
	/** True when the run collects coverage (`COVERAGE_ENABLED=true`). */
	collectCoverage?: boolean;
}

/**
 * Build the vitest coverage flags for a run with a CHANGED_FILES signal.
 *
 * `@n8n/vitest-config/changed-file-coverage` decides which files count. The
 * shared vitest configs apply the same rule. The flags also cover packages
 * whose config does not use the shared helper, because CLI flags win.
 * When the package has no changed source files, coverage is turned off.
 */
export function buildCoverageArgs(
	changedFiles: string[],
	packageDir: string,
	rootDir: string,
): string[] {
	const includes = changedCoverageIncludes(changedFiles, packageDir, rootDir);
	if (includes.length === 0) return ['--coverage.enabled=false'];
	return ['--coverage.provider=istanbul', ...includes.map((f) => `--coverage.include=${f}`)];
}

/**
 * Coverage flags for a run. Returns none when the run collects no coverage or
 * has no change signal: then the vitest config decides coverage.
 */
export function resolveCoverageArgs(
	options: Pick<TestScopedOptions, 'changedFiles' | 'packageDir' | 'rootDir' | 'collectCoverage'>,
): string[] {
	if (!options.collectCoverage || options.changedFiles === null) return [];
	return buildCoverageArgs(options.changedFiles, options.packageDir, options.rootDir);
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
): string[] {
	if (scope.kind === 'full') {
		return ['run', ...passthroughArgs];
	}
	const absoluteFiles = scope.files.map((f) => (isAbsolute(f) ? f : resolve(rootDir, f)));
	// `vitest related` defaults to watch mode and does NOT TTY-detect, so it
	// would hang the CI runner forever. `--run` forces a single-pass execution.
	return ['related', ...absoluteFiles, '--run', ...passthroughArgs];
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

	const coverageArgs = resolveCoverageArgs(options);
	if (coverageArgs.length > 0) {
		console.log(`[janitor:test-scoped] coverage: ${coverageArgs.join(' ')}`);
	}

	// Coverage flags go first, so a passthrough flag wins for single-value options.
	const args = buildRunnerArgs(scope, options.rootDir, [
		...coverageArgs,
		...options.passthroughArgs,
	]);
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
