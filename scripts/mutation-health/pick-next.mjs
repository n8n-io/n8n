#!/usr/bin/env node
/**
 * Walk a package's source tree (per-package mode) or every vitest-eligible
 * package's source tree (global mode), merge with the live BQ ledger snapshot,
 * return the next file(s) to mutate.
 *
 * Files present in src/ but absent from the live ledger are synthesised as
 * status='new'. No separate seed step needed — the ledger fills in
 * organically as files get scored.
 *
 * Stored statuses (from BQ): new | red | green
 * Effective statuses (computed at pick time): new | red | stale | green
 *
 * Picker priority: new → red → stale → skip green
 *
 * Per-package mode tiebreaks within each bucket:
 *   - new:    alphabetical by source_file_path
 *   - red:    lowest score first (focus on weakest tests)
 *   - stale:  oldest last_checked_at first (natural cycling)
 *
 * Global mode tiebreaks within each bucket: highest value first, where
 *   value = w_churn·churn + w_fix·fixDensity + w_cov·(1 − coverage)
 * — churn and fix-density come from `signals.mjs`, coverage from an optional
 * input file. Path used as final lexical tiebreak for determinism.
 *
 * "Stale" is an in-memory promotion of green rows older than
 * STALE_AFTER_WEEKS (default 4). Not stored.
 *
 * Inputs (per-package mode):
 *   --package-dir <path>     Required. Repo-relative path to the package, e.g. packages/workflow
 *   --ledger-file <path>     Required. Live ledger JSON: { "ledger": [ ... ] }
 *   --mode <baseline|coverage>  Optional. Restrict the picker to one bucket.
 *   --stale-after-weeks <n>  Optional. Default 4.
 *
 * Inputs (global mode):
 *   --global                 Required to enter global mode.
 *   --ledger-file <path>     Required. Live read-all ledger JSON (rows for every package).
 *   --signals-file <path>    Optional. JSON from `signals.mjs gatherSignals`.
 *   --coverage-file <path>   Optional. JSON map { "<repo-rel-path>": 0..1 } of line-coverage.
 *   --top-n <n>              Optional. Default 1. How many top-ranked rows to emit.
 *   --block <list>           Optional. Comma-separated package names to exclude from the walk.
 *   --w-churn / --w-fix-density / --w-coverage <n>  Optional. Per-signal weights for value formula.
 *   --mode <baseline|coverage>  Optional. Restrict picker to one bucket (same as per-package).
 *   --stale-after-weeks <n>  Optional. Default 4.
 *
 * Output (stdout):
 *   per-package mode →
 *     { picked: { source_file_path, package, prior_status, effective_status } }
 *     OR { picked: null, reason: "all-green" | "empty-source-tree"
 *                              | "no-new-files" | "nothing-below-threshold" }
 *   global mode →
 *     { picked: [ { source_file_path, package, prior_status, effective_status, value }, ... ] }
 *     OR { picked: [], reason: "all-green" | "empty-source-tree"
 *                              | "no-new-files" | "nothing-below-threshold" }
 *
 * Exit codes:
 *   0 — picked a row OR nothing to do (with picked: null / [] sentinel)
 *   2 — usage / config error
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { readLedger } from './ledger.mjs';

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
// Matched against either the full basename (`types.ts`) or the trailing
// dot-segment (`foo.types.ts` → `types`), so dotted-suffix declaration files
// are caught the same as their plain-named counterparts. `methods` covers
// NativeDoc `*.methods.ts` descriptor files; `schemas` covers pure Zod
// declaration files; `message-event-bus` is an exact-basename entry for a
// bulk enum + interfaces + Zod module with no function logic.
const LOW_VALUE_BASENAMES = new Set([
	'interfaces',
	'index',
	'constants',
	'types',
	'methods',
	'schemas',
	'message-event-bus',
]);

// Files with fewer than this many non-blank, non-import lines have so little
// surface area they're not worth mutating — e.g. trivial error subclasses with
// empty bodies or one hardcoded super() call. This catches what an exact-name
// list can't (`error` can't be skipped wholesale because files like
// `workflow-activation.error.ts` have real branching logic).
const MIN_MEANINGFUL_LINES = 15;

// Directories whose contents are tests/fixtures/mocks, not production code.
// Pruned in `walkSources` so we don't descend; `isMutationWorthy` re-checks as a
// safety net for packages that co-locate tests as siblings (e.g. `foo.test.ts`).
const NON_SOURCE_DIRS = new Set(['__tests__', '__mocks__', 'fixtures']);

// The vitest-eligible mutation-tracked packages. Single source of truth for
// global mode: the picker walks every entry here unless overridden via
// --block. Adding a package = one-line append here AND in
// .github/workflows/mutation-health-nightly.yml `setup` job. Jest packages
// and the isolated-vm engine (@n8n/expression-runtime, blocked on DEVP-257)
// are intentionally absent.
export const ELIGIBLE_PACKAGES = [
	{ name: 'n8n-workflow', dir: 'packages/workflow' },
	{ name: '@n8n/crdt', dir: 'packages/@n8n/crdt' },
	{ name: '@n8n/decorators', dir: 'packages/@n8n/decorators' },
];

export function isEligible(pkgName) {
	return ELIGIBLE_PACKAGES.some((p) => p.name === pkgName);
}

export const DEFAULT_WEIGHTS = Object.freeze({ churn: 1, fixDensity: 1, coverage: 1 });

/**
 * Value formula: w_churn·churn + w_fix·fixDensity + w_cov·(1 − coverage).
 *
 * Missing signals contribute 0 (no penalty, no boost). Missing coverage is
 * treated as 0 so the (1 − coverage) term becomes 1 — unknown coverage =
 * worst case = highest urge to score, matching the picker's bias toward
 * surfacing untracked files.
 */
