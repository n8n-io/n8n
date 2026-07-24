/**
 * Filters CHANGED_FILES to a single package and detects config-file bailouts.
 * Output is a shell sentinel (SKIP / RUN_FULL / file list). The actual
 * import-graph walk is the runner's job (vitest related).
 */

import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import { matchesGlobalTrigger } from './global-triggers.js';
import { toPosix } from './path-utils.js';

// Bailout patterns are centralised here (vs the original DEVP-194 spec's
// per-package `n8nTestChanged.inPackageBailouts` field) because the n8n
// workspace shares the same vitest config helpers + setup file layout via
// @n8n/vitest-config. If a package ever needs a custom bailout that doesn't
// fit these patterns, switch to per-package config rather than expanding
// these any further.
const COMMON_BAILOUT = [
	/^package\.json$/,
	/^tsconfig(\..+)?\.json$/,
	/^\.swcrc$/,
	/^babel\.config\.[cm]?[jt]s$/,
];
// Frontend packages use vite.config.* for the vitest config too (vitest reads
// vite.config). Setup files live at src/__tests__/setup.ts per the shared
// @n8n/vitest-config convention.
const VITEST_BAILOUT = [
	...COMMON_BAILOUT,
	/^vite\.config\.[cm]?[jt]s$/,
	/^vitest\.config\.[cm]?[jt]s$/,
	/(?:^|\/)vitest\.setup\.[cm]?[jt]s$/,
	/(?:^|\/)__tests__\/setup\.[cm]?[jt]s$/,
];

export interface ComputeScopeOptions {
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

	// Workspace-wide triggers (lockfile, root manifest, universal sinks like
	// @n8n/db / workflow / core) force RUN_FULL regardless of which package we
	// are scoping. The dep-graph in affected-packages lists the package as
	// affected, but the in-package filter below would otherwise SKIP it because
	// the trigger file lives outside the package — a silent false green.
	const globalTrigger = options.changedFiles.find(matchesGlobalTrigger);
	if (globalTrigger) {
		return { kind: 'full', reason: 'Global trigger changed', trigger: globalTrigger };
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

	const bailout = VITEST_BAILOUT;
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
