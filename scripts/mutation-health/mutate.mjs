#!/usr/bin/env node
/**
 * Run Stryker over a workspace package and write an actionable summary. This
 * script works for any package. Run it as `pnpm mutate` from the repo root.
 *
 *   pnpm mutate <file>[:<start>-<end>] [--package-dir <dir>] [--test-file <path>] [--config <path>]
 *   pnpm mutate --diff [--base <ref>] [--test-file <path>] [--config <path>]
 *
 * Use `--test-file` to name the test files that must kill the mutants. Stryker
 * then runs only those files (its `testFiles` option) instead of everything
 * vitest considers "related" to the target. Repeat the flag or pass a
 * comma-separated list. Some packages require it — see
 * `REQUIRES_EXPLICIT_TEST_FILES`.
 *
 * Use `--diff` before you merge. It reads the changed line ranges from
 * `git diff -U0 $(git merge-base <base> HEAD)`, which covers committed branch
 * work and uncommitted edits. It mutates only those lines, in one Stryker run
 * per package. This makes the gate apply to the patch: it scores the lines you
 * changed, not the debt you inherited.
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
 *   summary.json  — compact actionable summary (this script). Emitted even on a
 *                   non-zero / timed-out Stryker exit, as long as Stryker wrote
 *                   a (partial) raw.json — a run that can't finish still surfaces
 *                   the survivors it found rather than dying with nothing.
 *
 * Each summary file row also carries a `coverage` fraction in [0,1] — the share
 * of mutants a test actually exercised.
 *
 * Gate semantics:
 *   A run passes only when the score meets `STRYKER_THRESHOLD` and no mutant
 *   survives without a reason. To give a reason, add a `// Stryker disable …`
 *   comment. Stryker then reports the mutant as `Ignored` and keeps it out of
 *   the score. Each `Survived` or `NoCoverage` mutant fails the gate, also
 *   above the threshold. The score alone lets an author add weak tests to reach
 *   80% and leave real gaps. See DEVP-442.
 *
 * Exit codes:
 *   0  — the gate passed.
 *   1  — the gate failed. Iterate: read summary.json and strengthen the tests.
 *   2  — usage or config error.
 *   3  — Stryker did not resolve or did not run. Never 1: a broken toolchain
 *        must stay distinct from a score of zero.
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const THRESHOLD = Number(process.env.STRYKER_THRESHOLD ?? 80);

function die(code, msg) {
	process.stderr.write(`${msg}\n`);
	process.exit(code);
}

// --- pure helpers (exported for the unit tests; no I/O, no process state) ---

function emptyCounts() {
	return {
		killed: 0,
		survived: 0,
		noCoverage: 0,
		timeout: 0,
		compileError: 0,
		runtimeError: 0,
		ignored: 0,
	};
}

export function sliceFromLocation(source, loc) {
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

export function scoreFromCounts(c) {
	const detected = c.killed + c.timeout;
	const valid = c.killed + c.timeout + c.survived + c.noCoverage;
	return valid === 0 ? 0 : +((detected / valid) * 100).toFixed(2);
}

/**
 * Per-file line-coverage proxy distilled from the mutant census: the fraction
 * of mutants a test actually exercised (anything that ran) over those that
 * could be covered (ran + no-coverage). Ignored and compile-error mutants
 * never ran for reasons unrelated to coverage, so they sit outside the ratio.
 *
 * Returns a fraction in [0,1]. The result is clamped.
 */
export function coverageFromCounts(c) {
	const covered = (c.killed ?? 0) + (c.survived ?? 0) + (c.timeout ?? 0) + (c.runtimeError ?? 0);
	const total = covered + (c.noCoverage ?? 0);
	if (total === 0) return 0;
	return +Math.min(1, Math.max(0, covered / total)).toFixed(4);
}

/**
 * What a finished Stryker run produced. `hasReport` must describe THIS run:
 * the caller deletes the previous reports first, because a file left by an
 * earlier run makes a crashed run look complete and report the earlier target.
 *
 *   complete  — the run finished and wrote a report.
 *   partial   — the run wrote a report, then exited non-zero. Untested mutants
 *               can still be survivors, so this never passes the gate.
 *   no-tests  — no test covers the target. A result, not an error: the score is
 *               zero and every mutant has no coverage. See DEVP-414.
 *   failed    — no report. The caller reports a toolchain failure.
 */