export function computeValue(
	{ churn = 0, fixDensity = 0, coverage = 0 } = {},
	weights = DEFAULT_WEIGHTS,
) {
	const churnVal = Number.isFinite(Number(churn)) ? Number(churn) : 0;
	const fdVal = Number.isFinite(Number(fixDensity)) ? Number(fixDensity) : 0;
	const covRaw = Number(coverage);
	const covVal = Number.isFinite(covRaw) ? Math.max(0, Math.min(1, covRaw)) : 0;
	return (
		(weights.churn ?? 0) * churnVal +
		(weights.fixDensity ?? 0) * fdVal +
		(weights.coverage ?? 0) * (1 - covVal)
	);
}

/**
 * `signals` shape matches `gatherSignals`'s JSON output: churn[path] = { commits, linesChanged }
 * (or a bare number from caller transforms), fixDensity[path] = number.
 * Returns the per-row `{ churn, fixDensity, coverage }` triple used by `computeValue`.
 */
export function extractSignals(row, { signals = {}, coverage = {} } = {}) {
	const churnEntry = signals.churn?.[row.source_file_path];
	const churnVal =
		typeof churnEntry === 'number'
			? churnEntry
			: typeof churnEntry?.commits === 'number'
				? churnEntry.commits
				: 0;
	const fixDensity = signals.fixDensity?.[row.source_file_path] ?? 0;
	const cov = coverage[row.source_file_path];
	return {
		churn: churnVal,
		fixDensity,
		coverage: typeof cov === 'number' ? cov : 0,
	};
}

function countMeaningfulLines(content) {
	let count = 0;
	for (const raw of content.split('\n')) {
		const line = raw.trim();
		if (!line) continue;
		if (line.startsWith('import ')) continue;
		count++;
	}
	return count;
}

export function isMutationWorthy(absPath, { read = readFileSync } = {}) {
	if (absPath.endsWith('.d.ts')) return false;
	if (/\.(test|spec)\.ts$/.test(absPath)) return false;
	if (absPath.includes(`${path.sep}__tests__${path.sep}`)) return false;
	if (absPath.includes(`${path.sep}__mocks__${path.sep}`)) return false;
	const base = path.basename(absPath, '.ts');
	const lastSegment = base.split('.').at(-1);
	if (LOW_VALUE_BASENAMES.has(base) || LOW_VALUE_BASENAMES.has(lastSegment)) return false;
	if (countMeaningfulLines(read(absPath, 'utf8')) < MIN_MEANINGFUL_LINES) return false;
	return true;
}

