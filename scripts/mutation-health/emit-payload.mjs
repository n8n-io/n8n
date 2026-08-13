#!/usr/bin/env node
/**
 * Emit a BQ payload from a mutate.mjs summary.json.
 *
 * Input:  packages/<pkg>/reports/mutation/summary.json (from `pnpm mutate <file>`)
 * Output: JSON document with two keys, `ledger` (rows for qa_mutation_health_ledger)
 *         and `events` (rows for qa_performance_metrics, benchmark_name="mutation_health").
 *
 * Each ledger row carries all three of the global picker's value-formula terms:
 *
 *   coverage     — the scored file's coverage fraction (clamped to [0,1])
 *                  written back by mutate.mjs, used as the `(1 − coverage)`
 *                  term (DEVP-496).
 *   churn        — commit count touching the source file within a recent
 *                  window, derived here from git, used as the `churn` term
 *                  (DEVP-546).
 *   fix_density  — the file's time-decayed, delta-weighted fix-density (the
 *                  same git-derived signal `signals.mjs` computes), used as the
 *                  `fix_density` term (DEVP-546).
 *
 * (A richer fix-density variant joined against the bug taxonomy is a possible
 * future enhancement on the writer side, but the git-derived signal here is
 * what feeds the picker's value formula.)
 *
 * The output is what the n8n writer workflow consumes via webhook. This script
 * intentionally does NOT call BigQuery directly — the writer workflow owns
 * BQ credentials and the MERGE statement for the ledger upsert.
 *
 * Usage:
 *   node scripts/mutation-health/emit-payload.mjs \
 *     --summary packages/workflow/reports/mutation/summary.json \
 *     --package n8n-workflow \
 *     [--signals <path>]                  # signals.json from `signals.mjs gatherSignals`
 *                                         # (the setup job's full-history signals). When
 *                                         # present, churn/fix_density are read from it per
 *                                         # file instead of computed from git — the only
 *                                         # path that works under the mutate job's shallow
 *                                         # clone, and keeps stored values consistent with
 *                                         # what the picker ranked on.
 *     [--churn-window "90 days"]          # git approxidate for the churn count (git fallback only)
 *     [--fix-density-window "1 year"]     # git approxidate bounding the fix-density log read (git fallback only)
 *     [--fix-density-half-life 90]        # half-life in days for the fix-density decay (git fallback only)
 *     [--out <path>]                      # default: <pkg>/reports/mutation/bq-payload.json
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
	GIT_LOG_FORMAT,
	parseGitLog,
	computeFixDensity,
	DEFAULT_HALF_LIFE_DAYS,
} from './signals.mjs';

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

/**
 * Coverage fraction for a summary file row, clamped to [0,1]. Prefers the
 * `coverage` mutate.mjs wrote back; falls back to deriving it from the mutant
 * counts for summaries produced before the writeback existed. Returns null only
 * when neither source is usable, so the ledger column degrades gracefully.
 */
export function coverageForLedger(f) {
	if (typeof f.coverage === 'number' && Number.isFinite(f.coverage)) {
		return +Math.min(1, Math.max(0, f.coverage)).toFixed(4);
	}
	const c = f.counts;
	if (!c) return null;
	const covered = (c.killed ?? 0) + (c.survived ?? 0) + (c.timeout ?? 0) + (c.runtimeError ?? 0);
	const total = covered + (c.noCoverage ?? 0);
	if (total === 0) return 0;
	return +Math.min(1, Math.max(0, covered / total)).toFixed(4);
}

/** Default git approxidate window for the per-file churn count. */
export const DEFAULT_CHURN_WINDOW = '90 days';

/**
 * Default git approxidate window bounding the fix-density log read. A 90-day
 * half-life means commits older than ~1 year contribute negligibly, so this
 * bounds the per-package log read without affecting the signal in practice.
 */
export const DEFAULT_FIX_DENSITY_WINDOW = '1 year';

// 256MB: a per-package `git log --numstat` over year-scale history can blow the
// default 1MB stdout cap; `rev-list --count` output is tiny so this is harmless
// for churn, letting both factories share one runner.
const GIT_MAX_BUFFER = 256 * 1024 * 1024;

function defaultRunGit(args, cwd) {
	return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: GIT_MAX_BUFFER });
}

/**
 * Build a `churnFor(sourceRel)` that returns the number of commits touching a
 * file within `since` (a git approxidate, e.g. "90 days") via
 * `git rev-list --count`.
 *
 * Shallow clones are detected up-front: their history is truncated, so the
 * count would be misleadingly low — we return null for every file rather than
 * emit a wrong signal. A git failure on an individual file (e.g. a path that
 * never existed) also degrades to null, leaving the ledger column empty rather
 * than guessing.
 *
 * `runGit` is injectable so the shallow-guard and count parsing are unit
 * testable without a real repo; in the pipeline it shells out to git.
 */
