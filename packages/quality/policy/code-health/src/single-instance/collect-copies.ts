import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { CURATED_LIBS } from './libs.js';

export interface Copy {
	realPath: string;
	version: string;
}

export interface DuplicateGroup {
	name: string;
	isCurated: boolean;
	allowed: boolean;
	/** Why the duplicate is tolerated, when it is allowlisted. */
	reason?: string;
	copies: Copy[];
}

/**
 * Deliberately-tolerated duplicates (migration window). Each entry MUST document why it is
 * tolerated and what removes it; remove an entry once remediated so a regression re-fails.
 * Empty means every curated library must resolve to a single physical copy.
 *
 * Kept empty on purpose while the npm-install job is advisory. That job currently reports splits
 * in `zod`, `@langchain/core` and `form-data`, all caused by third-party version pins we cannot
 * override from a published tarball. Silencing them here is not the fix: entries are keyed by
 * library name alone, so allowlisting `zod` would also stop the check ever failing on a zod split
 * of our own making — the regression it exists to catch. Teaching the allowlist about the copies
 * an entry covers is the prerequisite for both allowlisting these and making the job blocking.
 */
export const EXPECTED_DUPLICATES: Record<string, string> = {};

/**
 * Walk `<root>/node_modules` (incl. nested installs and the pnpm `.pnpm` virtual store) and
 * return a map of packageName -> every physical copy found. A distinct realpath is a distinct
 * Node runtime module identity — the thing that breaks `instanceof`/singletons — so realpath,
 * not version or inode, is the ground truth (pnpm hardlinks from the store, so distinct copies
 * can share inodes yet stay distinct identities).
 *
 * Run against the PRUNED production closure (`compiled/`) or an `npm install` scratch tree — NOT
 * the dev `.pnpm` store, which over-reports latent peer-context entries that are never co-loaded.
 */
export function collectCopies(root: string): Map<string, Copy[]> {
	const found = new Map<string, Copy[]>();
	const walkedRealDirs = new Set<string>(); // guard against symlink cycles / re-walks
	const recordedReals = new Set<string>(); // a physical copy is read+parsed once, not per alias

	const readEntries = (dir: string) => {
		try {
			return readdirSync(dir, { withFileTypes: true });
		} catch {
			return [];
		}
	};

	const record = (dir: string) => {
		let real: string;
		try {
			real = realpathSync(dir);
		} catch {
			return; // not a real dir
		}
		if (recordedReals.has(real)) return; // same physical copy reached via another alias
		let pj: { name?: string; version?: string };
		try {
			pj = JSON.parse(readFileSync(join(real, 'package.json'), 'utf8')) as {
				name?: string;
				version?: string;
			};
		} catch {
			return; // not a real package dir (e.g. a decoy source folder)
		}
		// Key on the manifest name, not the directory: an npm rename (`"zod-v3": "npm:zod@^3"`)
		// installs a real second copy of zod under `node_modules/zod-v3`, and keying on the
		// directory would leave it out of duplicate detection entirely.
		if (!pj.name) return; // no name means it is not a package we can identify
		recordedReals.add(real);
		const copies = found.get(pj.name) ?? [];
		copies.push({ realPath: real, version: pj.version ?? '' });
		found.set(pj.name, copies);
	};

	// pnpm virtual store: each `<name>@<key>` entry holds the real package under its own node_modules.
	const walkPnpmStore = (storeDir: string) => {
		for (const entry of readEntries(storeDir)) walk(join(storeDir, entry.name, 'node_modules'));
	};

	const walk = (nmDir: string) => {
		for (const e of readEntries(nmDir)) {
			const name = e.name;
			if (name === '.bin') continue;
			const full = join(nmDir, name);
			if (name === '.pnpm') {
				walkPnpmStore(full);
			} else if (name.startsWith('.')) {
				continue;
			} else if (name.startsWith('@')) {
				for (const s of readEntries(full)) recordAndRecurse(join(full, s.name));
			} else {
				recordAndRecurse(full);
			}
		}
	};

	const recordAndRecurse = (pkgDir: string) => {
		record(pkgDir);
		const nested = join(pkgDir, 'node_modules');
		try {
			const real = realpathSync(nested);
			if (statSync(real).isDirectory() && !walkedRealDirs.has(real)) {
				walkedRealDirs.add(real);
				walk(nested);
			}
		} catch {
			/* no nested node_modules */
		}
	};

	// Absent nested `node_modules` are normal, so the walk tolerates them — but an absent root means
	// there is no closure to inspect, and staying quiet about it reports "no duplicates found" for a
	// closure that was never read. Callers treat a throw as "the check did not run".
	// Anything that is not a directory fails the same way: `readdirSync` raises, the walk tolerates
	// it, and the run reports a clean closure. `throwIfNoEntry: false` folds missing and non-directory
	// into one check.
	const rootNodeModules = join(root, 'node_modules');
	if (!statSync(rootNodeModules, { throwIfNoEntry: false })?.isDirectory()) {
		throw new Error(
			`No node_modules directory at ${rootNodeModules} — expected an installed closure, so nothing was verified.`,
		);
	}

	walk(rootNodeModules);
	return found;
}

/** Reduce collected copies to distinct physical copies (dedup by realpath). */
export function distinctCopies(copies: Copy[]): Copy[] {
	const byReal = new Map<string, Copy>();
	for (const c of copies) if (!byReal.has(c.realPath)) byReal.set(c.realPath, c);
	return [...byReal.values()];
}

/**
 * Given collected copies, return every package with >1 physical copy (`duplicates`, a discovery
 * aid) and the curated, non-allowlisted subset that must hard-fail (`failures`).
 */
export function analyze(
	found: Map<string, Copy[]>,
	{ allowlist = EXPECTED_DUPLICATES }: { allowlist?: Record<string, string> } = {},
): { duplicates: DuplicateGroup[]; failures: DuplicateGroup[] } {
	const duplicates: DuplicateGroup[] = [];
	for (const [name, copies] of found) {
		const distinct = distinctCopies(copies);
		if (distinct.length <= 1) continue;
		duplicates.push({
			name,
			isCurated: CURATED_LIBS.includes(name),
			allowed: Object.hasOwn(allowlist, name),
			reason: allowlist[name],
			copies: distinct,
		});
	}
	const failures = duplicates.filter((d) => d.isCurated && !d.allowed);
	return { duplicates, failures };
}