export async function walkSources(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const out = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			if (NON_SOURCE_DIRS.has(e.name)) continue;
			out.push(...(await walkSources(full)));
		} else if (e.isFile() && e.name.endsWith('.ts')) {
			out.push(full);
		}
	}
	return out;
}

const PRIORITY = { new: 0, red: 1, stale: 2, green: 3 };

const MODE_BUCKETS = {
	baseline: new Set(['new']),
	coverage: new Set(['red', 'stale']),
};

export function computeEffectiveStatus(row, { now, staleAfterMs }) {
	if (row.status === 'new') return 'new';
	if (row.status === 'red') return 'red';
	if (row.last_checked_at) {
		const age = now - Date.parse(row.last_checked_at);
		if (age > staleAfterMs) return 'stale';
	}
	return 'green';
}

/**
 * Rank a flat list of (already-merged) candidate rows by bucket priority,
 * then by value formula (descending) within each bucket, with the source
 * path as the final lexical tiebreak.
 *
 * Pure function — used by both the global CLI path and the test suite.
 * Excludes any row whose package is in the `blocked` set, exits the
 * `green` bucket entirely (those are "nothing to do"), and applies the
 * optional `--mode` bucket filter.
 *
 * Returns the rows in rank order, each annotated with `effective_status`
 * and `value`. Caller decides how many to keep.
 */
export function rankCandidates(
	rows,
	{
		now,
		staleAfterMs,
		mode,
		blocked = new Set(),
		signals = {},
		coverage = {},
		weights = DEFAULT_WEIGHTS,
	} = {},
) {
	const annotated = rows
		.filter((r) => !blocked.has(r.package))
		.map((row) => {
			const effective_status = computeEffectiveStatus(row, { now, staleAfterMs });
			const signalTriple = extractSignals(row, { signals, coverage });
			return {
				...row,
				effective_status,
				value: computeValue(signalTriple, weights),
			};
		});

	const filtered = annotated.filter((r) => {
		if (r.effective_status === 'green') return false;
		if (mode && !MODE_BUCKETS[mode].has(r.effective_status)) return false;
		return true;
	});

	filtered.sort((a, b) => {
		const pa = PRIORITY[a.effective_status] ?? 99;
		const pb = PRIORITY[b.effective_status] ?? 99;
		if (pa !== pb) return pa - pb;
		if (b.value !== a.value) return b.value - a.value;
		return a.source_file_path.localeCompare(b.source_file_path);
	});

	return filtered;
}

/**
 * Synthesise a "new" row for every mutation-worthy source file that has no
 * ledger row yet, then layer the live ledger rows on top (ledger wins). Used
 * by both per-package and global walks.
 */
export function mergeWithLedger({ worthyPaths, pkgName, ledgerRows }) {
	const byPath = new Map();
	for (const row of ledgerRows) {
		if (row.package === pkgName) byPath.set(row.source_file_path, row);
	}
	return worthyPaths.map(
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
}

function parseStaleAfterWeeks(staleArg) {
	const DEFAULT = 4;
	if (staleArg === undefined) return DEFAULT;
	const parsed = Number(staleArg);
	if (Number.isFinite(parsed) && parsed > 0) return parsed;
	process.stderr.write(`Invalid --stale-after-weeks=${staleArg}, falling back to ${DEFAULT}.\n`);
	return DEFAULT;
}

function parseWeights(args) {
	const w = { ...DEFAULT_WEIGHTS };
	for (const [flag, key] of [
		['w-churn', 'churn'],
		['w-fix-density', 'fixDensity'],
		['w-coverage', 'coverage'],
	]) {
		if (args[flag] === undefined) continue;
		const parsed = Number(args[flag]);
		if (!Number.isFinite(parsed) || parsed < 0) {
			die(2, `Invalid --${flag}=${args[flag]} (expected non-negative number).`);
		}
		w[key] = parsed;
	}
	return w;
}

function parseTopN(args) {
	if (args['top-n'] === undefined) return 1;
	const parsed = Number(args['top-n']);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		die(2, `Invalid --top-n=${args['top-n']} (expected positive integer).`);
	}
	return parsed;
}

