#!/usr/bin/env node

/**
 * Closure verifier for single-instance-sensitive libraries.
 *
 * Given an install root, walks its whole `node_modules` closure (nested installs
 * and the pnpm `.pnpm` virtual store), resolves every package dir to its realpath
 * and dedups by realpath. A distinct realpath is a distinct Node runtime module
 * identity — the exact thing that breaks `instanceof`/singletons — so realpath,
 * not version or inode, is the ground truth (pnpm hardlinks from the store, so
 * distinct copies can share inodes yet stay distinct identities).
 *
 * It reports EVERY package that resolves to more than one physical copy (a
 * discovery aid to surface the next single-instance-sensitive lib), and hard-fails
 * only on curated libraries — minus an expected-duplicates allowlist for a
 * deliberate, documented migration window.
 *
 * Run against the PRUNED production closure (`compiled/`) or an `npm install`
 * scratch tree — NOT the dev `.pnpm` store, which over-reports latent
 * peer-context entries that are never co-loaded.
 *
 *   node scripts/verify-single-instance-deps.mjs <installRoot> [--strict] [--json]
 *
 * `--strict` ignores the allowlist (fail on any curated duplicate); `--json`
 * prints a machine-readable report instead of the human summary.
 */

import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CURATED_LIBS } from './single-instance-libs.mjs';

/**
 * Deliberately-tolerated duplicates (migration window). Each entry MUST document
 * why it is tolerated and what removes it. Remove an entry once the duplicate is
 * remediated so a regression re-fails.
 */
export const EXPECTED_DUPLICATES = {
	'@langchain/core':
		'Live pnpm peer-context instancing via langsmith optional OpenTelemetry peers. ' +
		'Cannot be fixed at the manifest layer; pending host-level dedupe/override remediation.',
};

/**
 * Walk `<root>/node_modules` (incl. nested and the pnpm `.pnpm` store) and return
 * a Map: packageName -> array of { realPath, version, foundAt }.
 */
export function collectCopies(root) {
	const found = new Map();
	const walkedRealDirs = new Set(); // guard against symlink cycles / re-walks

	const record = (name, dir) => {
		let real;
		let pj;
		try {
			real = realpathSync(dir);
			pj = JSON.parse(readFileSync(join(real, 'package.json'), 'utf8'));
		} catch {
			return; // not a real package dir (e.g. a decoy source folder)
		}
		if (pj.name !== name) return; // guard against name/dir mismatch
		if (!found.has(name)) found.set(name, []);
		found.get(name).push({ realPath: real, version: pj.version, foundAt: dir });
	};

	const walk = (nmDir) => {
		let entries;
		try {
			entries = readdirSync(nmDir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			const name = e.name;
			if (name === '.bin') continue;
			const full = join(nmDir, name);
			if (name === '.pnpm') {
				// pnpm virtual store: each entry has its own node_modules with the real pkg
				let stores;
				try {
					stores = readdirSync(full, { withFileTypes: true });
				} catch {
					continue;
				}
				for (const s of stores) walk(join(full, s.name, 'node_modules'));
			} else if (name.startsWith('.')) {
				continue;
			} else if (name.startsWith('@')) {
				let scoped;
				try {
					scoped = readdirSync(full, { withFileTypes: true });
				} catch {
					continue;
				}
				for (const s of scoped) recordAndRecurse(`${name}/${s.name}`, join(full, s.name));
			} else {
				recordAndRecurse(name, full);
			}
		}
	};

	const recordAndRecurse = (pkgName, pkgDir) => {
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
function distinctCopies(copies) {
	const byReal = new Map();
	for (const c of copies) if (!byReal.has(c.realPath)) byReal.set(c.realPath, c);
	return [...byReal.values()];
}

/**
 * Pure core: given collected copies, return { duplicates, failures }.
 * `duplicates` = every package with >1 physical copy (report). `failures` = the
 * curated subset that is not allowlisted (hard-fail).
 */
export function analyze(found, { strict = false } = {}) {
	const duplicates = [];
	for (const [name, copies] of found) {
		const distinct = distinctCopies(copies);
		if (distinct.length <= 1) continue;
		const isCurated = CURATED_LIBS.includes(name);
		const allowed = !strict && Object.hasOwn(EXPECTED_DUPLICATES, name);
		duplicates.push({ name, isCurated, allowed, copies: distinct });
	}
	const failures = duplicates.filter((d) => d.isCurated && !d.allowed);
	return { duplicates, failures };
}

function main() {
	const args = process.argv.slice(2);
	const strict = args.includes('--strict');
	const asJson = args.includes('--json');
	const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();

	const found = collectCopies(root);
	const { duplicates, failures } = analyze(found, { strict });

	if (asJson) {
		console.log(JSON.stringify({ root, strict, duplicates, failures }, null, 2));
		process.exit(failures.length > 0 ? 1 : 0);
	}

	console.log(`\nSingle-instance dependency verifier — root: ${root}${strict ? ' (strict)' : ''}\n`);

	for (const lib of CURATED_LIBS) {
		const copies = found.has(lib) ? distinctCopies(found.get(lib)) : [];
		if (copies.length === 0) console.log(`  ${lib}: not present`);
		else if (copies.length === 1) console.log(`  ${lib}: OK (1 copy, v${copies[0].version})`);
	}

	for (const d of duplicates) {
		const tag = d.isCurated ? (d.allowed ? 'ALLOWED DUP' : 'FAIL') : 'dup (report)';
		console.log(`\n  ${d.name}: ${tag} — ${d.copies.length} physical copies:`);
		for (const c of d.copies) {
			console.log(`      v${c.version}  ${c.realPath}`);
			console.log(`         via ${c.foundAt}`);
		}
		if (d.allowed) console.log(`      allowlisted: ${EXPECTED_DUPLICATES[d.name]}`);
	}

	console.log('');
	if (failures.length > 0) {
		console.error(
			`FAIL: ${failures.length} curated ${failures.length === 1 ? 'library resolves' : 'libraries resolve'} to multiple physical copies.`,
		);
		process.exit(1);
	}
	console.log('OK: no un-allowlisted curated duplicates.');
	process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