export function classifyRun({ exitCode, output, hasReport }) {
	if (!hasReport) {
		return /no tests were executed/i.test(output) ? 'no-tests' : 'failed';
	}
	return exitCode === 0 ? 'complete' : 'partial';
}

// A run is only "passing" when the score meets the floor AND every unkilled
// mutant has been explicitly justified (Ignored via a Stryker disable
// comment). Any Survived/NoCoverage mutant is unjustified by definition.
export function gatePassed(score, counts, threshold) {
	return score >= threshold && counts.survived === 0 && counts.noCoverage === 0;
}

/**
 * Build the compact summary from a raw Stryker Mutation Testing Elements
 * report. Pure: takes the parsed report plus run metadata, returns the summary
 * object written to summary.json.
 */
export function buildSummary(raw, { threshold, target, generatedAt, testFiles = [] }) {
	// test-id → test-name lookup so survivors can name the tests that covered
	// the mutated line without killing the mutant.
	const testIdToName = {};
	for (const info of Object.values(raw.testFiles ?? {})) {
		for (const t of info.tests ?? []) {
			testIdToName[t.id] = t.name;
		}
	}

	const filesSummary = [];
	for (const [file, info] of Object.entries(raw.files)) {
		const counts = emptyCounts();
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
			coverage: coverageFromCounts(counts),
			thresholdMet: gatePassed(score, counts, threshold),
			counts,
			survivors,
			ignored,
		});
	}

	const overallCounts = filesSummary.reduce((acc, f) => {
		for (const k of Object.keys(acc)) acc[k] += f.counts[k];
		return acc;
	}, emptyCounts());

	const overallScore = scoreFromCounts(overallCounts);
	return {
		generatedAt,
		threshold,
		target,
		// Which tests had to kill the mutants. Empty means Stryker used vitest
		// related-test discovery.
		testFiles,
		overall: {
			score: overallScore,
			coverage: coverageFromCounts(overallCounts),
			counts: overallCounts,
			thresholdMet: gatePassed(overallScore, overallCounts, threshold),
		},
		files: filesSummary,
	};
}

/**
 * Synthesise a score-0 red summary for the "No tests were executed" case —
 * every mutant is no-coverage, so coverage is 0 too. See DEVP-414.
 */
export function buildNoTestsSummary({
	threshold,
	target,
	noCoverage,
	generatedAt,
	testFiles = [],
}) {
	const counts = { ...emptyCounts(), noCoverage };
	const coverage = coverageFromCounts(counts);
	return {
		generatedAt,
		threshold,
		target,
		testFiles,
		overall: { score: 0, coverage, counts, thresholdMet: false },
		files: [
			{
				file: target,
				score: 0,
				coverage,
				thresholdMet: false,
				counts,
				survivors: [],
				ignored: [],
			},
		],
	};
}

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

// --- diff-mode planning (pure helpers exported for the unit tests) ---

// Stryker's dry run stops with SIGABRT on the isolated-vm engine. See DEVP-257.
const BLOCKED_PACKAGES = new Set(['@n8n/expression-runtime']);

// Packages whose vitest related-test discovery selects effectively the whole
// suite: `n8n` picks 326 test files (8,414 tests) for one utility file. The
// Stryker vitest runner replaces the package's parallel `forks` pool with a
// single thread worker, thus that selection never finishes the five-minute dry
// run. These packages must name their covering tests with --test-file.
// See DEVP-1038.
const REQUIRES_EXPLICIT_TEST_FILES = new Set(['n8n']);

const NON_SOURCE = [
	/\.d\.ts$/,
	/\.(test|spec)\.[cm]?tsx?$/,
	/(^|\/)__(tests|mocks)__\//,
	/\.stories\.[cm]?tsx?$/,
	/\.config\.[cm]?[jt]s$/,
	/(^|\/)(dist|node_modules|coverage)\//,
	/(^|\/)tests?\//,
	/(^|\/)migrations\//,
];

