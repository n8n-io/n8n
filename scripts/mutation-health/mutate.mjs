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
 * Gate semantics:
 *   A run passes only when the mutation score meets `STRYKER_THRESHOLD` AND
 *   every remaining mutant is either killed or explicitly justified via a
 *   `// Stryker disable …` comment (status `Ignored`). Any `Survived` or
 *   `NoCoverage` mutant is an unjustified survivor and fails the gate even
 *   above the threshold — raw score alone counts low-value and equivalent
 *   mutants in the denominator and lets agents pad the suite to 80%. See
 *   DEVP-442.
 *
 * Exit codes:
 *   0  — gate passed (score ≥ threshold AND no unjustified survivors)
 *   1  — gate failed: score < threshold OR at least one Survived/NoCoverage
 *        mutant remains (AI loop should iterate). Also used when Stryker
 *        reports "No tests were executed" — the file has no covering tests,
 *        so we synthesise a score-0 red summary rather than hard-failing the
 *        job. The ledger then records the gap and the picker advances.
 *   2  — usage / config error
 *   3  — Stryker run failed for any other reason (instrumentation crash etc.)
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

// Capture Stryker's combined output while still forwarding it to the parent
// stdio (so CI logs look unchanged). We need the buffer to detect the
// "No tests were executed" dry-run case below.
const strykerOutputChunks = [];
const strykerExitCode = await new Promise((resolve) => {
	const child = spawn(process.execPath, [strykerBin, 'run', configPath, '--mutate', target], {
		cwd: pkgRoot,
		stdio: ['inherit', 'pipe', 'pipe'],
	});
	child.stdout.on('data', (chunk) => {
		strykerOutputChunks.push(chunk);
		process.stdout.write(chunk);
	});
	child.stderr.on('data', (chunk) => {
		strykerOutputChunks.push(chunk);
		process.stderr.write(chunk);
	});
	child.on('exit', (code) => resolve(code ?? 1));
	child.on('error', (err) => die(3, `Stryker failed to start: ${err.message}`));
});
const strykerOutput = Buffer.concat(strykerOutputChunks).toString('utf8');

// "No tests were executed" is Stryker's dry-run verdict when nothing in the
// test suite covers the picked source file. That's the most informative
// mutation result there is — effectively 0%, every mutant no-coverage — so we
// record it as a score-0 red ledger row instead of hard-failing the job. The
// picker can then advance to the next file the following night. See DEVP-414.
const noTestsExecuted =
	/no tests were executed/i.test(strykerOutput) && !existsSync(rawJsonPath);

if (strykerExitCode !== 0 && !noTestsExecuted) {
	die(3, `Stryker exited with code ${strykerExitCode}`);
}

if (noTestsExecuted) {
	// Best-effort mutant count from the instrument phase log line, e.g.
	//   INFO Instrumenter Instrumented 1 source file(s) with 47 mutant(s)
	// Falls back to 0 if Stryker never got that far.
	const mutantMatch = strykerOutput.match(
		/Instrumented\s+\d+\s+source file\(s\)\s+with\s+(\d+)\s+mutant/i,
	);
	const noCoverage = mutantMatch ? Number(mutantMatch[1]) : 0;
	const counts = {
		killed: 0,
		survived: 0,
		noCoverage,
		timeout: 0,
		compileError: 0,
		runtimeError: 0,
		ignored: 0,
	};
	const summary = {
		generatedAt: new Date().toISOString(),
		threshold: THRESHOLD,
		target,
		overall: { score: 0, counts, thresholdMet: false },
		files: [
			{
				file: target,
				score: 0,
				thresholdMet: false,
				counts,
				survivors: [],
				ignored: [],
			},
		],
	};
	await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));
	process.stderr.write(
		`\n=== Mutation summary ===\n` +
			`✗ ${target}  0.00%  (no covering tests — recorded as score-0 red)\n` +
			`Summary written: ${summaryJsonPath}\n`,
	);
	process.exit(1);
}

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

// A run is only "passing" when the score meets the floor AND every unkilled
// mutant has been explicitly justified (Ignored via a Stryker disable
// comment). Any Survived/NoCoverage mutant is unjustified by definition.
function gatePassed(score, counts) {
	return score >= THRESHOLD && counts.survived === 0 && counts.noCoverage === 0;
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
	const ignored = [];
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
		if (m.status === 'Ignored') {
			ignored.push({
				id: m.id,
				mutator: m.mutatorName,
				location: `${file}:${m.location.start.line}:${m.location.start.column}`,
				line: m.location.start.line,
				reason: m.statusReason ?? '',
			});
		}
	}
	survivors.sort((a, b) => a.line - b.line);
	ignored.sort((a, b) => a.line - b.line);
	const score = scoreFromCounts(counts);
	filesSummary.push({
		file,
		score,
		thresholdMet: gatePassed(score, counts),
		counts,
		survivors,
		ignored,
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

const overallScore = scoreFromCounts(overallCounts);
const summary = {
	generatedAt: new Date().toISOString(),
	threshold: THRESHOLD,
	target,
	overall: {
		score: overallScore,
		counts: overallCounts,
		thresholdMet: gatePassed(overallScore, overallCounts),
	},
	files: filesSummary,
};

await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));

process.stderr.write('\n=== Mutation summary ===\n');
for (const f of filesSummary) {
	const mark = f.thresholdMet ? '✓' : '✗';
	process.stderr.write(
		`${mark} ${f.file}  ${f.score.toFixed(2)}%  ` +
			`(killed ${f.counts.killed} / survived ${f.counts.survived} / no-cov ${f.counts.noCoverage} / timeout ${f.counts.timeout} / ignored ${f.counts.ignored})\n`,
	);
	for (const s of f.survivors) {
		process.stderr.write(
			`   - ${s.status.toLowerCase().padEnd(10)} ${s.mutator.padEnd(22)} ${s.location}\n`,
		);
	}
	for (const ig of f.ignored) {
		const reason = ig.reason ? ` — ${ig.reason}` : ' — (no reason given)';
		process.stderr.write(
			`   · ${'ignored'.padEnd(10)} ${ig.mutator.padEnd(22)} ${ig.location}${reason}\n`,
		);
	}
}
const gateState = summary.overall.thresholdMet ? 'PASS' : 'FAIL';
const unjustified = overallCounts.survived + overallCounts.noCoverage;
process.stderr.write(
	`\nGate: ${gateState}  •  threshold: ${THRESHOLD}%  •  score: ${summary.overall.score.toFixed(2)}%  •  ` +
		`unjustified survivors: ${unjustified}  •  ignored (justified): ${overallCounts.ignored}\n`,
);
process.stderr.write(`Summary written: ${summaryJsonPath}\n`);

process.exit(summary.overall.thresholdMet ? 0 : 1);
