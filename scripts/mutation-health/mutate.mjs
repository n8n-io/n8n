#!/usr/bin/env node
/**
 * Run Stryker over a workspace package and write an actionable summary. This
 * script works for any package. Run it as `pnpm mutate` from the repo root.
 *
 *   pnpm mutate <file>[:<start>-<end>] [--package-dir <dir>] [--config <path>]
 *                                     [--test-files <path>[,<path>…]]
 *   pnpm mutate --diff [--base <ref>] [--config <path>]
 *
 * Use `--diff` before you merge. It reads the changed line ranges from
 * `git diff -U0 $(git merge-base <base> HEAD)`, which covers committed branch
 * work and uncommitted edits. It mutates only those lines, in one Stryker run
 * per package. This makes the gate apply to the patch: it scores the lines you
 * changed, not the debt you inherited.
 *
 * Use `--test-files` to name the test files that must kill the mutants. The
 * value goes to Stryker's `testFiles` config field, thus Stryker runs those
 * files instead of the whole related-test graph. The flag repeats and it also
 * takes a comma-separated list. `packages/cli` requires it — see
 * `cliScopeError` below.
 *
 * Stryker config resolution (first match wins):
 *   1. --config <path>                         explicit override
 *   2. <package-dir>/stryker.config.mjs        package-local (e.g. workflow's vm carve-out)
 *   3. scripts/mutation-health/stryker.cli.mjs       packages/cli only (related-test
 *                                              discovery off — see stryker.cli.mjs)
 *   4. scripts/mutation-health/stryker.default.mjs   shared default (points at the
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
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
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
export function buildSummary(raw, { threshold, target, generatedAt }) {
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
export function buildNoTestsSummary({ threshold, target, noCoverage, generatedAt }) {
	const counts = { ...emptyCounts(), noCoverage };
	const coverage = coverageFromCounts(counts);
	return {
		generatedAt,
		threshold,
		target,
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

export function splitRange(target) {
	const m = /^(.*):(\d+)-(\d+)$/.exec(target);
	return m ? { file: m[1], range: `${m[2]}-${m[3]}` } : { file: target, range: null };
}

// --- explicit test-file scoping (pure helpers exported for the unit tests) ---

// `packages/cli` forks a process per test file and runs a global setup, thus
// Stryker's related-test discovery pulls in hundreds of files and no run
// finishes inside the timeout. An explicit `--test-files` list is required
// there, and the shared default config is swapped for the cli one.
export const CLI_PACKAGE_DIR = 'packages/cli';

// Path comparisons in this file are posix-shaped. `path.relative` gives
// backslashes on Windows, so normalise before matching a package dir.
function toPosix(p) {
	return p.split(path.sep).join('/');
}

/**
 * Flatten the raw `--test-files` values into one list. The flag repeats and
 * each value also takes a comma-separated list, thus `--test-files a,b` and
 * `--test-files a --test-files b` mean the same thing. Blanks are dropped and
 * duplicates collapse, so a repeated path never runs its file twice.
 */
export function parseTestFiles(values) {
	const out = [];
	for (const value of values) {
		for (const part of String(value).split(',')) {
			const file = part.trim();
			if (file && !out.includes(file)) out.push(file);
		}
	}
	return out;
}

/**
 * Stryker matches `testFiles` patterns against the files under its run cwd,
 * which is the package dir. A repo-relative path (what the user types, and
 * what `--diff` prints) therefore has to lose its package prefix. A path that
 * is already package-relative, and a glob, both pass through untouched.
 */