// This is an exclusion list, not a `src/`-only allowlist. nodes-base and
// nodes-langchain keep their code in `nodes/` and `credentials/`. An allowlist
// drops the largest mutable surface in the repo.
export function isMutableSource(repoRelPath) {
	if (!/\.[cm]?tsx?$/.test(repoRelPath)) return false;
	return !NON_SOURCE.some((re) => re.test(repoRelPath));
}

// Merge overlapping and adjacent ranges. Stryker then gets one span per region.
export function mergeRanges(ranges) {
	const out = [];
	for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
		const last = out.at(-1);
		if (last && r.start <= last.end + 1) last.end = Math.max(last.end, r.end);
		else out.push({ ...r });
	}
	return out;
}

// Read the new-side line ranges from `git diff -U0` hunk headers.
// `@@ -12,0 +13,4 @@` gives `{ start: 13, end: 16 }`. A new-side count of zero
// is a deletion. No code stays there to mutate, so this drops it.
export function parseHunkRanges(diffText) {
	const ranges = [];
	for (const line of diffText.split('\n')) {
		const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (!m) continue;
		const start = Number(m[1]);
		const count = m[2] === undefined ? 1 : Number(m[2]);
		if (count === 0) continue;
		ranges.push({ start, end: start + count - 1 });
	}
	return mergeRanges(ranges);
}

// Join the targets with commas. Stryker keeps only the last `--mutate` flag,
// thus repeated flags mutate one target and the package pays for a dry run
// again for each file.
export function formatMutateArg(targets) {
	return targets.join(',');
}

// `--testFiles` uses the same comma-separated list parser as `--mutate`.
export function formatTestFilesArg(testFiles) {
	return testFiles.join(',');
}

/**
 * Normalise one `--test-file` value to a package-relative path. Stryker matches
 * the pattern from its run cwd, which is the package dir, thus a repo-relative
 * path has to lose the package prefix. Glob patterns pass through unchanged.
 */
export function toPackageRelativeTestFile(value, packageDir) {
	const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
	const prefix = `${packageDir.replaceAll('\\', '/').replace(/\/$/, '')}/`;
	return prefix === '/' || !normalized.startsWith(prefix)
		? normalized
		: normalized.slice(prefix.length);
}

/**
 * Flatten the repeated and comma-separated `--test-file` values into a deduped
 * list of package-relative patterns, in the order the caller gave them.
 */
export function normalizeTestFiles(values, packageDir) {
	const out = [];
	for (const value of values) {
		for (const part of value.split(',')) {
			const trimmed = part.trim();
			if (!trimmed) continue;
			const rel = toPackageRelativeTestFile(trimmed, packageDir);
			if (!out.includes(rel)) out.push(rel);
		}
	}
	return out;
}

/**
 * Pick the `--test-file` values that belong to one package. `--diff` batches
 * several packages behind one global flag, thus a value for `packages/cli` must
 * not reach the `packages/workflow` run, where it matches nothing and turns the
 * whole package red. A value therefore has to be repo-relative in diff mode.
 */
