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
}
