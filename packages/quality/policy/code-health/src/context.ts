export interface CodeHealthContext {
	rootDir: string;
	/**
	 * Repo-relative paths of files changed in the current change set
	 * (typically the `changed-files` output from the `ci-filter` action).
	 * When supplied, rules that need to scope checks to "files touched in
	 * this PR" can use this set. When omitted, rules fall back to
	 * whole-tree behaviour.
	 */
	changedFiles?: string[];
	/**
	 * Repo-relative paths of files *added* in the current change set (the
	 * `added-files` output from `ci-filter`, a subset of `changedFiles`).
	 * Rules that should act only on net-new files — not files that were
	 * merely modified — use this. When omitted or empty, nothing was added,
	 * so such rules run no check.
	 */
	addedFiles?: string[];
}
