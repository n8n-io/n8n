/**
 * Workspace dependency-graph walk for the dep-graph selector (DEVP-389).
 *
 * A changed dependency isn't a source file, so the coverage map has no entry for
 * it and a dep bump fails open to broad. This walks the other way: a changed dep
 * name → the workspace packages that declare it → (via the coverage map) the
 * specs that exercise those packages. A dep used only by a leaf package then
 * scopes to that leaf instead of running the whole suite.
 *
 * Pure: the caller supplies `importers` — each workspace package dir mapped to
 * the runtime dependency names it declares (parsed from pnpm-lock.yaml's
 * `importers` section). No subprocess, no yaml dependency here.
 */

/** Map of workspace package dir → the runtime dependency names it declares. */
export type WorkspaceImporters = Record<string, string[]>;

/**
 * The workspace package dirs that declare any of `deps`. These are the *direct*
 * importers (a dep declared in their package.json). A purely transitive dep —
 * declared by no workspace package — yields `[]`, which the caller treats as
 * "can't attribute → broad".
 */
export function dependentDirs(deps: string[], importers: WorkspaceImporters): string[] {
	const wanted = new Set(deps);
	const dirs: string[] = [];
	for (const [dir, declared] of Object.entries(importers)) {
		if (declared.some((name) => wanted.has(name))) dirs.push(dir);
	}
	return dirs.sort();
}
