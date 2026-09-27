/** Compute per-package scope and dispatch to vitest with the right flags. */

import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, resolve } from 'node:path';

import { toPosix } from './path-utils.js';
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

const COVERABLE_SOURCE = /\.(?:[cm]?[jt]sx?|vue)$/;
// Mirrors `coverageExcludes` in @n8n/vitest-config: these never count towards coverage.
const NON_COVERABLE = [
	/\.(?:test|spec)\.[cm]?[jt]sx?$/,
	/(?:^|\/)__(?:tests|mocks)__\//,
	/\.d\.ts$/,
	// Runner config and setup files (vite.config.ts, vitest.workspace.ts, ...) are outside
	// the default `src/**` include. An explicit include would instrument them.
	/(?:^|\/)(?:vite\.|vitest[.-])[^/]*$/,
];
const GLOB_SPECIAL = /[*?[\]{}()!+@]/g;

/**
 * Build the vitest coverage flags for a run with a CHANGED_FILES signal.
 *
 * Patch coverage needs only the changed lines, so measure only the changed
 * source files of this package. Istanbul instruments only the included files,
 * so the rest of the code runs at full speed. V8 coverage slows down all the
 * code that runs, and the default include (`src/**`) makes vitest also report
 * every untested file. When the package has no changed source files, coverage
 * is turned off.
 */
export function buildCoverageArgs(
	changedFiles: string[],
	packageDir: string,
	rootDir: string,
): string[] {
	const absolutePackageDir = isAbsolute(packageDir) ? packageDir : resolve(rootDir, packageDir);
	const sources = changedFiles
		.map((f) => toPosix(relative(absolutePackageDir, resolve(rootDir, f))))
		.filter((f) => !f.startsWith('../') && !isAbsolute(f))
		.filter((f) => COVERABLE_SOURCE.test(f) && !NON_COVERABLE.some((p) => p.test(f)));

	if (sources.length === 0) return ['--coverage.enabled=false'];
	return [
		'--coverage.provider=istanbul',
		// vitest reads `include` as globs, so escape characters that would change the match.
		...sources.map((f) => `--coverage.include=${f.replace(GLOB_SPECIAL, '\\$&')}`),
	];
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

	const coverageArgs =
		options.collectCoverage && options.changedFiles !== null
			? buildCoverageArgs(options.changedFiles, options.packageDir, options.rootDir)
			: [];
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