export function testFilesForPackage(values, packageDir) {
	const prefix = `${packageDir.replaceAll('\\', '/').replace(/\/$/, '')}/`;
	const mine = values
		.flatMap((value) => value.split(','))
		.map((value) => value.trim().replaceAll('\\', '/').replace(/^\.\//, ''))
		.filter((value) => value.startsWith(prefix));
	return normalizeTestFiles(mine, packageDir);
}

// A glob needs no existence check — Stryker resolves it against the project
// files and warns when it matches nothing.
export function isGlobPattern(value) {
	return /[*?[\]{}]/.test(value);
}

/**
 * Build the Stryker argv. Pure, so the tests can assert that an explicit test
 * scope reaches Stryker and that an empty one adds no flag.
 */
export function buildStrykerArgs({ strykerBin, configPath, mutateArg, testFiles = [] }) {
	const args = [strykerBin, 'run', configPath, '--inPlace', '--mutate', mutateArg];
	if (testFiles.length > 0) args.push('--testFiles', formatTestFilesArg(testFiles));
	return args;
}

/**
 * Why a package cannot be scored, or null when it can. Pure: it takes the facts
 * read from disk. Both planners go through it, so a named target and a --diff
 * target always get the same answer.
 */
export function ineligibleReasonFor({ packageName, displayName, usesVitest, testFiles = [] }) {
	const label = displayName || packageName;
	if (BLOCKED_PACKAGES.has(packageName)) {
		return `${label} is blocked: the isolated-vm engine crashes Stryker's dry run (DEVP-257)`;
	}
	if (!usesVitest) return `${label} is not a vitest package`;
	if (REQUIRES_EXPLICIT_TEST_FILES.has(packageName) && testFiles.length === 0) {
		return (
			`${label} needs an explicit test scope: vitest related-test discovery selects ` +
			'almost the whole package and Stryker runs it with one worker. Pass ' +
			'--test-file <path> with the tests that cover the target (DEVP-1038)'
		);
	}
	return null;
}

export function splitRange(target) {
	const m = /^(.*):(\d+)-(\d+)$/.exec(target);
	return m ? { file: m[1], range: `${m[2]}-${m[3]}` } : { file: target, range: null };
}

function git(args) {
	const res = spawnSync('git', args, {
		cwd: repoRoot,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	if (res.error) die(2, `git ${args[0]} failed to start: ${res.error.message}`);
	return res;
}

function packageNameOf(pkgRoot) {
	try {
		return JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).name ?? '';
	} catch {
		return '';
	}
}

// Stryker runs the package's own vitest. If the `test` script runs something
// else, the package is skipped, not failed.
function packageUsesVitest(pkgRoot) {
	try {
		const pkg = JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
		return /\bvitest\b/.test(pkg.scripts?.test ?? '');
	} catch {
		return false;
	}
}

function ineligibleReason(pkgRoot, testFiles = []) {
	const packageName = packageNameOf(pkgRoot);
	return ineligibleReasonFor({
		packageName,
		displayName: packageName || path.relative(repoRoot, pkgRoot),
		usesVitest: packageUsesVitest(pkgRoot),
		testFiles,
	});
}

function planFromDiff(base, testFiles) {
	// Diff the merge base against the working tree, not against HEAD. This also
	// scores uncommitted edits. On a PR checkout the tree is clean, thus the
	// result is the same as the branch diff.
	const mergeBase = git(['merge-base', base, 'HEAD']);
	if (mergeBase.status !== 0) {
		die(2, `No merge base with '${base}' — is the ref fetched?\n${mergeBase.stderr.trim()}`);
	}
	const from = mergeBase.stdout.trim();

	const names = git(['diff', '--name-only', from]);
	if (names.status !== 0) {
		die(2, `git diff against '${base}' failed.\n${names.stderr.trim()}`);
	}

	const byPackage = new Map();
	const skipped = [];
	for (const file of names.stdout
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean)) {
		if (!isMutableSource(file)) continue;
		const abs = path.resolve(repoRoot, file);
		if (!existsSync(abs)) continue; // the branch deleted the file

		const pkgRoot = findPackageRoot(abs);
		if (!pkgRoot) {
			skipped.push([file, 'no enclosing package']);
			continue;
		}
		const packageDir = path.relative(repoRoot, pkgRoot);
		// A --diff run cannot guess the covering tests, thus a package that needs
		// an explicit scope is skipped unless the caller passed --test-file for it.
		const jobTestFiles = testFilesForPackage(testFiles, packageDir);
		const reason = ineligibleReason(pkgRoot, jobTestFiles);
		if (reason) {
			skipped.push([file, reason]);
			continue;
		}

		const ranges = parseHunkRanges(git(['diff', '-U0', from, '--', file]).stdout);
		if (ranges.length === 0) continue;

		const rel = path.relative(pkgRoot, abs);
		const job = byPackage.get(pkgRoot) ?? {
			pkgRoot,
			packageDir,
			targets: [],
			testFiles: jobTestFiles,
		};
		for (const r of ranges) job.targets.push(`${rel}:${r.start}-${r.end}`);
		byPackage.set(pkgRoot, job);
	}
	return { jobs: [...byPackage.values()], skipped };
}

// --- running ---

function resolveConfig(pkgRoot, configArg) {
	if (configArg) return path.resolve(repoRoot, configArg);
	const local = path.join(pkgRoot, 'stryker.config.mjs');
	return existsSync(local) ? local : path.join(__dirname, 'stryker.default.mjs');
}

/**
 * Why an `--inPlace` run must not start with this config, or null when it can.
 *
 * Stryker's type-check preprocessing writes `// @ts-nocheck` into every file the
 * `disableTypeChecks` pattern matches. In place that rewrites the package on
 * disk — 3,368 tracked files for `packages/cli` — and an interrupted run leaves
 * those edits behind. Vitest transpiles without type checking, thus the
 * preprocessing buys nothing here. See DEVP-1038.
 */
export function unsafeConfigReason(config) {
	return config?.disableTypeChecks === false
		? null
		: 'it does not set `disableTypeChecks: false`. Stryker would rewrite every ' +
				'matched file in the package with `// @ts-nocheck`, and an interrupted ' +
				'run would leave those edits in the working tree';
}

// Read the resolved config so the wrapper can check the invariants an in-place
// run depends on.
async function loadConfig(configPath) {
	try {
		if (configPath.endsWith('.json')) return JSON.parse(readFileSync(configPath, 'utf8'));
		return (await import(pathToFileURL(configPath).href)).default ?? {};
	} catch (err) {
		return die(2, `Could not read ${path.relative(repoRoot, configPath)}: ${err.message}`);
	}
}

// Try the package's own copy first, then the root devDep. A package that pins
// Stryker thus gets the version it pinned. A miss is a broken checkout, not a
// red gate: exit 3 keeps it distinct from a score of zero.
function resolveStrykerBin(pkgRoot, packageDir) {
	for (const from of [path.join(pkgRoot, 'package.json'), import.meta.url]) {
		try {
			const resolved = createRequire(from).resolve('@stryker-mutator/core/package.json');
			return path.join(path.dirname(resolved), 'bin/stryker.js');
		} catch {
			continue;
		}
	}
	return die(
		3,
		`Could not resolve @stryker-mutator/core from ${packageDir} or the repo root. ` +
			'Run `pnpm install` — it is a root devDep.',
	);
}

// Runs use `--inPlace`, because the sandbox copy breaks each package whose
// vitest config finds a workspace dependency through a path alias. The alias
// does not stay correct in the copy. See the README for the failure.
//
// Stryker restores the files after a usual exit and after SIGINT, but not after
// a crash. In diff mode the files hold uncommitted work, thus `git checkout --`
// is not a safe undo. Keep a copy of the bytes and write them back instead.
export function snapshotFiles(absPaths) {
	const snap = new Map();
	for (const p of absPaths) {
		try {
			snap.set(p, readFileSync(p));
		} catch {
			// The file is unreadable. There is nothing to restore.
		}
	}
	return snap;
}

export function restoreFiles(snap) {
	const restored = [];
	for (const [p, original] of snap) {
		try {
			if (!readFileSync(p).equals(original)) {
				writeFileSync(p, original);
				restored.push(path.relative(repoRoot, p));
			}
		} catch {
			// The file is gone. There is nothing to restore.
		}
	}
	return restored;
}

// The vitest runner writes one `stryker-setup-<worker>.js` into the run cwd per
// worker and deletes it only when the runner disposes. A crash or a stop during
// cleanup leaves them in the package dir, where they are not gitignored.
export function isStrykerSetupFile(name) {
	return /^stryker-setup-.+\.js$/.test(name);
}

export function removeStrykerSetupFiles(dir) {
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return []; // The dir is gone. There is nothing to remove.
	}
	const removed = [];
	for (const name of entries) {
		if (!isStrykerSetupFile(name)) continue;
		try {
			rmSync(path.join(dir, name), { force: true });
			removed.push(name);
		} catch {
			// Another process removed it first.
		}
	}
	return removed;
}

/**
 * Undo everything an in-place run can leave behind, whatever the outcome:
 * a pass, a failure, a timeout, or an external stop during Stryker's own
 * cleanup. Restores the snapshotted bytes and drops the generated setup files.
 */
export function cleanUpAfterRun(snap, pkgRoot) {
	return { restored: restoreFiles(snap), removed: removeStrykerSetupFiles(pkgRoot) };
}

async function runJob({ pkgRoot, packageDir, targets, testFiles = [] }, { configArg }) {
	const configPath = resolveConfig(pkgRoot, configArg);
	const unsafe = unsafeConfigReason(await loadConfig(configPath));
	if (unsafe) {
		die(2, `Cannot run ${path.relative(repoRoot, configPath)} in place: ${unsafe}.`);
	}
	const strykerBin = resolveStrykerBin(pkgRoot, packageDir);
	const mutateArg = formatMutateArg(targets);

	const reportDir = path.join(pkgRoot, 'reports/mutation');
	const rawJsonPath = path.join(reportDir, 'raw.json');
	const summaryJsonPath = path.join(reportDir, 'summary.json');
	await mkdir(reportDir, { recursive: true });

	// Delete the previous reports first. The code below reads "raw.json exists"
	// as "this run wrote a report". A file from an earlier run makes a crashed
	// run report the earlier target and its score, and it also hides the
	// no-covering-tests result. After this, a report on disk is always this run's.
	await Promise.all([rm(rawJsonPath, { force: true }), rm(summaryJsonPath, { force: true })]);

	process.stderr.write(
		`\nRunning Stryker on ${packageDir} — ${targets.length} target(s)` +
			`${testFiles.length > 0 ? `, ${testFiles.length} test file(s)` : ''} ` +
			`(config: ${path.relative(repoRoot, configPath)}, threshold: ${THRESHOLD}%)\n`,
	);

	// Snapshot the targets and the explicit test files: with `disableTypeChecks`
	// off these are the only files an in-place run writes to.
	const snap = snapshotFiles([
		...new Set([
			...targets.map((t) => path.join(pkgRoot, splitRange(t).file)),
			...testFiles.filter((f) => !isGlobPattern(f)).map((f) => path.join(pkgRoot, f)),
		]),
	]);

	const strykerOutputChunks = [];
	let child;
	const onSignal = () => {
		child?.kill('SIGINT');
	};
	process.on('SIGINT', onSignal);
	process.on('SIGTERM', onSignal);
	let strykerExitCode;
	try {
		strykerExitCode = await new Promise((resolve) => {
			child = spawn(
				process.execPath,
				buildStrykerArgs({ strykerBin, configPath, mutateArg, testFiles }),
				{ cwd: pkgRoot, stdio: ['inherit', 'pipe', 'pipe'] },
			);
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
	} finally {
		process.off('SIGINT', onSignal);
		process.off('SIGTERM', onSignal);
		const { restored, removed } = cleanUpAfterRun(snap, pkgRoot);
		if (restored.length > 0) {
			process.stderr.write(
				`⚠ Stryker left mutants behind; restored ${restored.length} file(s): ${restored.join(', ')}\n`,
			);
		}
		if (removed.length > 0) {
			process.stderr.write(
				`  removed ${removed.length} generated setup file(s) in ${packageDir}\n`,
			);
		}
	}
	const strykerOutput = Buffer.concat(strykerOutputChunks).toString('utf8');
	const target = mutateArg;

	const outcome = classifyRun({
		exitCode: strykerExitCode,
		output: strykerOutput,
		hasReport: existsSync(rawJsonPath),
	});

	if (outcome === 'failed') {
		process.stderr.write(
			`✗ ${packageDir}: Stryker exited ${strykerExitCode} without producing ` +
				`${path.relative(repoRoot, rawJsonPath)}\n`,
		);
		return { packageDir, summaryJsonPath, failed: true };
	}

	if (outcome === 'no-tests') {
		const mutantMatch = strykerOutput.match(
			/Instrumented\s+\d+\s+source file\(s\)\s+with\s+(\d+)\s+mutant/i,
		);
		const summary = buildNoTestsSummary({
			threshold: THRESHOLD,
			target,
			noCoverage: mutantMatch ? Number(mutantMatch[1]) : 0,
			generatedAt: new Date().toISOString(),
			testFiles,
		});
		await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));
		return { packageDir, summaryJsonPath, summary, noTests: true };
	}

	const raw = JSON.parse(await readFile(rawJsonPath, 'utf8'));
	const summary = buildSummary(raw, {
		threshold: THRESHOLD,
		target,
		generatedAt: new Date().toISOString(),
		testFiles,
	});
	if (outcome === 'partial') summary.partial = true;

	await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));
	return { packageDir, summaryJsonPath, summary };
}

