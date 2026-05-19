import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

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
}

export function parsePnpmLock(rootDir: string, lockFile = 'pnpm-lock.yaml'): LockData {
	const filePath = path.join(rootDir, lockFile);
	const empty: LockData = { resolvedVersions: new Map(), requestedRanges: new Map() };
	if (!fs.existsSync(filePath)) return empty;

	const content = fs.readFileSync(filePath, 'utf-8');
	const lock = parseYaml(content) as LockFile | null;
	if (!lock || typeof lock !== 'object') return empty;

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