function parseBlocked(args) {
	const raw = args.block;
	if (raw === undefined || raw === true) return new Set();
	return new Set(
		String(raw)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	);
}

function resolveLedgerPath(ledgerFile) {
	return path.isAbsolute(ledgerFile) ? ledgerFile : path.join(process.cwd(), ledgerFile);
}

async function readJsonIfPresent(file) {
	if (!file) return null;
	const resolved = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
	if (!existsSync(resolved)) die(2, `File not found: ${resolved}`);
	try {
		return JSON.parse(await readFile(resolved, 'utf8'));
	} catch (err) {
		die(2, `Failed to parse JSON at ${resolved}: ${err.message}`);
	}
	return null;
}

async function collectPackageCandidates({ repoRoot, pkg }) {
	const srcDir = path.join(repoRoot, pkg.dir, 'src');
	if (!existsSync(srcDir)) return null;
	const allSources = (await walkSources(srcDir)).sort();
	const worthy = allSources
		.filter((p) => isMutationWorthy(p))
		.map((abs) => path.relative(repoRoot, abs));
	return { pkg, worthy };
}

async function runGlobal({ args, repoRoot, now }) {
	const ledgerFile = args['ledger-file'];
	if (!ledgerFile) die(2, 'Missing required --ledger-file <path>');
	const ledgerPath = resolveLedgerPath(ledgerFile);
	if (!existsSync(ledgerPath)) die(2, `Ledger file not found: ${ledgerPath}`);

	const mode = args.mode;
	if (mode !== undefined && mode !== true && !Object.hasOwn(MODE_BUCKETS, mode)) {
		die(2, `Invalid --mode=${mode}. Use 'baseline' or 'coverage' (omit for combined).`);
	}
	const modeArg = mode === true ? undefined : mode;

	const staleAfterWeeks = parseStaleAfterWeeks(args['stale-after-weeks']);
	const staleAfterMs = staleAfterWeeks * 7 * 24 * 60 * 60 * 1000;
	const topN = parseTopN(args);
	const blocked = parseBlocked(args);
	const weights = parseWeights(args);

	let liveLedger;
	try {
		({ rows: liveLedger } = await readLedger({ path: ledgerPath }));
	} catch (err) {
		die(2, err.message);
	}

	const signals = (await readJsonIfPresent(args['signals-file'])) ?? { churn: {}, fixDensity: {} };
	const coverage = (await readJsonIfPresent(args['coverage-file'])) ?? {};

	const eligible = ELIGIBLE_PACKAGES.filter((p) => !blocked.has(p.name));
	const merged = [];
	for (const pkg of eligible) {
		const collected = await collectPackageCandidates({ repoRoot, pkg });
		if (!collected) {
			process.stderr.write(`No src/ for ${pkg.name} at ${pkg.dir}; skipping.\n`);
			continue;
		}
		merged.push(
			...mergeWithLedger({
				worthyPaths: collected.worthy,
				pkgName: pkg.name,
				ledgerRows: liveLedger,
			}),
		);
	}

	if (merged.length === 0) {
		process.stderr.write('No mutation-worthy source files found across eligible packages.\n');
		process.stdout.write(JSON.stringify({ picked: [], reason: 'empty-source-tree' }) + '\n');
		process.exit(0);
	}

	const ranked = rankCandidates(merged, {
		now,
		staleAfterMs,
		mode: modeArg,
		blocked,
		signals,
		coverage,
		weights,
	});

	const counts = ranked.reduce((acc, r) => {
		acc[r.effective_status] = (acc[r.effective_status] ?? 0) + 1;
		return acc;
	}, {});
	process.stderr.write(
		`Global walk: candidates=${merged.length} ranked=${ranked.length}  •  ` +
			`new=${counts.new ?? 0} red=${counts.red ?? 0} stale=${counts.stale ?? 0}\n`,
	);

	if (ranked.length === 0) {
		const reason =
			modeArg === 'baseline'
				? 'no-new-files'
				: modeArg === 'coverage'
					? 'nothing-below-threshold'
					: 'all-green';
		process.stderr.write(`Nothing to do for mode=${modeArg ?? 'combined'} (${reason}).\n`);
		process.stdout.write(JSON.stringify({ picked: [], reason }) + '\n');
		process.exit(0);
	}

	const top = ranked.slice(0, topN).map((r) => ({
		source_file_path: r.source_file_path,
		package: r.package,
		prior_status: r.status,
		effective_status: r.effective_status,
		value: r.value,
	}));

	for (const t of top) {
		process.stderr.write(
			`Picked: ${t.source_file_path}  ` +
				`[${t.package}]  priority=${t.effective_status}  value=${t.value.toFixed(4)}\n`,
		);
	}

	process.stdout.write(JSON.stringify({ picked: top }) + '\n');
}

