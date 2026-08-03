/**
 * dep-graph selector: a changed dependency has no coverage-map entry,
 * so instead of failing open to broad we walk it to the workspace packages that
 * declare it → their specs (via the map). Pure — the caller supplies `importers`
 * (dir → declared runtime deps), parsed from pnpm-lock.yaml elsewhere.
 */

/** Workspace package dir → the runtime dependency names it declares. */
export type WorkspaceImporters = Record<string, string[]>;

/** Dirs declaring any of `deps`. A transitive dep (declared by none) → [], which
 *  the caller treats as "can't attribute → broad". */
export function dependentDirs(deps: string[], importers: WorkspaceImporters): string[] {
	const wanted = new Set(deps);
	const dirs: string[] = [];
	for (const [dir, declared] of Object.entries(importers)) {
		if (declared.some((name) => wanted.has(name))) dirs.push(dir);
	}
	return dirs.sort();
}
