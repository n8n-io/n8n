/**
 * Lockfile impact: which workspace packages a pnpm-lock.yaml change can affect.
 *
 * A lockfile change has no coverage-map entry and no import that a test runner
 * can follow, so callers used to run everything for it. Most lockfile changes
 * move a few resolved packages. This module compares the resolved dependency
 * closure of each workspace package (an `importer`) in the two lockfiles, and
 * reports the packages whose closure changed.
 *
 * Pure: the caller parses both lockfiles. Returns null when the change cannot be
 * attributed to packages (another document, `settings` or `lockfileVersion`
 * changed, or a lockfile has no `importers`), so the caller stays broad.
 */

import { snapshotKeyToName, type LockfileImporters, type LockfileSnapshots } from './dep-graph.js';

/** The main document of a pnpm-lock.yaml (the last one). */
export interface Lockfile {
	importers?: LockfileImporters;
	packages?: Record<string, unknown>;
	snapshots?: LockfileSnapshots;
	[section: string]: unknown;
}

export interface LockfileImpactOptions {
	/** Dependency sections followed from the package itself. Unit tests use every
	 *  section, because a package's tests load its devDependencies. */
	ownSections: readonly string[];
	/** Sections followed from a linked workspace package. Only its runtime
	 *  sections reach a consumer. */
	linkedSections: readonly string[];
}

/** Top-level sections of the main document that pnpm derives the resolutions
 *  from. Their effect shows in `importers`, `packages` and `snapshots`. */
const DERIVED_SECTIONS = new Set([
	'importers',
	'packages',
	'snapshots',
	'catalogs',
	'overrides',
	'patchedDependencies',
]);

const LINK_PREFIX = 'link:';

type Entry = { specifier?: string; version?: string } | string;

const versionOf = (entry: Entry): string =>
	typeof entry === 'string' ? entry : (entry?.version ?? '');

/** Snapshot key of a dependency. An alias value (`string-width@4.2.3`) is the key itself. */
function snapshotKey(name: string, version: string): string {
	return snapshotKeyToName(version) === version.replace(/\(.*$/, '')
		? `${name}@${version}`
		: version;
}

/** Resolve a `link:../foo` target, relative to the declaring package's dir. */
function resolveLink(fromDir: string, target: string): string {
	const out: string[] = [];
	for (const segment of `${fromDir}/${target}`.split('/')) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') out.pop();
		else out.push(segment);
	}
	return out.join('/');
}

/** Every snapshot key that `dir` reaches, through its own and its linked packages' sections. */
function closure(lock: Lockfile, dir: string, opts: LockfileImpactOptions): Set<string> {
	const keys = new Set<string>();
	const seenDirs = new Set<string>();
	const keyQueue: string[] = [];
	const dirQueue: Array<{ dir: string; sections: readonly string[] }> = [
		{ dir, sections: opts.ownSections },
	];
	while (dirQueue.length > 0) {
		const next = dirQueue.pop();
		if (!next || seenDirs.has(next.dir)) continue;
		seenDirs.add(next.dir);
		const importer = lock.importers?.[next.dir];
		for (const section of next.sections) {
			for (const [name, entry] of Object.entries(importer?.[section] ?? {})) {
				const version = versionOf(entry);
				if (version.startsWith(LINK_PREFIX)) {
					const linked = resolveLink(next.dir, version.slice(LINK_PREFIX.length));
					dirQueue.push({ dir: linked, sections: opts.linkedSections });
				} else {
					keyQueue.push(snapshotKey(name, version));
				}
			}
		}
	}
	while (keyQueue.length > 0) {
		const key = keyQueue.pop();
		if (key === undefined || keys.has(key)) continue;
		keys.add(key);
		const snapshot = lock.snapshots?.[key];
		for (const section of ['dependencies', 'optionalDependencies']) {
			for (const [name, version] of Object.entries(snapshot?.[section] ?? {})) {
				keyQueue.push(snapshotKey(name, version));
			}
		}
	}
	return keys;
}

/** Everything pnpm records about one resolved key: its snapshot and its package entry. */
function keyContent(lock: Lockfile, key: string): string {
	const packageKey = key.replace(/\(.*$/, '');
	return JSON.stringify([lock.snapshots?.[key] ?? null, lock.packages?.[packageKey] ?? null]);
}

function sameJson(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

const isLockfile = (value: unknown): value is Lockfile =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Resolved keys whose snapshot or package entry differs between the lockfiles. */
function changedKeys(b: Lockfile, a: Lockfile): Set<string> {
	const keys = new Set([...Object.keys(b.snapshots ?? {}), ...Object.keys(a.snapshots ?? {})]);
	return new Set([...keys].filter((key) => keyContent(b, key) !== keyContent(a, key)));
}

/**
 * Workspace package dirs whose resolved dependency closure differs between the
 * two lockfiles. `before` and `after` are every document of each file, in order;
 * the last one is the main document.
 */
export function lockfileImpact(
	before: unknown[],
	after: unknown[],
	opts: LockfileImpactOptions,
): string[] | null {
	if (before.length !== after.length || before.length === 0) return null;
	// Earlier documents pin pnpm itself: a change there can change any install.
	if (!sameJson(before.slice(0, -1), after.slice(0, -1))) return null;
	const b = before.at(-1);
	const a = after.at(-1);
	if (!isLockfile(b) || !isLockfile(a) || !b.importers || !a.importers) return null;
	for (const section of new Set([...Object.keys(b), ...Object.keys(a)])) {
		if (!DERIVED_SECTIONS.has(section) && !sameJson(b[section], a[section])) return null;
	}

	const changed = changedKeys(b, a);
	const impacted: string[] = [];
	for (const dir of new Set([...Object.keys(b.importers), ...Object.keys(a.importers)])) {
		const keysBefore = closure(b, dir, opts);
		const keysAfter = closure(a, dir, opts);
		const differs =
			keysBefore.size !== keysAfter.size ||
			[...keysAfter].some((key) => !keysBefore.has(key) || changed.has(key));
		if (differs) impacted.push(dir);
	}
	return impacted.sort();
}
