/**
 * Filters CHANGED_FILES to a single package and detects config-file bailouts.
 * Output is a shell sentinel (SKIP / RUN_FULL / file list). The actual
 * import-graph walk is the runner's job (jest --findRelatedTests / vitest
 * related).
 */

import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import { toPosix } from './path-utils.js';

export type Runner = 'jest' | 'vitest';

const COMMON_BAILOUT = [
	/^package\.json$/,
	/^tsconfig(\..+)?\.json$/,
	/^\.swcrc$/,
	/^babel\.config\.[cm]?[jt]s$/,
];
const JEST_BAILOUT = [...COMMON_BAILOUT, /^jest\.config\.[cm]?[jt]s$/, /^jest\.setup\.[cm]?[jt]s$/];
const VITEST_BAILOUT = [
	...COMMON_BAILOUT,
	/^vitest\.config\.[cm]?[jt]s$/,
	/^vitest\.setup\.[cm]?[jt]s$/,
];

export interface ComputeScopeOptions {
	runner: Runner;
	packageDir: string;
	rootDir: string;
	/** `null` = no signal → RUN_FULL (local dev with unset env). */
	changedFiles: string[] | null;
}

export type ScopeResult =
	| { kind: 'skip'; reason: string }
	| { kind: 'full'; reason: string; trigger?: string }
	| { kind: 'scoped'; files: string[] };

export function computeScope(options: ComputeScopeOptions): ScopeResult {
	if (options.changedFiles === null) {
		return { kind: 'full', reason: 'No CHANGED_FILES signal (local dev)' };
	}

	const absolute = isAbsolute(options.packageDir)
		? options.packageDir
		: resolve(options.rootDir, options.packageDir);
	if (!existsSync(absolute)) throw new Error(`Package directory not found: ${absolute}`);
	const pkgPrefix = toPosix(relative(options.rootDir, absolute));
	const pkgPrefixSlash = `${pkgPrefix}/`;

	const inPackage = options.changedFiles.filter(
		(f) => f === pkgPrefix || f.startsWith(pkgPrefixSlash),
	);
	if (inPackage.length === 0) return { kind: 'skip', reason: 'No changed files in package' };

	const bailout = options.runner === 'jest' ? JEST_BAILOUT : VITEST_BAILOUT;
	for (const file of inPackage) {
		const relInPkg = file.slice(pkgPrefixSlash.length);
		if (bailout.some((p) => p.test(relInPkg))) {
			return { kind: 'full', reason: 'Config or package-level file changed', trigger: file };
		}
	}

	return { kind: 'scoped', files: inPackage };
}

export function formatScope(result: ScopeResult): string {
	switch (result.kind) {
		case 'skip':
			return 'SKIP';
		case 'full':
			return 'RUN_FULL';
		case 'scoped':
			return result.files.join(' ');
	}
}