export function makeChurnFor({
	cwd = process.cwd(),
	since = DEFAULT_CHURN_WINDOW,
	runGit = defaultRunGit,
} = {}) {
	let shallow = false;
	try {
		shallow = runGit(['rev-parse', '--is-shallow-repository'], cwd).trim() === 'true';
	} catch {
		// Can't ask (e.g. not a git checkout) — treat every file as unknown.
		shallow = true;
	}
	return (sourceRel) => {
		if (shallow) return null;
		try {
			const out = runGit(['rev-list', '--count', `--since=${since}`, 'HEAD', '--', sourceRel], cwd);
			const n = Number(out.trim());
			return Number.isFinite(n) ? n : null;
		} catch {
			return null;
		}
	};
}

/**
 * Build a `fixDensityFor(sourceRel)` returning a file's time-decayed,
 * delta-weighted fix-density — the same git-derived signal `signals.mjs`
 * computes — scoped to a single package's history.
 *
 * One `git log --numstat` pass (scoped to `pathspec`, bounded by `since`) is
 * parsed with `signals.mjs`'s pure helpers, so churn and fix-density share the
 * same fix-detection + decay logic rather than reimplementing it here. Files
 * with no fix commits score 0 (known: no fixes), distinct from the `null` a
 * shallow clone or git failure emits (unknown) — mirroring `makeChurnFor`'s
 * shallow guard so a truncated history never emits a misleadingly low signal.
 *
 * `now`/`halfLifeDays` are injectable for deterministic tests; `runGit` is
 * injectable so the parse + guard are unit testable without a real repo.
 */
export function makeFixDensityFor({
	cwd = process.cwd(),
	since = DEFAULT_FIX_DENSITY_WINDOW,
	halfLifeDays = DEFAULT_HALF_LIFE_DAYS,
	now = Math.floor(Date.now() / 1000),
	pathspec,
	runGit = defaultRunGit,
} = {}) {
	let density = null;
	try {
		if (runGit(['rev-parse', '--is-shallow-repository'], cwd).trim() !== 'true') {
			const args = ['log', '--no-merges', `--pretty=format:${GIT_LOG_FORMAT}`, '--numstat'];
			if (since) args.push(`--since=${since}`);
			if (pathspec) args.push('--', pathspec);
			density = computeFixDensity(parseGitLog(runGit(args, cwd)), { halfLifeDays, now });
		}
	} catch {
		// Shallow clone, not a git checkout, or a git/parse failure — every file
		// unknown, so the column degrades to null rather than guessing.
		density = null;
	}
	return (sourceRel) => {
		if (density === null) return null;
		return +(density.get(sourceRel) ?? 0).toFixed(4);
	};
}

/**
 * Build `{ churnFor, fixDensityFor }` that read from the setup job's
 * `signals.json` (the full-history signals `signals.mjs gatherSignals` wrote and
 * the picker ranked on) instead of from git.
 *
 * This is the path the nightly `mutate` job uses: its checkout is shallow, so
 * the git-derived factories above would emit `null` for every file. Reusing the
 * already-computed signals keeps the stored ledger columns consistent with the
 * exact churn/fix-density the global picker scored — and matches how the picker
 * reads them (`extractSignals` in `pick-next.mjs`): churn is the per-file commit
 * count, fix-density the decayed score.
 *
 * A file absent from the signals map had no commits (churn) / no fix commits
 * (fix-density) in the gather window, so both lookups return 0 — known-zero, not
 * the `null` (unknown) the shallow-clone git path emits. The whole map is keyed
 * by repo-relative path, the same key `buildPayload` joins on.
 */
export function makeSignalLookups(signals) {
	const churn = signals?.churn ?? {};
	const fixDensity = signals?.fixDensity ?? {};
	return {
		churnFor: (sourceRel) => {
			const entry = churn[sourceRel];
			if (typeof entry === 'number') return Number.isFinite(entry) ? entry : 0;
			if (typeof entry?.commits === 'number' && Number.isFinite(entry.commits)) {
				return entry.commits;
			}
			return 0;
		},
		fixDensityFor: (sourceRel) => {
			const v = fixDensity[sourceRel];
			return typeof v === 'number' && Number.isFinite(v) ? +v.toFixed(4) : 0;
		},
	};
}

