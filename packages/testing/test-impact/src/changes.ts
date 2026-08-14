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
 * handled by the devDep classifier / dep-graph selector), `patches/**`
 * (edits a dependency's code = a dependency change), and `tsconfig*.json`
 * (can carry module-resolution keys — see {@link tsconfigForcesBroad}).
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
	// Named build / lint / test-runner config (NOT all json/yaml). `tsconfig*` is
	// deliberately absent — it's routed through tsconfigForcesBroad instead.
	(f) =>
		/(^|\/)(turbo\.json|biome\.jsonc?|vitest\.config\.[cm]?[jt]s|\.eslintrc[\w.]*|\.prettierrc[\w.]*)$/.test(
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

/**
 * Paths that define the runtime the WHOLE E2E suite executes in — the container
 * image and the container harness. The coverage map can't attribute these (a
 * change here can reach any spec), so they force a broad run rather than being
 * declared uncovered. This is a small, low-churn set, so broad is cheap here.
 *
 * Credential definitions belong here for a different reason: they're declarative
 * metadata loaded into the registry once at boot, so no code in them re-executes
 * attributably to a spec and the runtime coverage map never records them. Absent
 * from the map, a credential change would be declared uncovered and skip its
 * covering specs, so we force broad instead.
 */
const FORCES_BROAD: Array<(f: string) => boolean> = [
	(f) => f.startsWith('docker/'),
	(f) => /(^|\/)Dockerfile(\.|$)|\.Dockerfile$/.test(f),
	(f) => f.startsWith('packages/testing/containers/'),
	(f) => f.startsWith('packages/nodes-base/credentials/'),
];

/** True if a changed file defines the E2E runtime → the whole suite must run. */
export function forcesBroad(file: string): boolean {
	return FORCES_BROAD.some((matches) => matches(file));
}

/** A package.json change classified by which dependency sections moved. */
export type ManifestChangeKind = 'runtime' | 'devDep-only' | 'override' | 'none';

type ManifestJson = Record<string, Record<string, string> | undefined>;
/** package.json sections whose changes can reach the runtime bundle. */
export const RUNTIME_SECTIONS = [
	'dependencies',
	'optionalDependencies',
	'peerDependencies',
] as const;

function parseManifest(raw: string): ManifestJson {
	try {
		return JSON.parse(raw) as ManifestJson;
	} catch {
		return {};
	}
}

/** Dependency names added / removed / version-changed in one manifest section. */
function changedKeysInSection(
	before: ManifestJson,
	after: ManifestJson,
	section: string,
): string[] {
	const b = before[section] ?? {};
	const a = after[section] ?? {};
	const changed: string[] = [];
	for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
		if (b[key] !== a[key]) changed.push(key);
	}
	return changed;
}

function sectionChanged(before: ManifestJson, after: ManifestJson, section: string): boolean {
	return changedKeysInSection(before, after, section).length > 0;
}

/** `pnpm.overrides` selectors changed between two manifests, as written. */
function changedOverrideSelectors(before: ManifestJson, after: ManifestJson): string[] {
	const b = (before.pnpm as { overrides?: Record<string, string> } | undefined)?.overrides ?? {};
	const a = (after.pnpm as { overrides?: Record<string, string> } | undefined)?.overrides ?? {};
	const changed: string[] = [];
	for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
		if (b[key] !== a[key]) changed.push(key);
	}
	return changed;
}

const NPM_PACKAGE_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

/**
 * The package an override selector pins (`node-gyp>undici` → `undici`,
 * `@vitest/browser@<4.1.10` → `@vitest/browser`), or `null` when the selector
 * can't be parsed with confidence — callers must then stay broad.
 */
export function overrideTargetName(selector: string): string | null {
	// A range `>` (`pkg@>2`, `pkg@1||>2`) follows `@` or `|`, touches whitespace,
	// or is `>=` — never a parent>child separator.
	let child = selector;
	for (let i = selector.length - 1; i > 0; i--) {
		if (selector[i] !== '>') continue;
		const prev = selector[i - 1];
		const next = selector[i + 1] ?? '';
		if (
			prev === '@' ||
			prev === '|' ||
			prev === '=' ||
			next === '=' ||
			/\s/.test(prev) ||
			/\s/.test(next)
		) {
			continue;
		}
		child = selector.slice(i + 1);
		break;
	}
	child = child.trim();
	// `> 0` keeps a leading scope `@` intact when stripping the version range.
	const at = child.lastIndexOf('@');
	const name = at > 0 ? child.slice(0, at) : child;
	return NPM_PACKAGE_NAME.test(name) ? name : null;
}

/**
 * Packages whose `pnpm.overrides` pin was added, removed or changed. `null`
 * when any changed selector fails to parse — the diff can't be attributed.
 */
export function changedOverrideTargets(before: string, after: string): string[] | null {
	const selectors = changedOverrideSelectors(parseManifest(before), parseManifest(after));
	const names = new Set<string>();
	for (const selector of selectors) {
		const name = overrideTargetName(selector);
		if (name === null) return null;
		names.add(name);
	}
	return [...names];
}

/**
 * Classify a package.json change by the dependency sections it touched:
 *  - `runtime`     — a runtime section (dependencies / optional / peer) moved, so
 *                    it can reach the bundle the E2E suite exercises.
 *  - `override`    — a `pnpm.overrides` pin moved; whether it reaches the
 *                    runtime bundle takes a closure check (see {@link dropDevDepOnlyDeps}).
 *  - `devDep-only` — only devDependencies moved → cannot reach the runtime bundle.
 *  - `none`        — no dependency section moved (scripts / version / engines / …).
 * Unparseable content is treated as an empty manifest. Checked most-impactful
 * first: a mixed devDep+override change classifies as `override`.
 */