export function toPackageRelative(file, packageDir) {
	const normalised = toPosix(file).replace(/^\.\//, '');
	const prefix = `${toPosix(packageDir)}/`;
	return normalised.startsWith(prefix) ? normalised.slice(prefix.length) : normalised;
}

/**
 * The Stryker config fields this run overrides on top of the resolved config
 * file. Stryker merges its CLI options into the config object it runs with,
 * thus every field here lands in that object.
 */
export function buildStrykerConfig({ targets, testFiles = [] }) {
	const config = { mutate: [...targets] };
	if (testFiles.length > 0) config.testFiles = [...testFiles];
	return config;
}

// Turn the config overrides into Stryker CLI flags. Stryker keeps only the last
// occurrence of a repeated flag, thus every list field goes over comma-joined.
export function strykerCliArgs(config) {
	return Object.entries(config).flatMap(([field, value]) => [
		`--${field}`,
		Array.isArray(value) ? value.join(',') : String(value),
	]);
}

// Why a cli target may not run, or null when it may. Named so the message says
// what to do, not only what went wrong.
export function cliScopeError(packageDir, testFiles) {
	if (toPosix(packageDir) !== CLI_PACKAGE_DIR) return null;
	if (testFiles.length > 0) return null;
	return (
		`Mutating ${CLI_PACKAGE_DIR} needs --test-files.\n` +
		'Without it Stryker discovers every related test file in the package, forks a ' +
		'process for each one and never finishes. Name the test files that cover the target:\n' +
		'  pnpm mutate packages/cli/src/foo.ts:10-40 --test-files packages/cli/src/__tests__/foo.test.ts'
	);
}

// Which shared config a package gets when it ships none of its own.
export function defaultConfigNameFor(packageDir) {
	return toPosix(packageDir) === CLI_PACKAGE_DIR ? 'stryker.cli.mjs' : 'stryker.default.mjs';
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

// Why a package cannot be scored, or null when it can. Both planners call this,
// so a named target and a --diff target always get the same answer.
function ineligibleReason(pkgRoot) {
	const pkgName = packageNameOf(pkgRoot) || path.relative(repoRoot, pkgRoot);
	if (BLOCKED_PACKAGES.has(packageNameOf(pkgRoot))) {
		return `${pkgName} is blocked: the isolated-vm engine crashes Stryker's dry run (DEVP-257)`;
	}
	if (!packageUsesVitest(pkgRoot)) return `${pkgName} is not a vitest package`;
	return null;
}

function planFromDiff(base) {
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
		const reason = ineligibleReason(pkgRoot);
		if (reason) {
			skipped.push([file, reason]);
			continue;
		}

		const ranges = parseHunkRanges(git(['diff', '-U0', from, '--', file]).stdout);
		if (ranges.length === 0) continue;

		const rel = path.relative(pkgRoot, abs);
		const packageDir = path.relative(repoRoot, pkgRoot);
		const job = byPackage.get(pkgRoot) ?? { pkgRoot, packageDir, targets: [] };
		for (const r of ranges) job.targets.push(`${rel}:${r.start}-${r.end}`);
		byPackage.set(pkgRoot, job);
	}
	return { jobs: [...byPackage.values()], skipped };
}

// --- running ---

function resolveConfig(pkgRoot, configArg) {
	if (configArg) return path.resolve(repoRoot, configArg);
	const local = path.join(pkgRoot, 'stryker.config.mjs');
	if (existsSync(local)) return local;
	return path.join(__dirname, defaultConfigNameFor(path.relative(repoRoot, pkgRoot)));
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

// --- working-tree snapshot and cleanup ---
//
// Runs use `--inPlace`, because the sandbox copy breaks each package whose
// vitest config finds a workspace dependency through a path alias. The alias
// does not stay correct in the copy. See the README for the failure.
//
// Stryker restores the files after a usual exit and after SIGINT, but not after
// a crash, a timeout, or a SIGTERM. Its preprocessing also reaches past the
// mutate targets: it instruments the related test graph and drops a
// `stryker-setup-<worker>.js` in the run cwd. A target-only snapshot therefore
// left mutated files and setup files behind. Snapshot the whole working tree
// instead, and run one cleanup routine on every exit path.

// Glob `stryker-setup-*.js`, anchored to one path segment.
const STRYKER_SETUP_FILE = /^stryker-setup-[^/\\]*\.js$/;

// Directories the walk never enters. `node_modules` alone makes a full-repo
// walk take minutes, and none of these hold working-tree state to clean.
const UNWALKED_DIRS = new Set([
	'.git',
	'node_modules',
	'dist',
	'coverage',
	'.turbo',
	'.stryker-tmp',
]);

/**
 * Every `stryker-setup-*.js` under `root`. The vitest runner writes one for
 * each worker into the run cwd and does not always remove it, thus the search
 * covers the whole repo, not only the package dir Stryker ran in.
 */
export function findStrykerSetupFiles(root) {
	const found = [];
	const queue = [root];
	while (queue.length > 0) {
		const dir = queue.pop();
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			continue; // unreadable directory — nothing to collect
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (!UNWALKED_DIRS.has(entry.name)) queue.push(full);
			} else if (STRYKER_SETUP_FILE.test(entry.name)) {
				found.push(full);
			}
		}
	}
	return found;
}