async function runPerPackage({ args, repoRoot, now }) {
	const pkgDirArg = args['package-dir'];
	const ledgerFile = args['ledger-file'];
	if (!pkgDirArg) die(2, 'Missing required --package-dir <relative-path-to-package>');
	if (!ledgerFile) die(2, 'Missing required --ledger-file <path>');

	const pkgDir = path.isAbsolute(pkgDirArg) ? pkgDirArg : path.join(repoRoot, pkgDirArg);
	if (!existsSync(pkgDir)) die(2, `Package dir not found: ${pkgDir}`);

	const pkgJsonPath = path.join(pkgDir, 'package.json');
	if (!existsSync(pkgJsonPath)) die(2, `No package.json at ${pkgJsonPath}`);
	const pkgName = JSON.parse(await readFile(pkgJsonPath, 'utf8')).name;

	const srcDir = path.join(pkgDir, 'src');
	if (!existsSync(srcDir)) die(2, `No src/ in ${pkgDir}`);

	const ledgerPath = resolveLedgerPath(ledgerFile);
	if (!existsSync(ledgerPath)) die(2, `Ledger file not found: ${ledgerPath}`);

	const staleAfterWeeks = parseStaleAfterWeeks(args['stale-after-weeks']);
	const staleAfterMs = staleAfterWeeks * 7 * 24 * 60 * 60 * 1000;

	// One read returns every row across every package; we narrow to this
	// package's rows internally so the picker's per-package behaviour is
	// preserved whether the file holds one package or many.
	let liveLedger;
	try {
		({ rows: liveLedger } = await readLedger({ path: ledgerPath, pkg: pkgName }));
	} catch (err) {
		die(2, err.message);
	}

	const allSources = (await walkSources(srcDir)).sort();
	const worthy = allSources
		.filter((p) => isMutationWorthy(p))
		.map((abs) => path.relative(repoRoot, abs));

	if (worthy.length === 0) {
		process.stderr.write('No mutation-worthy source files found under src/.\n');
		process.stdout.write(JSON.stringify({ picked: null, reason: 'empty-source-tree' }) + '\n');
		process.exit(0);
	}

	const merged = mergeWithLedger({ worthyPaths: worthy, pkgName, ledgerRows: liveLedger });

	const annotated = merged.map((row) => ({
		...row,
		effective_status: computeEffectiveStatus(row, { now, staleAfterMs }),
	}));

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

	const mode = args.mode;
	if (mode !== undefined && mode !== true && !Object.hasOwn(MODE_BUCKETS, mode)) {
		die(
			2,
			`Invalid --mode=${mode}. Use 'baseline' or 'coverage' (omit for combined new→red→stale).`,
		);
	}
	const modeArg = mode === true ? undefined : mode;
	const candidates = modeArg
		? annotated.filter((r) => MODE_BUCKETS[modeArg].has(r.effective_status))
		: annotated;

	const top = candidates[0];

	if (!top || (!modeArg && top.effective_status === 'green')) {
		const reason =
			modeArg === 'baseline'
				? 'no-new-files'
				: modeArg === 'coverage'
					? 'nothing-below-threshold'
					: 'all-green';
		process.stderr.write(`Nothing to do for mode=${modeArg ?? 'combined'} (${reason}).\n`);
		process.stdout.write(JSON.stringify({ picked: null, reason }) + '\n');
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
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
	const args = parseArgs(process.argv.slice(2));
	const repoRoot = path.resolve(
		execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
	);
	const now = Date.now();
	if (args.global) {
		await runGlobal({ args, repoRoot, now });
	} else {
		await runPerPackage({ args, repoRoot, now });
	}
}
