#!/usr/bin/env node
/**
 * Run Stryker on a single source file of a workspace package and emit an
 * actionable summary. Package-agnostic: the nightly matrix and the per-package
 * `mutate` npm scripts both call this one script.
 *
 * Usage (also exposed as `pnpm mutate <file>` from the repo root):
 *   node scripts/mutation-health/mutate.mjs <file> [--package-dir <repo-rel-path>] [--config <path>]
 *
 * The package is inferred from a repo-relative file path; pass --package-dir when
 * the target is package-relative (the nightly does this).
 *   node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts   # inferred
 *   node scripts/mutation-health/mutate.mjs src/cron.ts --package-dir packages/workflow
 *
 * Stryker config resolution (first match wins):
 *   1. --config <path>                         explicit override
 *   2. <package-dir>/stryker.config.mjs        package-local (e.g. workflow's vm carve-out)
 *   3. scripts/mutation-health/stryker.default.mjs   shared default (points at the
 *                                              package's own vitest.config.* — no
 *                                              bespoke vitest config required)
 *
 * Outputs (under <package-dir>/reports/mutation/):
 *   raw.json      — full Stryker Mutation Testing Elements report
 *   raw.html      — Stryker's HTML report (browse for human review)
 *   summary.json  — compact actionable summary (this script)
 *
 * Exit codes:
 *   0  — mutation score ≥ threshold
 *   1  — score < threshold (AI loop should iterate)
 *   2  — usage / config error
 *   3  — Stryker run failed
 */

import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const THRESHOLD = Number(process.env.STRYKER_THRESHOLD ?? 80);

function die(code, msg) {
	process.stderr.write(`${msg}\n`);
	process.exit(code);
}

// --- args: one positional target + --package-dir (required) + --config (optional)
const argv = process.argv.slice(2);
let packageDirArg;
let configArg;
let targetArg;
for (let i = 0; i < argv.length; i++) {
	const a = argv[i];
	if (a === '--package-dir') packageDirArg = argv[++i];
	else if (a === '--config') configArg = argv[++i];
	else if (!a.startsWith('--') && targetArg === undefined) targetArg = a;
}

const usage =
	'Usage: node scripts/mutation-health/mutate.mjs <file> [--package-dir <repo-rel-path>] [--config <path>]\n' +
	'  - repo-relative file → package is inferred: node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts\n' +
	'  - package-relative file → pass --package-dir:  node scripts/mutation-health/mutate.mjs src/cron.ts --package-dir packages/workflow';

if (!targetArg) die(2, `Missing mutate target.\n${usage}`);

