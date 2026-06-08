/**
 * Classify changed files for impact selection.
 *
 * Some changed paths cannot affect the runtime the E2E suite exercises — repo
 * tooling, docs, editor config. Left in the changed-set they have no map entry,
 * so they hit the unmapped → broad fallback and drag an otherwise-scoped PR to
 * the full suite. Dropping them before selection is a pure win: they can't run
 * a real test regardless, so we only ever decline to run things that can't run.
 *
 * SURGICAL by design: only *named* config files are ignored — never all
 * `*.json` / `*.yaml`, because node descriptions, i18n catalogues and test
 * fixtures are real source data the map legitimately keys on.
 *
 * NOT ignored (deliberately): `docker`/Dockerfiles (define the container the
 * E2E suite runs in), `pnpm-lock.yaml`/`package.json` (dependency changes —
 * handled by the devDep classifier / dep-graph selector), and `patches/**`
 * (edits a dependency's code = a dependency change).
 */

const NON_IMPACTFUL: Array<(f: string) => boolean> = [
	// Agent / editor / repo tooling
	(f) => f.startsWith('.claude/'),
	(f) => /^\.(vscode|idea)\//.test(f),
	(f) =>
		/(^|\/)\.(editorconfig|gitattributes|gitignore|npmrc|nvmrc|prettierignore|eslintignore)$/.test(
			f,
		),
	// Docs + dictionaries + doc assets
	(f) => /\.mdx?$/.test(f) || /(^|\/)(LICENSE|CHANGELOG\.md)$/.test(f),
	(f) => /cspell|\.dic$/i.test(f),
	(f) => /^(docs|assets)\/.*\.(png|jpe?g|gif|svg|webp)$/.test(f),
	// Repo automation scripts (not shipped, not exercised by E2E)
	(f) => f.startsWith('scripts/'),
	// Named build / lint / test-runner config (NOT all json/yaml)
	(f) =>
		/(^|\/)(turbo\.json|tsconfig([.\w-]*)\.json|biome\.jsonc?|jest\.config\.[cm]?[jt]s|\.eslintrc[\w.]*|\.prettierrc[\w.]*)$/.test(
			f,
		),
];

/** True if a changed file cannot affect the runtime the E2E suite exercises. */
export function isNonImpactful(file: string): boolean {
	return NON_IMPACTFUL.some((matches) => matches(file));
}

/**
 * Drop non-impactful paths from a changed-file set so they don't force a broad
 * selection. Apply this once, at the entry, before any selector sees the files.
 */
export function filterImpactfulChanges(files: string[]): string[] {
	return files.filter((file) => !isNonImpactful(file));
}
