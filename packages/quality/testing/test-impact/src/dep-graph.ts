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

/**
 * pnpm-lock.yaml `snapshots`: resolved-package key → its dependency sections.
 * Keys carry a version and, for peer-resolved packages, a suffix — e.g.
 * `ajv@8.18.0`, `@vitest/coverage-v8@4.1.9(vitest@4.1.9)`.
 */
export type LockfileSnapshots = Record<
	string,
	Record<string, Record<string, string> | undefined> | undefined
>;

/**
 * Package name from a snapshot key. The peer suffix must be stripped BEFORE
 * looking for the version separator, because it contains `@` of its own —
 * otherwise `@vitest/coverage-v8@4.1.9(vitest@4.1.9)` resolves to the wrong
 * name, the variant is never visited, and the closure silently under-includes.
 */
export function snapshotKeyToName(key: string): string {
	const base = key.replace(/\(.*$/, '');
	const at = base.lastIndexOf('@');
	return at > 0 ? base.slice(0, at) : base;
}

/**
 * Real package behind an aliased dependency value (`string-width@4.2.3`), or
 * null for a plain version. Aliases resolve under the REAL package's snapshot
 * key, so a walk following only the alias name never visits them.
 */
function aliasedDepName(value: string): string | null {
	const name = snapshotKeyToName(value);
	return name === value.replace(/\(.*$/, '') ? null : name;
}

/** A dependency entry in pnpm-lock.yaml's `importers`. */
type ImporterEntry = { specifier?: string; version?: string } | string;
/** pnpm-lock.yaml `importers`: workspace dir → dependency sections. */
export type LockfileImporters = Record<
	string,
	Record<string, Record<string, ImporterEntry> | undefined> | undefined
>;

const LINK_PREFIX = 'link:';

/** The `link:` target of a workspace dependency entry, or undefined if external. */
function workspaceLinkTarget(entry: ImporterEntry): string | undefined {
	const candidates =
		typeof entry === 'string' ? [entry] : [entry?.specifier ?? '', entry?.version ?? ''];
	const link = candidates.find((v) => v.startsWith(LINK_PREFIX));
	return link?.slice(LINK_PREFIX.length);
}

/** Resolve a `link:../foo` target, relative to the declaring package's dir. */
function resolveLink(fromDir: string, target: string): string {
	const segments = `${fromDir}/${target}`.split('/');
	const out: string[] = [];
	for (const segment of segments) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') out.pop();
		else out.push(segment);
	}
	return out.join('/');
}

/**
 * External dependency names the *deployed* workspace packages declare, following
 * workspace `link:` edges through RUNTIME sections only. Runtime-only edges keep
 * dev-only workspace packages out: `@n8n/backend-test-utils` declares `vitest`
 * in `dependencies` but is itself reachable only via `devDependencies`.
 */
function deployedExternalDeps(
	importers: LockfileImporters,
	deployRoots: readonly string[],
	runtimeSections: readonly string[],
): Set<string> {
	const visited = new Set<string>();
	const external = new Set<string>();
	const queue = [...deployRoots];
	while (queue.length > 0) {
		const dir = queue.pop();
		if (dir === undefined || visited.has(dir)) continue;
		visited.add(dir);
		const sections = importers[dir];
		if (!sections) continue;
		for (const section of runtimeSections) {
			for (const [name, entry] of Object.entries(sections[section] ?? {})) {
				const link = workspaceLinkTarget(entry);
				if (link !== undefined) {
					queue.push(resolveLink(dir, link));
					continue;
				}
				external.add(name);
				const version = typeof entry === 'string' ? entry : (entry?.version ?? '');
				const real = aliasedDepName(version);
				if (real !== null) external.add(real);
			}
		}
	}
	return external;
}

/**
 * Every package name transitively reachable from the deploy roots' runtime
 * dependencies — a name OUTSIDE this set cannot reach the bundle E2E exercises.
 * Errs toward including: over-inclusion costs a missed optimisation,
 * under-inclusion would skip tests for a live runtime change.
 */
export function runtimeClosure(
	importers: LockfileImporters,
	snapshots: LockfileSnapshots,
	opts: { deployRoots: readonly string[]; runtimeSections: readonly string[] },
): Set<string> {
	const { deployRoots, runtimeSections } = opts;
	const variantsByName = new Map<string, string[]>();
	for (const key of Object.keys(snapshots)) {
		const name = snapshotKeyToName(key);
		const existing = variantsByName.get(name);
		if (existing) existing.push(key);
		else variantsByName.set(name, [key]);
	}

	const closure = new Set<string>();
	const queue = [...deployedExternalDeps(importers, deployRoots, runtimeSections)];
	while (queue.length > 0) {
		const name = queue.pop();
		if (name === undefined || closure.has(name)) continue;
		closure.add(name);
		for (const key of variantsByName.get(name) ?? []) {
			for (const section of runtimeSections) {
				for (const [dep, version] of Object.entries(snapshots[key]?.[section] ?? {})) {
					if (!closure.has(dep)) queue.push(dep);
					const real = aliasedDepName(version);
					if (real !== null && !closure.has(real)) queue.push(real);
				}
			}
		}
	}
	return closure;
}