function reportJob({ packageDir, summaryJsonPath, summary, noTests, failed }) {
	if (failed) return;
	if (noTests) {
		process.stderr.write(
			`✗ ${packageDir} ${summary.target}  0.00%  (no covering tests — recorded as score-0 red)\n`,
		);
		process.stderr.write(`  summary: ${path.relative(repoRoot, summaryJsonPath)}\n`);
		return;
	}
	if (summary.partial) {
		process.stderr.write(
			`⚠ ${packageDir}: Stryker exited non-zero; summary built from a partial raw.json — ` +
				'results may be incomplete.\n',
		);
	}
	for (const f of summary.files) {
		const mark = f.thresholdMet ? '✓' : '✗';
		process.stderr.write(
			`${mark} ${f.file}  ${f.score.toFixed(2)}%  cov ${(f.coverage * 100).toFixed(0)}%  ` +
				`(killed ${f.counts.killed} / survived ${f.counts.survived} / no-cov ${f.counts.noCoverage} / timeout ${f.counts.timeout} / ignored ${f.counts.ignored})\n`,
		);
		for (const s of f.survivors) {
			process.stderr.write(
				`   - ${s.status.toLowerCase().padEnd(10)} ${s.mutator.padEnd(22)} ${s.location}\n`,
			);
		}
		for (const ig of f.ignored) {
			process.stderr.write(
				`   · ${'ignored'.padEnd(10)} ${ig.mutator.padEnd(22)} ${ig.location}` +
					`${ig.reason ? ` — ${ig.reason}` : ' — (no reason given)'}\n`,
			);
		}
	}
	process.stderr.write(`  summary: ${path.relative(repoRoot, summaryJsonPath)}\n`);
}