/** Delete every `stryker-setup-*.js` under `root`. Returns the paths removed. */
export function removeStrykerSetupFiles(root) {
	const removed = [];
	for (const file of findStrykerSetupFiles(root)) {
		try {
			unlinkSync(file);
			removed.push(file);
		} catch {
			// Already gone. There is nothing to remove.
		}
	}
	return removed;
}

/** Keep the exact bytes of each path, so a restore never needs git. */
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

/** Write the snapshot back where it differs. Returns the paths restored. */
export function restoreFiles(snap) {
	const restored = [];
	for (const [p, original] of snap) {
		try {
			if (!readFileSync(p).equals(original)) {
				writeFileSync(p, original);
				restored.push(p);
			}
		} catch {
			// The file is gone. There is nothing to restore.
		}
	}
	return restored;
}

/**
 * Tracked files that were clean before the run and are dirty after it. Stryker
 * changed them, and git holds their pre-run state, thus `git checkout --` is
 * the correct undo. A file that was already dirty is excluded: it carries the
 * user's own uncommitted work, which the byte snapshot restores instead.
 */
export function filesToCheckout(dirtyBefore, dirtyAfter) {
	const before = new Set(dirtyBefore);
	return dirtyAfter.filter((f) => !before.has(f));
}

/**
 * The one cleanup routine every exit path shares: restore the working tree,
 * then delete the `stryker-setup-*.js` files. Idempotent — the normal path, a
 * crash, SIGINT and SIGTERM all call it, and only the first call does the work.
 * A failing restore must not keep the setup files on disk, so each half is
 * guarded on its own.
 */
export function createCleanup({ restore, removeSetupFiles, report }) {
	let result;
	return function cleanup() {
		if (result) return result;
		result = { restored: [], removed: [] };
		try {
			result.restored = restore() ?? [];
		} catch {
			// Report what the second half did even when the restore fails.
		}
		try {
			result.removed = removeSetupFiles() ?? [];
		} catch {
			// Nothing more to clean.
		}
		report?.(result);
		return result;
	};
}

/**
 * Wire `cleanup` onto every exit path: the usual one (`exit`), a crash
 * (`uncaughtException`), and a cancellation (`SIGINT` / `SIGTERM`).
 *
 * `onSignal` gets first refusal on a signal. It returns true when it told a
 * live Stryker to stop; the run then unwinds and cleans up once the child is
 * gone, because a restore that races Stryker's own writes fixes nothing.
 * Otherwise this handler cleans up and leaves at once.
 *
 * `proc`, `exit` and `write` are injected so the unit tests can drive the
 * handlers without signalling or ending the test runner.
 */
export function registerCleanupHandlers({
	cleanup,
	onSignal,
	proc = process,
	exit = (code) => process.exit(code),
	write = (msg) => process.stderr.write(msg),
}) {
	const handleExit = () => cleanup();
	const handleUncaught = (err) => {
		cleanup();
		write(`\n✗ mutate.mjs crashed: ${err?.stack ?? err}\n`);
		exit(3);
	};
	const handleSignal = (signal) => {
		if (onSignal?.(signal)) return;
		cleanup();
		exit(signal === 'SIGTERM' ? 143 : 130);
	};
	const handleSigint = () => handleSignal('SIGINT');
	const handleSigterm = () => handleSignal('SIGTERM');

	proc.on('exit', handleExit);
	proc.on('uncaughtException', handleUncaught);
	proc.on('SIGINT', handleSigint);
	proc.on('SIGTERM', handleSigterm);

	return {
		dispose() {
			proc.off('exit', handleExit);
			proc.off('uncaughtException', handleUncaught);
			proc.off('SIGINT', handleSigint);
			proc.off('SIGTERM', handleSigterm);
		},
	};
}

