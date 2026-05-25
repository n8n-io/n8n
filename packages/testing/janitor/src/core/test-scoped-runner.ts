/** Compute per-package scope and dispatch to jest/vitest with the right flags. */

import { spawnSync } from 'node:child_process';

import { computeScope, type Runner } from './scope-analyzer.js';

export interface TestScopedOptions {
	runner: Runner;
	packageDir: string;
	rootDir: string;
	changedFiles: string[] | null;
	passthroughArgs: string[];
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

	let args: string[];
	if (scope.kind === 'full') {
		console.log(`[janitor:test-scoped] ${scope.reason} → full suite`);
		args =
			options.runner === 'vitest' ? ['run', ...options.passthroughArgs] : options.passthroughArgs;
	} else {
		console.log(`[janitor:test-scoped] scoping to ${scope.files.length} file(s)`);
		args =
			options.runner === 'jest'
				? ['--findRelatedTests', ...scope.files, ...options.passthroughArgs]
				: ['related', ...scope.files, ...options.passthroughArgs];
	}

	return spawnSync(options.runner, args, { stdio: 'inherit' }).status ?? 1;
}
