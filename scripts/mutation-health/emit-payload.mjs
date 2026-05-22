#!/usr/bin/env node
/**
 * Emit a BQ payload from a mutate.mjs summary.json.
 *
 * Input:  packages/<pkg>/reports/mutation/summary.json (from `pnpm mutate <file>`)
 * Output: JSON document with two keys, `ledger` (rows for qa_mutation_health_ledger)
 *         and `events` (rows for qa_performance_metrics, benchmark_name="mutation_health").
 *
 * The output is what the n8n writer workflow consumes via webhook. This script
 * intentionally does NOT call BigQuery directly — the writer workflow owns
 * BQ credentials and the MERGE statement for the ledger upsert.
 *
 * Usage:
 *   node scripts/mutation-health/emit-payload.mjs \
 *     --summary packages/workflow/reports/mutation/summary.json \
 *     --package n8n-workflow \
 *     [--sha <sha>]                  # default: git rev-parse HEAD
 *     [--out <path>]                 # default: <pkg>/reports/mutation/bq-payload.json
 *     [--format json|ndjson]         # default: json
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const VALID_FORMATS = new Set(['json', 'ndjson']);

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

const args = parseArgs(process.argv.slice(2));

const summaryPath = args.summary;
const pkg = args.package;
const format = args.format ?? 'json';

if (!summaryPath) die(2, 'Missing required --summary <path>');
if (!pkg) die(2, 'Missing required --package <name>');
if (!VALID_FORMATS.has(format))
	die(2, `Invalid --format: ${format}. Must be one of: ${[...VALID_FORMATS].join(', ')}`);
if (!existsSync(summaryPath)) die(2, `Summary not found: ${summaryPath}`);

const sha = args.sha ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

const summary = JSON.parse(await readFile(summaryPath, 'utf8'));

if (!summary.files || summary.files.length === 0) {
	die(2, 'Summary contains no files; nothing to emit.');
}

// pkg-root = two dirs up from the summary (reports/mutation/summary.json)
const pkgRoot = path.resolve(path.dirname(summaryPath), '../..');
const repoRoot = path.resolve(
	execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
);
const pkgRelToRepo = path.relative(repoRoot, pkgRoot);

const threshold = Number(summary.threshold);
const timestamp = summary.generatedAt;

const ledger = [];
const events = [];

for (const f of summary.files) {
	const sourceRel = path.posix.join(pkgRelToRepo, f.file);
	const status = f.thresholdMet ? 'green' : 'red';

	ledger.push({
		source_file_path: sourceRel,
		package: pkg,
		last_score: f.score,
		threshold_at_run: threshold,
		last_checked_at: timestamp,
		last_checked_sha: sha,
		status,
		attempts: 0,
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
			mutants_killed: f.counts.killed,
			mutants_survived: f.counts.survived,
			mutants_no_coverage: f.counts.noCoverage,
			mutants_timeout: f.counts.timeout,
		},
	});
}

const outPath = args.out ?? path.join(pkgRoot, 'reports/mutation/bq-payload.json');
await mkdir(path.dirname(outPath), { recursive: true });

if (format === 'ndjson') {
	const lines = [
		...ledger.map((row) => JSON.stringify({ table: 'qa_mutation_health_ledger', row })),
		...events.map((row) => JSON.stringify({ table: 'qa_performance_metrics', row })),
	];
	await writeFile(outPath, lines.join('\n') + '\n');
} else {
	await writeFile(outPath, JSON.stringify({ ledger, events }, null, 2));
}

process.stderr.write(
	`Emitted ${ledger.length} ledger row(s) + ${events.length} event row(s) → ${outPath}\n`,
);
