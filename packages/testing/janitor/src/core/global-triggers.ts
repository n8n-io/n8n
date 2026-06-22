/**
 * Files and directory prefixes whose changes force RUN_FULL across the whole
 * workspace.
 *
 * These MUST be consulted at BOTH layers of the scoping pipeline:
 *   - `affectedPackages()` — returns every package so all test jobs are listed
 *     as affected and provision a runner.
 *   - `computeScope()`     — returns RUN_FULL so each job actually executes its
 *     full suite instead of SKIPping on "no changed files in package".
 *
 * Both checks are required. `affectedPackages` alone only decides which jobs
 * are *listed*; without the `computeScope` check a global-trigger change makes
 * every scoped package SKIP — running zero tests and reporting a false green.
 */
export const GLOBAL_TRIGGER_FILES = new Set(['pnpm-lock.yaml', 'package.json']);

/**
 * Directory prefixes consumed at runtime by packages that don't import them in
 * a way the test runner's import-graph walk can see. A change here is invisible
 * to `jest --findRelatedTests` / `vitest related` on the test file, so we bail
 * the workspace to full rather than silently skip:
 *   - `packages/@n8n/db/` — schema + entities resolved through the DI container
 *     by every consuming package's integration tests.
 *   - `packages/workflow/`, `packages/core/` — universal sinks imported by
 *     ~everything; a behaviour change that keeps the same type signature is not
 *     visible to a downstream import-graph walk (typecheck only catches the
 *     contract). DEVP-195.
 *
 * Over-broad on the rare PRs that touch these (keeps the failure mode "ran too
 * much" rather than "ran nothing"), which is the intended trade-off.
 */
export const GLOBAL_TRIGGER_PREFIXES = [
	'packages/@n8n/db/',
	'packages/workflow/',
	'packages/core/',
];

/** True when a repo-root-relative path forces a full workspace run. */
export function matchesGlobalTrigger(file: string): boolean {
	return GLOBAL_TRIGGER_FILES.has(file) || GLOBAL_TRIGGER_PREFIXES.some((p) => file.startsWith(p));
}