// --- entry point ---

const USAGE = `Usage:
  node scripts/mutation-health/mutate.mjs <file>[:<start>-<end>] [--package-dir <dir>] [--test-file <path>] [--config <path>]
  node scripts/mutation-health/mutate.mjs --diff [--base <ref>] [--test-file <path>] [--config <path>]

  # one file, whole
  node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts
  # one file, only lines 40-75
  node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts:40-75
  # package-relative target
  node scripts/mutation-health/mutate.mjs src/cron.ts --package-dir packages/workflow
  # only the named tests have to kill the mutants (required for packages/cli)
  node scripts/mutation-health/mutate.mjs packages/cli/src/credentials/external-secrets.utils.ts:32-68 \\
    --test-file packages/cli/src/credentials/__tests__/external-secrets.utils.test.ts
  # every line this branch changed, batched one Stryker run per package
  node scripts/mutation-health/mutate.mjs --diff --base origin/master`;

function planFromTarget(targetArg, packageDirArg, testFileArgs) {
	const { file, range } = splitRange(targetArg);

	let pkgRoot;
	let rel;
	if (packageDirArg) {
		pkgRoot = path.resolve(repoRoot, packageDirArg);
		if (!existsSync(pkgRoot)) die(2, `Package dir not found: ${pkgRoot}`);
		rel = path.isAbsolute(file) ? path.relative(pkgRoot, file) : file;
	} else {
		const abs = path.resolve(repoRoot, file);
		if (!existsSync(abs)) die(2, `Target not found: ${abs}\n${USAGE}`);
		pkgRoot = findPackageRoot(abs);
		if (!pkgRoot) die(2, `Could not infer the package for ${file} — pass --package-dir.\n${USAGE}`);
		rel = path.relative(pkgRoot, abs);
	}

	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		die(2, `Target must live inside the package. Got: ${rel}`);
	}
	if (!existsSync(path.join(pkgRoot, rel))) {
		die(2, `Target not found: ${path.join(pkgRoot, rel)}`);
	}
	if (!isMutableSource(rel)) {
		die(2, `Not a mutable source file (test/declaration/config/build output): ${rel}`);
	}

	const packageDir = path.relative(repoRoot, pkgRoot);
	const testFiles = normalizeTestFiles(testFileArgs, packageDir);
	for (const testFile of testFiles) {
		if (isGlobPattern(testFile)) continue; // Stryker resolves and warns on a miss
		if (!existsSync(path.join(pkgRoot, testFile))) {
			die(2, `Test file not found: ${path.join(packageDir, testFile)}`);
		}
	}

	// --diff skips an ineligible package. A named target must refuse for the same
	// reason, or it starts a run that is known to crash.
	const reason = ineligibleReason(pkgRoot, testFiles);
	if (reason) die(2, `Cannot mutate ${rel}: ${reason}`);

	return { pkgRoot, packageDir, targets: [range ? `${rel}:${range}` : rel], testFiles };
}

