import type { Copy } from './collect-copies.js';

/** One `packages` entry of an npm lockfile. The lockfile keys these by install path. */
interface LockEntry {
	name?: string;
	version?: string;
	link?: boolean;
	os?: string[];
	cpu?: string[];
}

interface Lockfile {
	lockfileVersion?: number;
	packages?: Record<string, LockEntry>;
}

const NODE_MODULES = 'node_modules/';

/** npm's `os` / `cpu` matching: a bare value allows, a `!`-prefixed value forbids. */
function matches(list: string[] | undefined, actual: string): boolean {
	if (!list || list.length === 0) return true;
	if (list.some((value) => value.startsWith('!') && value.slice(1) === actual)) return false;
	const allowed = list.filter((value) => !value.startsWith('!'));
	return allowed.length === 0 || allowed.includes(actual);
}

/**
 * True when npm would place this entry on the machine running the check.
 *
 * A lockfile lists every platform's build of an optional native dependency, but an install only
 * unpacks the one that matches. Counting them all invents copies that never coexist in a process.
 */
function installsHere(entry: LockEntry): boolean {
	return matches(entry.os, process.platform) && matches(entry.cpu, process.arch);
}

/**
 * Read an npm lockfile as the copy map `analyze()` expects.
 *
 * The keys of `packages` are the paths npm materializes, so one key is one physical copy — the same
 * ground truth `collectCopies` reads off disk, without downloading anything.
 */
export function copiesFromLockfile(contents: string): Map<string, Copy[]> {
	let lock: Lockfile;
	try {
		lock = JSON.parse(contents) as Lockfile;
	} catch {
		throw new Error('Could not parse the npm lockfile, so nothing was verified.');
	}
	const packages = lock.packages ?? {};
	// A v1 lockfile has no `packages` map at all, and an empty one means npm resolved no tree.
	// Callers treat a throw as "the check did not run", not as "no duplicates found".
	if (Object.keys(packages).length === 0) {
		throw new Error(
			`Unusable npm lockfile (version ${lock.lockfileVersion ?? 'unknown'}), so nothing was verified.`,
		);
	}

	const found = new Map<string, Copy[]>();
	for (const [path, entry] of Object.entries(packages)) {
		if (path === '') continue; // the scratch project itself
		if (entry.link) continue; // a symlink; whatever it points at has its own entry
		if (!installsHere(entry)) continue;
		const index = path.lastIndexOf(NODE_MODULES);
		if (index === -1) continue; // a workspace project, not an installed copy
		// Key on the manifest name rather than the directory: npm records `name` when the two differ,
		// which is what keeps an alias (`"zod-v3": "npm:zod@^3"`) a copy of zod.
		const name = entry.name ?? path.slice(index + NODE_MODULES.length);
		const copies = found.get(name) ?? [];
		copies.push({ realPath: path, version: entry.version ?? '' });
		found.set(name, copies);
	}
	return found;
}