/**
 * Build the `{ ledger, events }` payload from a parsed summary. Pure given its
 * signal dependencies: takes the summary plus run metadata, returns the rows
 * the writer webhook consumes. `churnFor(sourceRel)` / `fixDensityFor(sourceRel)`
 * yield the per-file churn count and fix-density (or null); both default to a
 * no-op so callers without git stay pure.
 */
export function buildPayload(
	summary,
	{ pkg, sha, pkgRelToRepo, churnFor = () => null, fixDensityFor = () => null },
) {
	const threshold = Number(summary.threshold);
	const timestamp = summary.generatedAt;

	const ledger = [];
	const events = [];

	for (const f of summary.files) {
		const sourceRel = path.posix.join(pkgRelToRepo, f.file);
		const status = f.thresholdMet ? 'green' : 'red';
		const coverage = coverageForLedger(f);
		const churn = churnFor(sourceRel);
		const fixDensity = fixDensityFor(sourceRel);

		ledger.push({
			source_file_path: sourceRel,
			package: pkg,
			last_score: f.score,
			coverage,
			churn,
			fix_density: fixDensity,
			threshold_at_run: threshold,
			last_checked_at: timestamp,
			status,
			mutants_killed: f.counts.killed,
			mutants_survived: f.counts.survived,
			mutants_no_coverage: f.counts.noCoverage,
			mutants_timeout: f.counts.timeout,
		});

		events.push({
			benchmark_name: 'mutation_health',
			value: f.score,
			timestamp,
			dimensions: {
				package: pkg,
				source_file: sourceRel,
				sha,
				status_after: status,
				threshold,
				coverage,
				churn,
				fix_density: fixDensity,
				mutants_killed: f.counts.killed,
				mutants_survived: f.counts.survived,
				mutants_no_coverage: f.counts.noCoverage,
				mutants_timeout: f.counts.timeout,
			},
		});
	}

	return { ledger, events };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	const summaryPath = args.summary;
	const pkg = args.package;

	if (!summaryPath) die(2, 'Missing required --summary <path>');
	if (!pkg) die(2, 'Missing required --package <name>');
	if (!existsSync(summaryPath)) die(2, `Summary not found: ${summaryPath}`);

	const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

	const summary = JSON.parse(await readFile(summaryPath, 'utf8'));

	if (!Array.isArray(summary.files)) {
		die(2, 'Summary missing `files` array.');
	}

	// pkg-root = two dirs up from the summary (reports/mutation/summary.json)
	const pkgRoot = path.resolve(path.dirname(summaryPath), '../..');
	const repoRoot = path.resolve(
		execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
	);
	const pkgRelToRepo = path.relative(repoRoot, pkgRoot);

	// Prefer the setup job's full-history signals.json when provided: the nightly
	// mutate job's checkout is shallow, so the git-derived factories below would
	// emit null for every file. Falls back to git for local/standalone runs that
	// have full history and no signals file.
	let churnFor;
	let fixDensityFor;
	const signalsPath = typeof args.signals === 'string' ? args.signals : undefined;
	if (signalsPath) {
		if (!existsSync(signalsPath)) die(2, `Signals file not found: ${signalsPath}`);
		const signals = JSON.parse(await readFile(signalsPath, 'utf8'));
		({ churnFor, fixDensityFor } = makeSignalLookups(signals));
	} else {
		churnFor = makeChurnFor({
			cwd: repoRoot,
			since: typeof args['churn-window'] === 'string' ? args['churn-window'] : DEFAULT_CHURN_WINDOW,
		});

		const halfLifeArg = Number(args['fix-density-half-life']);
		fixDensityFor = makeFixDensityFor({
			cwd: repoRoot,
			since:
				typeof args['fix-density-window'] === 'string'
					? args['fix-density-window']
					: DEFAULT_FIX_DENSITY_WINDOW,
			halfLifeDays:
				Number.isFinite(halfLifeArg) && halfLifeArg > 0 ? halfLifeArg : DEFAULT_HALF_LIFE_DAYS,
			pathspec: pkgRelToRepo,
		});
	}

	const { ledger, events } = buildPayload(summary, {
		pkg,
		sha,
		pkgRelToRepo,
		churnFor,
		fixDensityFor,
	});

	const outPath = args.out ?? path.join(pkgRoot, 'reports/mutation/bq-payload.json');
	await mkdir(path.dirname(outPath), { recursive: true });
	await writeFile(outPath, JSON.stringify({ ledger, events }, null, 2));

	process.stderr.write(
		`Emitted ${ledger.length} ledger row(s) + ${events.length} event row(s) → ${outPath}\n`,
	);
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
	await main();
}