async function main() {
	const argv = process.argv.slice(2);
	let packageDirArg;
	let configArg;
	let targetArg;
	let baseArg = 'origin/master';
	let diffMode = false;
	const testFileArgs = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--package-dir') packageDirArg = argv[++i];
		else if (a === '--config') configArg = argv[++i];
		else if (a === '--base') baseArg = argv[++i];
		else if (a === '--test-file') testFileArgs.push(argv[++i] ?? '');
		else if (a === '--diff') diffMode = true;
		else if (!a.startsWith('--') && targetArg === undefined) targetArg = a;
	}

	if (diffMode && targetArg) die(2, `--diff takes no positional target.\n${USAGE}`);
	if (!diffMode && !targetArg) die(2, `Missing mutate target.\n${USAGE}`);

	let jobs;
	let skipped = [];
	if (diffMode) {
		({ jobs, skipped } = planFromDiff(baseArg, testFileArgs));
		for (const [file, why] of skipped) process.stderr.write(`  skipped ${file} — ${why}\n`);
		if (jobs.length === 0) {
			process.stderr.write(`\nNothing mutable changed vs ${baseArg}.\n`);
			process.exit(0);
		}
		const files = jobs.reduce((n, j) => n + j.targets.length, 0);
		process.stderr.write(
			`\nMutating ${files} changed range(s) across ${jobs.length} package(s) vs ${baseArg}.\n`,
		);
	} else {
		jobs = [planFromTarget(targetArg, packageDirArg, testFileArgs)];
	}

	const results = [];
	for (const job of jobs) {
		results.push(await runJob(job, { configArg }));
	}

	process.stderr.write('\n=== Mutation summary ===\n');
	for (const r of results) reportJob(r);

	if (results.some((r) => r.failed)) {
		process.stderr.write('\nGate: ERROR — at least one Stryker run produced no report.\n');
		process.exit(3);
	}

	// A partial run never passes. The mutants it did not test can be survivors.
	const overall = results.reduce(
		(acc, r) => {
			const c = r.summary.overall.counts;
			acc.survived += c.survived + c.noCoverage;
			acc.ignored += c.ignored;
			acc.passed &&= r.summary.overall.thresholdMet && !r.summary.partial;
			acc.partial ||= Boolean(r.summary.partial);
			return acc;
		},
		{ survived: 0, ignored: 0, passed: true, partial: false },
	);

	const gateState = overall.passed ? 'PASS' : overall.partial ? 'FAIL (partial)' : 'FAIL';
	process.stderr.write(
		`\nGate: ${gateState}  •  threshold: ${THRESHOLD}%  •  ` +
			`unjustified survivors: ${overall.survived}  •  ignored (justified): ${overall.ignored}\n`,
	);
	process.exit(overall.passed ? 0 : 1);
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
	await main();
}
