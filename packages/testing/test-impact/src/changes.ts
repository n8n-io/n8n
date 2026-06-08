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

/** A package.json change classified by which dependency sections moved. */
export type ManifestChangeKind = 'runtime' | 'devDep-only' | 'none';

type ManifestJson = Record<string, Record<string, string> | undefined>;
const RUNTIME_SECTIONS = ['dependencies', 'optionalDependencies', 'peerDependencies'] as const;

function parseManifest(raw: string): ManifestJson {
	try {
		return JSON.parse(raw) as ManifestJson;
	} catch {
		return {};
	}
}

function sectionChanged(before: ManifestJson, after: ManifestJson, section: string): boolean {
	const b = before[section] ?? {};
	const a = after[section] ?? {};
	for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
		if (b[key] !== a[key]) return true;
	}
	return false;
}

/**
 * Classify a package.json change by the dependency sections it touched:
 *  - `runtime`     — a runtime section (dependencies / optional / peer) moved, so
 *                    it can reach the bundle the E2E suite exercises.
 *  - `devDep-only` — only devDependencies moved → cannot reach the runtime bundle.
 *  - `none`        — no dependency section moved (scripts / version / engines / …).
 * Unparseable content is treated as an empty manifest.
 */
export function classifyManifestChange(before: string, after: string): ManifestChangeKind {
	const b = parseManifest(before);
	const a = parseManifest(after);
	if (RUNTIME_SECTIONS.some((s) => sectionChanged(b, a, s))) return 'runtime';
	return sectionChanged(b, a, 'devDependencies') ? 'devDep-only' : 'none';
}

const isManifest = (f: string): boolean => /(^|\/)package\.json$/.test(f);
const isLockfile = (f: string): boolean => f === 'pnpm-lock.yaml';

/**
 * Drop the lockfile + manifests from a changed-file set when the dependency
 * change is provably devDependencies-only — a devDep can't reach the runtime
 * bundle, so it must not force broad. `manifests` maps each changed package.json
 * path to its before/after content (the caller reads these from git).
 *
 * Conservative by construction — never drops without positive evidence:
 *  - any runtime-section change → keep everything (real dep change);
 *  - a changed package.json with no supplied diff → treated as runtime;
 *  - a lockfile change with no changed package.json at all (transitive bump) → kept.
 */
export function dropDevDepOnlyDeps(
	files: string[],
	manifests: Record<string, { before: string; after: string }>,
): string[] {
	const changedManifests = files.filter(isManifest);
	if (changedManifests.length === 0) return files;
	const kinds = changedManifests.map((f) =>
		manifests[f] ? classifyManifestChange(manifests[f].before, manifests[f].after) : 'runtime',
	);
	if (kinds.includes('runtime')) return files;
	if (!kinds.includes('devDep-only')) return files;
	return files.filter((f) => !isLockfile(f) && !isManifest(f));
}
