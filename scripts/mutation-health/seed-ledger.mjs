#!/usr/bin/env node
/**
 * Enumerate test files in a package and emit an initial BQ ledger payload.
 *
 * Walks <pkg-dir>/test/** / *.test.ts, maps each to a source file under
 * <pkg-dir>/src/ via (in order):
 *   1. Direct mirror      — test/foo.test.ts → src/foo.ts
 *   2. Dotted infix       — test/foo.bar.test.ts → src/foo.ts
 *   3. Import parsing     — first matching `from '../src/...'` import
 *
 * Emits a JSON payload with `ledger[]` rows, status='new', last_score=NULL.
 * One row per (test_file, source_file) pair. Skipped pairs are logged to
 * stderr with a reason so they can be hand-curated later.
 *
 * Usage:
 *   node scripts/mutation-health/seed-ledger.mjs --package-dir packages/workflow [--dry-run] [--out <path>]
 *
 * Exit codes:
 *   0 — at least one row was emitted
 *   1 — no rows could be mapped (everything skipped)
 *   2 — usage / config error
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
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

async function isFile(p) {
	try {
		return (await stat(p)).isFile();
	} catch {
		return false;
	}
}

// Files with no useful executable behaviour to mutate — types, barrels, pure constants.
// Excluded from import-parse matches so tests don't get falsely paired with them.
const LOW_VALUE_BASENAMES = new Set(['interfaces', 'index', 'constants', 'types']);

function isLowValueSource(absPath) {
	const base = path.basename(absPath, '.ts');
	return LOW_VALUE_BASENAMES.has(base) || absPath.endsWith('.d.ts');
}

async function walkTests(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const out = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			out.push(...(await walkTests(full)));
		} else if (e.isFile() && e.name.endsWith('.test.ts')) {
			out.push(full);
		}
	}
	return out;
}

async function walkSources(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const out = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			out.push(...(await walkSources(full)));
		} else if (
			e.isFile() &&
			e.name.endsWith('.ts') &&
			!e.name.endsWith('.d.ts') &&
			e.name !== 'index.ts'
		) {
			out.push(full);
		}
	}
	return out;
}

function indexByBasename(srcFiles) {
	const ix = new Map(); // basename → [absPath]
	for (const f of srcFiles) {
		const base = path.basename(f, '.ts');
		if (!ix.has(base)) ix.set(base, []);
		ix.get(base).push(f);
	}
	return ix;
}

/**
 * Resolve a relative import (with optional `/index` fallback and `.ts` extension)
 * to an absolute path under the package, or null if no file exists.
 */
async function resolveImport(fromAbsDir, rel) {
	const base = path.resolve(fromAbsDir, rel);
	const candidates = [
		base.endsWith('.ts') ? base : base + '.ts',
		path.join(base, 'index.ts'),
	];
	for (const c of candidates) {
		if (await isFile(c)) return c;
	}
	return null;
}

async function resolveSourceFile(testAbs, srcDir, testDir, srcIndex) {
	const testRel = path.relative(testDir, testAbs); // e.g. ExpressionExtensions/array-extensions.test.ts
	const baseNoTest = testRel.replace(/\.test\.ts$/, '.ts'); // ExpressionExtensions/array-extensions.ts
	const testBase = path.basename(testAbs, '.test.ts'); // array-extensions

	// 1. Direct mirror: test/foo.test.ts → src/foo.ts
	const direct = path.join(srcDir, baseNoTest);
	if (await isFile(direct)) return { source: direct, method: 'direct' };

	// 2. Dotted infix: test/foo.bar.test.ts → src/foo.ts (same relative dir)
	const dir = path.dirname(baseNoTest);
	const fileBase = path.basename(baseNoTest, '.ts'); // node-helpers.conditions
	if (fileBase.includes('.')) {
		const stripped = fileBase.split('.')[0] + '.ts';
		const candidate = path.join(srcDir, dir, stripped);
		if (await isFile(candidate)) return { source: candidate, method: 'infix-strip' };
	}

	// 3. Filesystem search: a single src file whose basename matches the test
	//    (handles dir-name mismatches like test/ExpressionExtensions → src/extensions)
	const fsHits = srcIndex.get(testBase) ?? [];
	if (fsHits.length === 1) return { source: fsHits[0], method: 'fs-search' };

	// 4. Import parsing: pick a real import that points into src/
	const content = await readFile(testAbs, 'utf8');
	const re = /from\s+['"](\.{1,2}\/(?:\.\.\/)*src\/[^'"]+)['"]/g;
	const allMatches = [];
	let m;
	while ((m = re.exec(content)) !== null) {
		const resolved = await resolveImport(path.dirname(testAbs), m[1]);
		if (resolved) allMatches.push(resolved);
	}
	// Filter out types-only / barrel / constants-only files — they have no useful
	// runtime to mutate and lead to false pairings.
	const matches = allMatches.filter((c) => !isLowValueSource(c));
	if (matches.length === 0) return null;

	// Prefer exact basename match, then prefix (dotted-suffix) match, then first import
	const exact = matches.find((c) => path.basename(c, '.ts') === testBase);
	if (exact) return { source: exact, method: 'import-parse' };
	const prefix = matches.find((c) => path.basename(c, '.ts').split('.')[0] === testBase);
	if (prefix) return { source: prefix, method: 'import-parse' };
	return { source: matches[0], method: 'import-parse' };
}