// Walk up from a path to the nearest enclosing package.json (bounded by repoRoot).
function findPackageRoot(fromAbs) {
	let dir = path.dirname(fromAbs);
	while (dir === repoRoot || dir.startsWith(`${repoRoot}${path.sep}`)) {
		if (existsSync(path.join(dir, 'package.json'))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

// Resolve pkgRoot + the src-relative target, supporting two call styles:
//   1. --package-dir given → target is package-relative (or absolute). (the nightly's style)
//   2. no --package-dir → target is a repo-relative file; infer the package from it.
let pkgRoot;
let target;
if (packageDirArg) {
	pkgRoot = path.resolve(repoRoot, packageDirArg);
	if (!existsSync(pkgRoot)) die(2, `Package dir not found: ${pkgRoot}`);
	target = path.isAbsolute(targetArg) ? path.relative(pkgRoot, targetArg) : targetArg;
} else {
	const abs = path.resolve(repoRoot, targetArg);
	if (!existsSync(abs)) die(2, `Target not found: ${abs}\n${usage}`);
	const found = findPackageRoot(abs);
	if (!found)
		die(2, `Could not infer the package for ${targetArg} — pass --package-dir.\n${usage}`);
	pkgRoot = found;
	target = path.relative(pkgRoot, abs);
}

if (!target.startsWith('src/') || target.includes('..')) {
	die(2, `Target must be under the package's src/. Got: ${target}`);
}
if (!existsSync(path.join(pkgRoot, target))) {
	die(2, `Target not found: ${path.join(pkgRoot, target)}`);
}
const packageDir = path.relative(repoRoot, pkgRoot);

// --- resolve the Stryker config: override → package-local → shared default
const localConfig = path.join(pkgRoot, 'stryker.config.mjs');
const defaultConfig = path.join(__dirname, 'stryker.default.mjs');
const configPath = configArg
	? path.resolve(repoRoot, configArg)
	: existsSync(localConfig)
		? localConfig
		: defaultConfig;

// --- resolve the Stryker binary from the hoisted store (works for any package)
const strykerBin = path.join(
	path.dirname(require.resolve('@stryker-mutator/core/package.json')),
	'bin/stryker.js',
);

const reportDir = path.join(pkgRoot, 'reports/mutation');
const rawJsonPath = path.join(reportDir, 'raw.json');
const summaryJsonPath = path.join(reportDir, 'summary.json');
await mkdir(reportDir, { recursive: true });

process.stderr.write(
	`Running Stryker on ${packageDir}/${target} (config: ${path.relative(repoRoot, configPath)}, threshold: ${THRESHOLD}%)\n`,
);

await new Promise((resolve) => {
	const child = spawn(process.execPath, [strykerBin, 'run', configPath, '--mutate', target], {
		cwd: pkgRoot,
		stdio: 'inherit',
	});
	child.on('exit', (code) => {
		if (code !== 0) die(3, `Stryker exited with code ${code}`);
		resolve();
	});
	child.on('error', (err) => die(3, `Stryker failed to start: ${err.message}`));
});

if (!existsSync(rawJsonPath)) {
	die(3, `Stryker did not produce ${rawJsonPath}`);
}

const raw = JSON.parse(await readFile(rawJsonPath, 'utf8'));

// Build a test-id → test-name lookup so survivors can name the tests that
// covered the mutated line without killing the mutant.
const testIdToName = {};
for (const info of Object.values(raw.testFiles ?? {})) {
	for (const t of info.tests ?? []) {
		testIdToName[t.id] = t.name;
	}
}

function sliceFromLocation(source, loc) {
	const lines = source.split('\n');
	const { start, end } = loc;
	if (start.line === end.line) {
		return lines[start.line - 1].slice(start.column, end.column);
	}
	return [
		lines[start.line - 1].slice(start.column),
		...lines.slice(start.line, end.line - 1),
		lines[end.line - 1].slice(0, end.column),
	].join('\n');
}

function scoreFromCounts(c) {
	const detected = c.killed + c.timeout;
	const valid = c.killed + c.timeout + c.survived + c.noCoverage;
	return valid === 0 ? 0 : +((detected / valid) * 100).toFixed(2);
}

const filesSummary = [];
for (const [file, info] of Object.entries(raw.files)) {
	const counts = {
		killed: 0,
		survived: 0,
		noCoverage: 0,
		timeout: 0,
		compileError: 0,
		runtimeError: 0,
		ignored: 0,
	};
	const survivors = [];
	for (const m of info.mutants) {
		switch (m.status) {
			case 'Killed':
				counts.killed++;
				break;
			case 'Survived':
				counts.survived++;
				break;
			case 'NoCoverage':
				counts.noCoverage++;
				break;
			case 'Timeout':
				counts.timeout++;
				break;
			case 'CompileError':
				counts.compileError++;
				break;
			case 'RuntimeError':
				counts.runtimeError++;
				break;
			case 'Ignored':
				counts.ignored++;
				break;
		}
		if (m.status === 'Survived' || m.status === 'NoCoverage') {
			survivors.push({
				id: m.id,
				mutator: m.mutatorName,
				status: m.status,
				location: `${file}:${m.location.start.line}:${m.location.start.column}`,
				line: m.location.start.line,
				original: sliceFromLocation(info.source, m.location),
				replacement: m.replacement,
				coveringTests: (m.coveredBy ?? []).map((id) => testIdToName[id] ?? id),
			});
		}
	}
	survivors.sort((a, b) => a.line - b.line);
	const score = scoreFromCounts(counts);
	filesSummary.push({
		file,
		score,
		thresholdMet: score >= THRESHOLD,
		counts,
		survivors,
	});
}

const overallCounts = filesSummary.reduce(
	(acc, f) => {
		for (const k of Object.keys(acc)) acc[k] += f.counts[k];
		return acc;
	},
	{
		killed: 0,
		survived: 0,
		noCoverage: 0,
		timeout: 0,
		compileError: 0,
		runtimeError: 0,
		ignored: 0,
	},
);

const summary = {
	generatedAt: new Date().toISOString(),
	threshold: THRESHOLD,
	target,
	overall: {
		score: scoreFromCounts(overallCounts),
		counts: overallCounts,
		thresholdMet: scoreFromCounts(overallCounts) >= THRESHOLD,
	},
	files: filesSummary,
};

await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));

process.stderr.write('\n=== Mutation summary ===\n');
for (const f of filesSummary) {
	const mark = f.thresholdMet ? '✓' : '✗';
	process.stderr.write(
		`${mark} ${f.file}  ${f.score.toFixed(2)}%  ` +
			`(killed ${f.counts.killed} / survived ${f.counts.survived} / no-cov ${f.counts.noCoverage} / timeout ${f.counts.timeout})\n`,
	);
	for (const s of f.survivors) {
		process.stderr.write(
			`   - ${s.status.toLowerCase().padEnd(10)} ${s.mutator.padEnd(22)} ${s.location}\n`,
		);
	}
}
process.stderr.write(
	`\nThreshold: ${THRESHOLD}%  •  overall: ${summary.overall.score.toFixed(2)}%\n`,
);
process.stderr.write(`Summary written: ${summaryJsonPath}\n`);

process.exit(summary.overall.thresholdMet ? 0 : 1);
