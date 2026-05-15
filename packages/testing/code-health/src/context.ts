export interface CodeHealthContext {
	rootDir: string;
	/**
	 * Repo-relative paths of files newly added in the current change set
	 * (typically computed by CI from `git diff --diff-filter=A`). When
	 * supplied, rules that distinguish "new" from "historical" content can
	 * scope their checks to just these paths. When omitted, rules fall back
	 * to whole-tree behaviour.
	 */
	addedFiles?: string[];
}
