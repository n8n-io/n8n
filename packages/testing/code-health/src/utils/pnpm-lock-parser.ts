import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseAllDocuments } from 'yaml';

export interface LockData {
	resolvedVersions: Map<string, Set<string>>;
	requestedRanges: Map<string, Set<string>>;
}

interface LockImporterDep {
	specifier?: string;
	version?: string;
}

interface LockImporter {
	dependencies?: Record<string, LockImporterDep>;
	devDependencies?: Record<string, LockImporterDep>;
	optionalDependencies?: Record<string, LockImporterDep>;
}

interface LockFile {
	importers?: Record<string, LockImporter>;
	packages?: Record<string, unknown>;
	snapshots?: Record<string, unknown>;
}

function parseProjectLockfile(content: string): LockFile | null {
	const document = parseAllDocuments(content).at(-1);
	if (!document) return null;
	if (document.errors.length > 0) throw document.errors[0];

	const value: unknown = document.toJS();
	return typeof value === 'object' && value !== null ? value : null;
}

export function parsePnpmLock(rootDir: string, lockFile = 'pnpm-lock.yaml'): LockData {
	const filePath = path.join(rootDir, lockFile);
	const empty: LockData = { resolvedVersions: new Map(), requestedRanges: new Map() };
	if (!fs.existsSync(filePath)) return empty;

	const content = fs.readFileSync(filePath, 'utf-8');
	const lock = parseProjectLockfile(content);
	if (!lock) return empty;

	const resolvedVersions = new Map<string, Set<string>>();
	const requestedRanges = new Map<string, Set<string>>();

	if (lock.packages && typeof lock.packages === 'object') {
		for (const rawKey of Object.keys(lock.packages)) {
			const parsed = parsePackageKey(rawKey);
			if (!parsed) continue;
			addTo(resolvedVersions, parsed.name, parsed.version);
		}
	}

	if (lock.importers && typeof lock.importers === 'object') {
		for (const importer of Object.values(lock.importers)) {
			collectRanges(importer.dependencies, requestedRanges);
			collectRanges(importer.devDependencies, requestedRanges);
			collectRanges(importer.optionalDependencies, requestedRanges);
		}
	}

	return { resolvedVersions, requestedRanges };
}

function collectRanges(
	deps: Record<string, LockImporterDep> | undefined,
	target: Map<string, Set<string>>,
): void {
	if (!deps) return;
	for (const [name, info] of Object.entries(deps)) {
		const spec = info?.specifier;
		if (typeof spec === 'string') addTo(target, name, spec);
	}
}

function addTo(map: Map<string, Set<string>>, key: string, value: string): void {
	let set = map.get(key);
	if (!set) {
		set = new Set();
		map.set(key, set);
	}
	set.add(value);
}

function parsePackageKey(key: string): { name: string; version: string } | null {
	const parenIdx = key.indexOf('(');
	const clean = parenIdx === -1 ? key : key.slice(0, parenIdx);

	if (clean.startsWith('@')) {
		const slashIdx = clean.indexOf('/');
		if (slashIdx === -1) return null;
		const atIdx = clean.indexOf('@', slashIdx);
		if (atIdx === -1) return null;
		return { name: clean.slice(0, atIdx), version: clean.slice(atIdx + 1) };
	}
	const atIdx = clean.indexOf('@');
	if (atIdx === -1) return null;
	return { name: clean.slice(0, atIdx), version: clean.slice(atIdx + 1) };
}

/** One importer's view of a direct dependency, as the lockfile records it. */
export interface ImporterDep {
	/** Range the manifest declares (`catalog:`, `1.2.3`, `workspace:*`, …). */
	specifier: string;
	/** Resolution pnpm picked, peer suffix included (`1.2.8(openai@6.46.0(…))`). */
	version: string;
}

export interface LockGraph {
	/**
	 * Full `snapshots:` keys grouped by package name. Two keys for one name means pnpm built two
	 * peer contexts, i.e. two physical copies — the thing that breaks `instanceof`.
	 */
	snapshotKeys: Map<string, string[]>;
	/** Importer path (repo-relative, `.` for the root) -> direct dep name -> how it resolved. */
	importers: Map<string, Map<string, ImporterDep>>;
}

/**
 * Parse the resolution graph: the `snapshots:` keys and each importer's direct dependencies.
 *
 * `parsePnpmLock` collapses a package to its bare versions, which is the right shape for override
 * staleness but hides peer contexts — and a peer context is exactly how the same version ends up
 * installed twice. This keeps the keys intact so a split is visible.
 */
export function parsePnpmLockGraph(rootDir: string, lockFile = 'pnpm-lock.yaml'): LockGraph {
	const filePath = path.join(rootDir, lockFile);
	const empty: LockGraph = { snapshotKeys: new Map(), importers: new Map() };
	if (!fs.existsSync(filePath)) return empty;

	const lock = parseProjectLockfile(fs.readFileSync(filePath, 'utf-8'));
	if (!lock) return empty;

	const snapshotKeys = new Map<string, string[]>();
	for (const key of Object.keys(lock.snapshots ?? {})) {
		const parsed = parsePackageKey(key);
		if (!parsed) continue;
		const keys = snapshotKeys.get(parsed.name);
		if (keys) keys.push(key);
		else snapshotKeys.set(parsed.name, [key]);
	}

	const importers = new Map<string, Map<string, ImporterDep>>();
	for (const [importerPath, importer] of Object.entries(lock.importers ?? {})) {
		const deps = new Map<string, ImporterDep>();
		for (const section of [
			importer.dependencies,
			importer.devDependencies,
			importer.optionalDependencies,
		]) {
			for (const [name, info] of Object.entries(section ?? {})) {
				if (typeof info?.specifier !== 'string' || typeof info?.version !== 'string') continue;
				deps.set(name, { specifier: info.specifier, version: info.version });
			}
		}
		importers.set(importerPath, deps);
	}

	return { snapshotKeys, importers };
}
