#!/usr/bin/env node
/**
 * Emit a BQ payload from a mutate.mjs summary.json.
 *
 * Input:  packages/<pkg>/reports/mutation/summary.json (from `pnpm mutate <file>`)
 * Output: JSON document with two keys, `ledger` (rows for qa_mutation_health_ledger)
 *         and `events` (rows for qa_performance_metrics, benchmark_name="mutation_health").
 *
 * Each ledger row carries two of the global picker's value-formula terms:
 *
 *   coverage — the scored file's coverage fraction (clamped to [0,1]) written
 *              back by mutate.mjs, used as the `(1 − coverage)` term (DEVP-496).
 *   churn    — commit count touching the source file within a recent window,
 *              derived here from git, used as the `churn` term (DEVP-546).
 *
 * (The third term, `fix_density`, is populated downstream in the writer
 * workflow via a join against the bug taxonomy — not here.)
 *
 * The output is what the n8n writer workflow consumes via webhook. This script
 * intentionally does NOT call BigQuery directly — the writer workflow owns
 * BQ credentials and the MERGE statement for the ledger upsert.
 *
 * Usage:
 *   node scripts/mutation-health/emit-payload.mjs \
 *     --summary packages/workflow/reports/mutation/summary.json \
 *     --package n8n-workflow \
 *     [--churn-window "90 days"]     # git approxidate for the churn count
 *     [--out <path>]                 # default: <pkg>/reports/mutation/bq-payload.json
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

function defaultRunGit(args, cwd) {
	return execFileSync('git', args, { cwd, encoding: 'utf8' });
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
 * Build the `{ ledger, events }` payload from a parsed summary. Pure given its
 * `churnFor` dependency: takes the summary plus run metadata, returns the rows
 * the writer webhook consumes. `churnFor(sourceRel)` yields the per-file churn
 * count (or null); it defaults to a no-op so callers without git stay pure.
 */
export function buildPayload(summary, { pkg, sha, pkgRelToRepo, churnFor = () => null }) {
	const threshold = Number(summary.threshold);
	const timestamp = summary.generatedAt;

	const ledger = [];
	const events = [];

	for (const f of summary.files) {
		const sourceRel = path.posix.join(pkgRelToRepo, f.file);
		const status = f.thresholdMet ? 'green' : 'red';
		const coverage = coverageForLedger(f);
		const churn = churnFor(sourceRel);

		ledger.push({
			source_file_path: sourceRel,
			package: pkg,
			last_score: f.score,
			coverage,
			churn,
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

	const churnFor = makeChurnFor({
		cwd: repoRoot,
		since: typeof args['churn-window'] === 'string' ? args['churn-window'] : DEFAULT_CHURN_WINDOW,
	});

	const { ledger, events } = buildPayload(summary, { pkg, sha, pkgRelToRepo, churnFor });

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