export function classifyManifestChange(before: string, after: string): ManifestChangeKind {
	const b = parseManifest(before);
	const a = parseManifest(after);
	if (RUNTIME_SECTIONS.some((s) => sectionChanged(b, a, s))) return 'runtime';
	if (changedOverrideSelectors(b, a).length > 0) return 'override';
	return sectionChanged(b, a, 'devDependencies') ? 'devDep-only' : 'none';
}

/**
 * Names of the *runtime* dependencies (dependencies / optional / peer) that
 * changed between two manifests — the input to the dep-graph selector,
 * which walks each name to the workspace packages that declare it. devDeps are
 * excluded (they can't reach the runtime bundle).
 */
export function changedRuntimeDeps(before: string, after: string): string[] {
	const b = parseManifest(before);
	const a = parseManifest(after);
	const names = new Set<string>();
	for (const section of RUNTIME_SECTIONS) {
		for (const name of changedKeysInSection(b, a, section)) names.add(name);
	}
	return [...names];
}

/** {@link changedRuntimeDeps} unioned across every changed manifest. */
export function changedRuntimeDepsFromManifests(
	manifests: Record<string, { before: string; after: string }>,
): string[] {
	const names = new Set<string>();
	for (const { before, after } of Object.values(manifests)) {
		for (const name of changedRuntimeDeps(before, after)) names.add(name);
	}
	return [...names];
}

const isManifest = (f: string): boolean => /(^|\/)package\.json$/.test(f);
const isLockfile = (f: string): boolean => f === 'pnpm-lock.yaml';

export const isTsconfig = (f: string): boolean => /(^|\/)tsconfig([.\w-]*)\.json$/.test(f);

/** compilerOptions keys that change which module a bare import resolves to. */
const TSCONFIG_RESOLUTION_KEYS = [
	'paths',
	'baseUrl',
	'moduleResolution',
	'customConditions',
] as const;

/** Tolerant parse for tsconfig (allows comments + trailing commas). Null when
 *  unparseable, which the caller treats as "force broad". */
function parseTsconfig(raw: string): Record<string, unknown> | null {
	if (!raw.trim()) return null;
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		try {
			const stripped = raw
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/(^|[^:])\/\/.*$/gm, '$1')
				.replace(/,(\s*[}\]])/g, '$1');
			return JSON.parse(stripped) as Record<string, unknown>;
		} catch {
			return null;
		}
	}
}

/**
 * True when a tsconfig change touches a resolution key (`paths`/`baseUrl`/
 * `moduleResolution`/`customConditions`/`extends`), which re-points imports for
 * every spec and can't be attributed in the coverage map → force the full
 * suite. A type-check-only edit (`strict`, `target`, …) resolves to the same
 * modules and is non-impactful.
 */
export function tsconfigForcesBroad(before: string, after: string): boolean {
	const b = parseTsconfig(before);
	const a = parseTsconfig(after);
	if (!b || !a) return true;
	if (JSON.stringify(b.extends) !== JSON.stringify(a.extends)) return true;
	const bco = (b.compilerOptions ?? {}) as Record<string, unknown>;
	const aco = (a.compilerOptions ?? {}) as Record<string, unknown>;
	return TSCONFIG_RESOLUTION_KEYS.some((k) => JSON.stringify(bco[k]) !== JSON.stringify(aco[k]));
}

/** Remove the lockfile + every package.json from a changed-file set. */
export function stripDependencyFiles(files: string[]): string[] {
	return files.filter((f) => !isLockfile(f) && !isManifest(f));
}

/**
 * Drop the lockfile + manifests from a changed-file set when the dependency
 * change is provably devDependencies-only — a devDep can't reach the runtime
 * bundle, so it must not force broad. `manifests` maps each changed package.json
 * path to its before/after content (the caller reads these from git).
 *
 * An override pins a TRANSITIVE package, which no declared section mentions —
 * `fast-uri` (reaches runtime via `ajv`) and `@vitest/browser` (dev-only) look
 * identical there. Only `runtimeClosure` membership can tell them apart.
 *
 * Conservative by construction — never drops without positive evidence:
 *  - any runtime-section change → keep everything (real dep change);
 *  - a changed package.json with no supplied diff → treated as runtime;
 *  - a lockfile change with no changed package.json at all (transitive bump) → kept;
 *  - an override change with a missing/empty closure, an unparseable selector,
 *    or any target inside the closure → kept.
 */
export function dropDevDepOnlyDeps(
	files: string[],
	manifests: Record<string, { before: string; after: string }>,
	runtimeClosure?: ReadonlySet<string>,
): string[] {
	const changedManifests = files.filter(isManifest);
	if (changedManifests.length === 0) return files;
	const kinds = changedManifests.map((f) =>
		manifests[f] ? classifyManifestChange(manifests[f].before, manifests[f].after) : 'runtime',
	);
	if (kinds.includes('runtime')) return files;

	if (kinds.includes('override')) {
		// An empty closure is a broken walk, not proof nothing reaches runtime.
		if (!runtimeClosure || runtimeClosure.size === 0) return files;
		const targets = new Set<string>();
		for (const f of changedManifests) {
			if (!manifests[f]) continue;
			const names = changedOverrideTargets(manifests[f].before, manifests[f].after);
			if (names === null) return files;
			for (const name of names) targets.add(name);
		}
		if (targets.size === 0 || [...targets].some((t) => runtimeClosure.has(t))) return files;
		return stripDependencyFiles(files);
	}

	if (!kinds.includes('devDep-only')) return files;
	return stripDependencyFiles(files);
}