const args = parseArgs(process.argv.slice(2));
const pkgDirArg = args['package-dir'];
if (!pkgDirArg) die(2, 'Missing required --package-dir <relative-path-to-package>');

const dryRun = args['dry-run'] === true;
const origin = args.origin ?? 'human-written';

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
const testDir = path.join(pkgDir, 'test');
if (!existsSync(srcDir)) die(2, `No src/ in ${pkgDir}`);
if (!existsSync(testDir)) die(2, `No test/ in ${pkgDir}`);

const testFiles = (await walkTests(testDir)).sort();
const sourceFiles = await walkSources(srcDir);
const srcIndex = indexByBasename(sourceFiles);
process.stderr.write(
	`Package ${pkgName} (${path.relative(repoRoot, pkgDir)}): ${testFiles.length} test file(s), ${sourceFiles.length} source file(s)\n`,
);

const ledger = [];
const skipped = [];
const methodCounts = { direct: 0, 'infix-strip': 0, 'fs-search': 0, 'import-parse': 0 };

for (const testAbs of testFiles) {
	const result = await resolveSourceFile(testAbs, srcDir, testDir, srcIndex);
	const testRel = path.relative(repoRoot, testAbs);
	if (!result) {
		skipped.push({ test_file: testRel, reason: 'no source file found via any heuristic' });
		continue;
	}
	const sourceRel = path.relative(repoRoot, result.source);
	methodCounts[result.method]++;
	ledger.push({
		test_file_path: testRel,
		source_file_path: sourceRel,
		package: pkgName,
		last_score: null,
		threshold_at_run: null,
		last_checked_at: null,
		last_checked_sha: null,
		status: 'new',
		origin,
		attempts: 0,
		mutants_killed: null,
		mutants_survived: null,
		mutants_no_coverage: null,
		mutants_timeout: null,
	});
}

// Report
process.stderr.write('\n=== Mapping summary ===\n');
process.stderr.write(`Mapped:   ${ledger.length}\n`);
process.stderr.write(`  direct        : ${methodCounts['direct']}\n`);
process.stderr.write(`  infix-strip   : ${methodCounts['infix-strip']}\n`);
process.stderr.write(`  fs-search     : ${methodCounts['fs-search']}\n`);
process.stderr.write(`  import-parse  : ${methodCounts['import-parse']}\n`);
process.stderr.write(`Skipped:  ${skipped.length}\n`);
for (const s of skipped) {
	process.stderr.write(`  - ${s.test_file}: ${s.reason}\n`);
}

if (dryRun) {
	process.stderr.write('\n--dry-run, not writing payload.\n');
	process.stderr.write('Sample mapping:\n');
	for (const row of ledger.slice(0, 5)) {
		process.stderr.write(`  ${row.test_file_path}\n    → ${row.source_file_path}\n`);
	}
	process.exit(ledger.length > 0 ? 0 : 1);
}

if (ledger.length === 0) {
	die(1, 'No rows mapped — nothing to write.');
}

const outPath = args.out ?? path.join(pkgDir, 'reports/mutation/ledger-seed.json');
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify({ ledger }, null, 2));
process.stderr.write(`\nSeed payload written: ${outPath}\n`);
process.stderr.write(`POST to MUTATION_HEALTH_WEBHOOK to populate the ledger.\n`);
