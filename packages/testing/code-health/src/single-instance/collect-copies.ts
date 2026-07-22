import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { CURATED_LIBS } from './libs.js';

export interface Copy {
	realPath: string;
	version: string;
	foundAt: string;
}

export interface DuplicateGroup {
	name: string;
	isCurated: boolean;
	allowed: boolean;
	copies: Copy[];
}

/**
 * Deliberately-tolerated duplicates (migration window). Each entry MUST document why it is
 * tolerated and what removes it; remove an entry once remediated so a regression re-fails.
 * Empty means every curated library must resolve to a single physical copy.
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

	const readEntries = (dir: string) => {
		try {
			return readdirSync(dir, { withFileTypes: true });
		} catch {
			return [];
		}
	};

	const record = (name: string, dir: string) => {
		let real: string;
		let pj: { name?: string; version?: string };
		try {
			real = realpathSync(dir);
			pj = JSON.parse(readFileSync(join(real, 'package.json'), 'utf8')) as {
				name?: string;
				version?: string;
			};
		} catch {
			return; // not a real package dir (e.g. a decoy source folder)
		}
		if (pj.name !== name) return; // guard against name/dir mismatch
		const copies = found.get(name) ?? [];
		copies.push({ realPath: real, version: pj.version ?? '', foundAt: dir });
		found.set(name, copies);
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
				for (const s of readEntries(full))
					recordAndRecurse(`${name}/${s.name}`, join(full, s.name));
			} else {
				recordAndRecurse(name, full);
			}
		}
	};

	const recordAndRecurse = (pkgName: string, pkgDir: string) => {
		record(pkgName, pkgDir);
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

	walk(join(root, 'node_modules'));
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
			copies: distinct,
		});
	}
	const failures = duplicates.filter((d) => d.isCurated && !d.allowed);
	return { duplicates, failures };
}

/**
 * Verify a built closure at `dir`: print the curated verdict + report-only duplicates and return
 * an exit code (1 if a curated library resolves to multiple un-allowlisted physical copies).
 */
export function runVerifyClosure(dir: string): number {
	const found = collectCopies(dir);
	const { duplicates, failures } = analyze(found);

	console.log(`\nSingle-instance dependency verifier — root: ${dir}`);
	const curatedDups = new Map(duplicates.filter((d) => d.isCurated).map((d) => [d.name, d]));
	console.log('\nCurated single-instance libraries (enforced):');
	for (const lib of CURATED_LIBS) {
		const dup = curatedDups.get(lib);
		if (!dup) {
			const copies = found.has(lib) ? distinctCopies(found.get(lib) ?? []) : [];
			console.log(
				`  ${lib}: ${copies.length === 0 ? 'not present' : `OK (1 copy, v${copies[0].version})`}`,
			);
			continue;
		}
		console.log(
			`  ${lib}: ${dup.allowed ? 'ALLOWED DUP' : 'FAIL'} — ${dup.copies.length} physical copies:`,
		);
		for (const c of dup.copies) console.log(`      v${c.version}  ${c.realPath}`);
		if (dup.allowed) console.log(`      allowlisted: ${EXPECTED_DUPLICATES[lib]}`);
	}

	const otherDups = duplicates.filter((d) => !d.isCurated);
	if (otherDups.length > 0) {
		console.log(`\nOther duplicated packages (report-only, NOT enforced — ${otherDups.length}):`);
		for (const d of otherDups) {
			console.log(
				`  ${d.name}: ${d.copies.length} copies (${d.copies.map((c) => `v${c.version}`).join(', ')})`,
			);
		}
	}

	console.log('');
	if (failures.length > 0) {
		console.error(
			`FAIL: curated ${failures.length === 1 ? 'library resolves' : 'libraries resolve'} to multiple physical copies: ${failures.map((f) => f.name).join(', ')}`,
		);
		return 1;
	}
	console.log('OK: no un-allowlisted curated duplicates.');
	return 0;
}