// Tracked files that differ from HEAD, staged or not. Untracked files are left
// out: they have no pre-run state to go back to. This never dies — it runs
// inside the cleanup handlers, where exiting would skip the rest of the work.
function listDirtyFiles() {
	const res = spawnSync('git', ['diff', '--name-only', 'HEAD'], {
		cwd: repoRoot,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	if (res.error || res.status !== 0) return [];
	return res.stdout
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
}

// Bytes for every file that is already dirty plus the ones the run will touch,
// and the dirty set itself so the restore can tell Stryker's edits from the
// user's.
function snapshotWorkingTree(extraAbsPaths = []) {
	const dirtyBefore = listDirtyFiles();
	const paths = new Set([...dirtyBefore.map((f) => path.join(repoRoot, f)), ...extraAbsPaths]);
	return { bytes: snapshotFiles([...paths]), dirtyBefore };
}

function restoreWorkingTree({ bytes, dirtyBefore }) {
	const restored = new Set(restoreFiles(bytes).map((p) => path.relative(repoRoot, p)));
	const checkout = filesToCheckout(dirtyBefore, listDirtyFiles());
	if (checkout.length > 0) {
		const res = spawnSync('git', ['checkout', '--', ...checkout], {
			cwd: repoRoot,
			encoding: 'utf8',
		});
		if (!res.error && res.status === 0) for (const f of checkout) restored.add(f);
	}
	return [...restored];
}

async function runJob({ pkgRoot, packageDir, targets }, { configArg, testFiles = [] }) {
	const configPath = resolveConfig(pkgRoot, configArg);
	const strykerBin = resolveStrykerBin(pkgRoot, packageDir);
	const mutateArg = formatMutateArg(targets);
	const strykerConfig = buildStrykerConfig({
		targets,
		testFiles: testFiles.map((f) => toPackageRelative(f, packageDir)),
	});

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
		`\nRunning Stryker on ${packageDir} — ${targets.length} target(s) ` +
			`(config: ${path.relative(repoRoot, configPath)}, threshold: ${THRESHOLD}%)\n`,
	);
	if (strykerConfig.testFiles) {
		process.stderr.write(`  testFiles: ${strykerConfig.testFiles.join(', ')}\n`);
	}

	const snapshot = snapshotWorkingTree([
		...new Set(targets.map((t) => path.join(pkgRoot, splitRange(t).file))),
	]);

	const strykerOutputChunks = [];
	let child;
	let signalled;
	const cleanup = createCleanup({
		restore: () => restoreWorkingTree(snapshot),
		removeSetupFiles: () => removeStrykerSetupFiles(repoRoot),
		report: ({ restored, removed }) => {
			if (restored.length > 0) {
				process.stderr.write(
					`⚠ Stryker left changes behind; restored ${restored.length} file(s): ` +
						`${restored.join(', ')}\n`,
				);
			}
			if (removed.length > 0) {
				process.stderr.write(
					`  removed ${removed.length} stryker-setup file(s): ` +
						`${removed.map((p) => path.relative(repoRoot, p)).join(', ')}\n`,
				);
			}
		},
	});
	const handlers = registerCleanupHandlers({
		cleanup,
		onSignal: (signal) => {
			// Pass the signal to Stryker so it unwinds its own state, then let the
			// `finally` below clean up once the child is gone.
			if (!child || child.exitCode !== null || child.signalCode !== null) return false;
			signalled = signal;
			child.kill('SIGINT');
			return true;
		},
	});
	let strykerExitCode;
	try {
		strykerExitCode = await new Promise((resolve) => {
			child = spawn(
				process.execPath,
				[strykerBin, 'run', configPath, '--inPlace', ...strykerCliArgs(strykerConfig)],
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
		handlers.dispose();
		cleanup();
		// The run was cancelled. The tree is clean again, so leave with the shell's
		// code for the signal instead of reporting on a run that never finished.
		if (signalled) process.exit(signalled === 'SIGTERM' ? 143 : 130);
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
		});
		await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));
		return { packageDir, summaryJsonPath, summary, noTests: true };
	}

	const raw = JSON.parse(await readFile(rawJsonPath, 'utf8'));
	const summary = buildSummary(raw, {
		threshold: THRESHOLD,
		target,
		generatedAt: new Date().toISOString(),
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
  node scripts/mutation-health/mutate.mjs <file>[:<start>-<end>] [--package-dir <dir>] [--config <path>]
                                          [--test-files <path>[,<path>...]]
  node scripts/mutation-health/mutate.mjs --diff [--base <ref>] [--config <path>]

Options:
  --package-dir <dir>   Package the target belongs to. Inferred when omitted.
  --config <path>       Stryker config file. Overrides the resolution order.
  --base <ref>          Branch point --diff measures against. Default origin/master.
  --diff                Mutate every line this branch changed, one run per package.
  --test-files <paths>  Test files Stryker runs, instead of the whole related-test
                        graph. Goes to Stryker's testFiles config field. Comma-
                        separated, and the flag repeats. Paths may be repo-relative
                        or package-relative. Required for ${CLI_PACKAGE_DIR} targets.

  # one file, whole
  node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts
  # one file, only lines 40-75
  node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts:40-75
  # package-relative target
  node scripts/mutation-health/mutate.mjs src/cron.ts --package-dir packages/workflow
  # a cli target, scoped to the tests that must kill its mutants
  node scripts/mutation-health/mutate.mjs packages/cli/src/credentials/external-secrets.utils.ts:32-68 \\
    --test-files packages/cli/src/credentials/__tests__/external-secrets.utils.test.ts
  # every line this branch changed, batched one Stryker run per package
  node scripts/mutation-health/mutate.mjs --diff --base origin/master`;

function planFromTarget(targetArg, packageDirArg) {
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
	// --diff skips an ineligible package. A named target must refuse for the same
	// reason, or it starts a run that is known to crash.
	const reason = ineligibleReason(pkgRoot);
	if (reason) die(2, `Cannot mutate ${rel}: ${reason}`);

	return {
		pkgRoot,
		packageDir: path.relative(repoRoot, pkgRoot),
		targets: [range ? `${rel}:${range}` : rel],
	};
}

/**
 * Read the command line. Pure, so the unit tests can assert what each flag
 * parses to. Validation stays in `main`, which owns the exit codes.
 */
export function parseArgs(argv) {
	const parsed = {
		packageDirArg: undefined,
		configArg: undefined,
		targetArg: undefined,
		baseArg: 'origin/master',
		diffMode: false,
		helpMode: false,
		testFiles: [],
	};
	const rawTestFiles = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--package-dir') parsed.packageDirArg = argv[++i];
		else if (a === '--config') parsed.configArg = argv[++i];
		else if (a === '--base') parsed.baseArg = argv[++i];
		else if (a === '--test-files') rawTestFiles.push(argv[++i] ?? '');
		else if (a === '--diff') parsed.diffMode = true;
		else if (a === '--help' || a === '-h') parsed.helpMode = true;
		else if (!a.startsWith('--') && parsed.targetArg === undefined) parsed.targetArg = a;
	}
	parsed.testFiles = parseTestFiles(rawTestFiles);
	return parsed;
}

async function main() {
	const { packageDirArg, configArg, targetArg, baseArg, diffMode, helpMode, testFiles } = parseArgs(
		process.argv.slice(2),
	);

	if (helpMode) {
		process.stdout.write(`${USAGE}\n`);
		process.exit(0);
	}
	if (diffMode && targetArg) die(2, `--diff takes no positional target.\n${USAGE}`);
	if (!diffMode && !targetArg) die(2, `Missing mutate target.\n${USAGE}`);
	// --diff plans a run per package, so one test-file list cannot say which
	// package it belongs to. Refuse rather than apply it to all of them.
	if (diffMode && testFiles.length > 0) {
		die(2, `--test-files needs a single target; it does not work with --diff.\n${USAGE}`);
	}

	let jobs;
	let skipped = [];
	if (diffMode) {
		({ jobs, skipped } = planFromDiff(baseArg));
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
		jobs = [planFromTarget(targetArg, packageDirArg)];
		const scopeError = cliScopeError(jobs[0].packageDir, testFiles);
		if (scopeError) die(2, scopeError);
	}

	const results = [];
	for (const job of jobs) {
		results.push(await runJob(job, { configArg, testFiles }));
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
