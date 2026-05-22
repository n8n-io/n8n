#!/usr/bin/env node
/**
 * Enumerate source files in a package and emit an initial BQ ledger payload.
 *
 * Walks <pkg-dir>/src/** / *.ts and emits one ledger row per source file
 * (status='new', last_score=NULL). Excludes files with no useful mutation
 * surface: barrels (index.ts), declarations (*.d.ts), and known
 * types/constants files (interfaces.ts, constants.ts, types.ts).
 *
 * Tests aren't enumerated. Stryker scores test-suite effectiveness *for a
 * source file* — the test files contributing to that score live in the
 * vitest config, not here. See README for why the ledger is keyed on
 * source_file_path only.
 *
 * Usage:
 *   node scripts/mutation-health/seed-ledger.mjs --package-dir packages/workflow [--dry-run] [--out <path>]
 *
 * Exit codes:
 *   0 — at least one row was emitted
 *   1 — no source files survived the low-value filter
 *   2 — usage / config error
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
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
const pkgDirArg = args['package-dir'];
if (!pkgDirArg) die(2, 'Missing required --package-dir <relative-path-to-package>');

const dryRun = args['dry-run'] === true;

const repoRoot = path.resolve(
	execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
);
const pkgDir = path.isAbsolute(pkgDirArg) ? pkgDirArg : path.join(repoRoot, pkgDirArg);
if (!existsSync(pkgDir)) die(2, `Package dir not found: ${pkgDir}`);

const pkgJsonPath = path.join(pkgDir, 'package.json');
if (!existsSync(pkgJsonPath)) die(2, `No package.json at ${pkgJsonPath}`);

const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'));
const pkgName = pkgJson.name;
const srcDir = path.join(pkgDir, 'src');
if (!existsSync(srcDir)) die(2, `No src/ in ${pkgDir}`);

const allSources = (await walkSources(srcDir)).sort();
const worthy = allSources.filter(isMutationWorthy);
const filtered = allSources.filter((p) => !isMutationWorthy(p));

process.stderr.write(
	`Package ${pkgName} (${path.relative(repoRoot, pkgDir)}): ` +
		`${allSources.length} .ts files, ${worthy.length} worth mutating, ${filtered.length} filtered\n`,
);

if (worthy.length === 0) die(1, 'No mutation-worthy source files found.');

const ledger = worthy.map((abs) => ({
	source_file_path: path.relative(repoRoot, abs),
	package: pkgName,
	last_score: null,
	threshold_at_run: null,
	last_checked_at: null,
	status: 'new',
	mutants_killed: null,
	mutants_survived: null,
	mutants_no_coverage: null,
	mutants_timeout: null,
}));

if (dryRun) {
	process.stderr.write(`\n--dry-run, not writing payload.\n`);
	process.stderr.write(`First 5 rows:\n`);
	for (const row of ledger.slice(0, 5)) {
		process.stderr.write(`  ${row.source_file_path}\n`);
	}
	if (filtered.length > 0) {
		process.stderr.write(`\nFiltered (low-value mutation targets):\n`);
		for (const p of filtered.slice(0, 10)) {
			process.stderr.write(`  ${path.relative(repoRoot, p)}\n`);
		}
		if (filtered.length > 10) {
			process.stderr.write(`  ... and ${filtered.length - 10} more\n`);
		}
	}
	process.exit(0);
}

const outPath = args.out ?? path.join(pkgDir, 'reports/mutation/ledger-seed.json');
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify({ ledger }, null, 2));
process.stderr.write(`\nSeed payload written: ${outPath}\n`);
process.stderr.write(`POST to MUTATION_HEALTH_WEBHOOK to populate the ledger.\n`);
