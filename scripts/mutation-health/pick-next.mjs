#!/usr/bin/env node
/**
 * Walk a package's source tree, merge with the live BQ ledger snapshot,
 * return the next pair to mutate.
 *
 * Files present in src/ but absent from the live ledger are synthesised as
 * status='new'. No separate seed step needed — the ledger fills in
 * organically as files get scored.
 *
 * Stored statuses (from BQ): new | red | green
 * Effective statuses (computed at pick time): new | red | stale | green
 *
 * Picker priority: new → red → stale → skip green
 * Tiebreaks within each bucket:
 *   - new:    alphabetical by source_file_path
 *   - red:    lowest score first (focus on weakest tests)
 *   - stale:  oldest last_checked_at first (natural cycling)
 *
 * "Stale" is an in-memory promotion of green rows older than
 * STALE_AFTER_WEEKS (default 4). Not stored.
 *
 * Inputs:
 *   --package-dir <path>     Required. Repo-relative path to the package, e.g. packages/workflow
 *   --ledger-file <path>     Required. Live ledger JSON: { "ledger": [ ... ] }
 *   --stale-after-weeks <n>  Optional. Default 4.
 *
 * Output (stdout): { picked: { source_file_path, package, prior_status, effective_status } }
 *                  OR { picked: null, reason: "all-green" | "empty-source-tree" }.
 *
 * Exit codes:
 *   0 — picked a row OR nothing to do (with picked: null sentinel)
 *   2 — usage / config error
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function die(code, msg) {
	process.stderr.write(`${msg}\n`);
	process.exit(code);
}

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) continue;
		const key = a.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) {
			out[key] = true;
		} else {
			out[key] = next;
			i++;
		}
	}
	return out;
}

// Files with no useful mutation surface: barrels, declarations, type-only modules.
const LOW_VALUE_BASENAMES = new Set(['interfaces', 'index', 'constants', 'types']);

function isMutationWorthy(absPath) {
	if (absPath.endsWith('.d.ts')) return false;
	const base = path.basename(absPath, '.ts');
	if (LOW_VALUE_BASENAMES.has(base)) return false;
	return true;
}

async function walkSources(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const out = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			out.push(...(await walkSources(full)));
		} else if (e.isFile() && e.name.endsWith('.ts')) {
			out.push(full);
		}
	}
	return out;
}

const args = parseArgs(process.argv.slice(2));
const STALE_AFTER_WEEKS = Number(args['stale-after-weeks'] ?? 4);

const pkgDirArg = args['package-dir'];
const ledgerFile = args['ledger-file'];
if (!pkgDirArg) die(2, 'Missing required --package-dir <relative-path-to-package>');
if (!ledgerFile) die(2, 'Missing required --ledger-file <path>');

const repoRoot = path.resolve(
	execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
);
const pkgDir = path.isAbsolute(pkgDirArg) ? pkgDirArg : path.join(repoRoot, pkgDirArg);
if (!existsSync(pkgDir)) die(2, `Package dir not found: ${pkgDir}`);

const pkgJsonPath = path.join(pkgDir, 'package.json');
if (!existsSync(pkgJsonPath)) die(2, `No package.json at ${pkgJsonPath}`);
const pkgName = JSON.parse(await readFile(pkgJsonPath, 'utf8')).name;

const srcDir = path.join(pkgDir, 'src');
if (!existsSync(srcDir)) die(2, `No src/ in ${pkgDir}`);

const ledgerPath = path.isAbsolute(ledgerFile) ? ledgerFile : path.join(process.cwd(), ledgerFile);
if (!existsSync(ledgerPath)) die(2, `Ledger file not found: ${ledgerPath}`);

const ledgerPayload = JSON.parse(await readFile(ledgerPath, 'utf8'));
const liveLedger = ledgerPayload.ledger;
if (!Array.isArray(liveLedger)) die(2, 'Ledger payload missing `ledger` array.');

const allSources = (await walkSources(srcDir)).sort();
const worthy = allSources.filter(isMutationWorthy).map((abs) => path.relative(repoRoot, abs));

if (worthy.length === 0) {
	process.stderr.write('No mutation-worthy source files found under src/.\n');
	process.stdout.write(JSON.stringify({ picked: null, reason: 'empty-source-tree' }) + '\n');
	process.exit(0);
}

// Merge: live ledger row wins over synthesised "new" row.
const byPath = new Map();
for (const row of liveLedger) {
	byPath.set(row.source_file_path, row);
}
const merged = worthy.map(
	(p) =>
		byPath.get(p) ?? {
			source_file_path: p,
			package: pkgName,
			last_score: null,
			threshold_at_run: null,
			last_checked_at: null,
			status: 'new',
		},
);

const NOW = Date.now();
const STALE_AFTER_MS = STALE_AFTER_WEEKS * 7 * 24 * 60 * 60 * 1000;

function computeEffectiveStatus(row) {
	if (row.status === 'new') return 'new';
	if (row.status === 'red') return 'red';
	// status === 'green' — promote to 'stale' if old enough
	if (row.last_checked_at) {
		const age = NOW - Date.parse(row.last_checked_at);
		if (age > STALE_AFTER_MS) return 'stale';
	}
	return 'green';
}

const PRIORITY = { new: 0, red: 1, stale: 2, green: 3 };

const annotated = merged.map((row) => ({ ...row, effective_status: computeEffectiveStatus(row) }));

annotated.sort((a, b) => {
	const pa = PRIORITY[a.effective_status] ?? 99;
	const pb = PRIORITY[b.effective_status] ?? 99;
	if (pa !== pb) return pa - pb;

	if (a.effective_status === 'new') {
		return a.source_file_path.localeCompare(b.source_file_path);
	}

	if (a.effective_status === 'red') {
		const sa = a.last_score == null ? Infinity : Number(a.last_score);
		const sb = b.last_score == null ? Infinity : Number(b.last_score);
		if (sa !== sb) return sa - sb;
		return a.source_file_path.localeCompare(b.source_file_path);
	}

	// stale: oldest last_checked_at first
	const ta = a.last_checked_at ? Date.parse(a.last_checked_at) : 0;
	const tb = b.last_checked_at ? Date.parse(b.last_checked_at) : 0;
	if (ta !== tb) return ta - tb;
	return a.source_file_path.localeCompare(b.source_file_path);
});

const counts = annotated.reduce((acc, r) => {
	acc[r.effective_status] = (acc[r.effective_status] ?? 0) + 1;
	return acc;
}, {});

process.stderr.write(
	`Source files: ${worthy.length}  •  ` +
		`new=${counts.new ?? 0} red=${counts.red ?? 0} stale=${counts.stale ?? 0} green=${counts.green ?? 0}\n`,
);

const top = annotated[0];

if (top.effective_status === 'green') {
	process.stderr.write(`All actionable rows green (stale threshold ${STALE_AFTER_WEEKS} weeks) — nothing to do.\n`);
	process.stdout.write(JSON.stringify({ picked: null, reason: 'all-green' }) + '\n');
	process.exit(0);
}

process.stderr.write(
	`Picked: ${top.source_file_path}\n` +
		`        priority=${top.effective_status}  ` +
		`(was ${top.status}, last_checked_at=${top.last_checked_at ?? 'never'})\n`,
);

process.stdout.write(
	JSON.stringify({
		picked: {
			source_file_path: top.source_file_path,
			package: top.package,
			prior_status: top.status,
			effective_status: top.effective_status,
		},
	}) + '\n',
);
