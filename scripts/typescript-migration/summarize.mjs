#!/usr/bin/env node
// Roll every results/<pkg>.json into a single tracked Markdown report, so
// per-package before/after numbers are reviewable as PRs land.
//
// Usage:
//   node scripts/typescript-migration/summarize.mjs [--out=<file>]
//
// Default output: scripts/typescript-migration/SUMMARY.md (committed — the
// results/ JSON is gitignored, this rollup is not).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(SCRIPT_DIR, 'results');

function parseArgs(argv) {
	let out = join(SCRIPT_DIR, 'SUMMARY.md');
	for (const arg of argv) {
		if (arg.startsWith('--out=')) out = resolve(process.cwd(), arg.slice('--out='.length));
		else {
			console.error(`\n✖ Unknown option: ${arg}\n`);
			process.exit(1);
		}
	}
	return { out };
}

function fmtMs(ms) {
	return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

// Baseline-first ordering: a label named "before" is always the baseline and
// "after" always last, regardless of the order they were recorded in; anything
// else falls between them by timestamp. Keeps deltas pointing the right way.
function orderLabels(runs) {
	const rank = (l) => (/^before$/i.test(l) ? -1 : /^after$/i.test(l) ? 1 : 0);
	return Object.keys(runs).sort((a, b) => {
		if (rank(a) !== rank(b)) return rank(a) - rank(b);
		return (runs[a].timestamp ?? '').localeCompare(runs[b].timestamp ?? '');
	});
}

// Render one package's stored runs as the Δ-vs-baseline block.
function renderBlock(data) {
	const labels = orderLabels(data.runs);
	const base = labels[0];
	const lines = [`=== ${data.package} — median times (Δ vs "${base}") ===`];

	const tasks = new Set();
	for (const l of labels) for (const t of Object.keys(data.runs[l].tasks)) tasks.add(t);

	for (const task of tasks) {
		lines.push('', `${task}:`);
		const baseMedian = data.runs[base].tasks[task]?.median;
		for (const label of labels) {
			const stat = data.runs[label].tasks[task];
			if (!stat) {
				lines.push(`  ${label.padEnd(16)} (not measured)`);
				continue;
			}
			let delta = '';
			if (label !== base && baseMedian != null) {
				const diff = stat.median - baseMedian;
				const pct = ((diff / baseMedian) * 100).toFixed(1);
				const sign = diff <= 0 ? '' : '+';
				delta = `  ${sign}${fmtMs(diff)} (${sign}${pct}%)`;
			}
			lines.push(`  ${label.padEnd(16)} ${fmtMs(stat.median).padStart(9)}${delta}`);
		}
	}
	return lines.join('\n');
}

// One "before → after" delta per task for the overview table (first vs last label).
function overviewDelta(data, task) {
	const labels = orderLabels(data.runs);
	const first = data.runs[labels[0]].tasks[task]?.median;
	const last = data.runs[labels[labels.length - 1]].tasks[task]?.median;
	if (labels.length < 2 || first == null || last == null) return '—';
	const pct = (((last - first) / first) * 100).toFixed(1);
	return `${last - first <= 0 ? '' : '+'}${pct}%`;
}

function main() {
	const { out } = parseArgs(process.argv.slice(2));

	if (!existsSync(RESULTS_DIR)) {
		console.error(`\n✖ No results directory at ${RESULTS_DIR}. Run benchmark.mjs first.\n`);
		process.exit(1);
	}

	const files = readdirSync(RESULTS_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => JSON.parse(readFileSync(join(RESULTS_DIR, f), 'utf8')))
		.sort((a, b) => a.package.localeCompare(b.package));

	if (files.length === 0) {
		console.error('\n✖ No result files found. Run benchmark.mjs first.\n');
		process.exit(1);
	}

	const md = [];
	md.push('# TypeScript 6 → 7 migration benchmarks', '');
	md.push(`Generated ${new Date().toISOString()} from \`scripts/typescript-migration/results/\`.`, '');

	// Overview table: median Δ (first → last label) per package.
	md.push('| Package | typecheck Δ | build Δ |', '| --- | --- | --- |');
	for (const data of files) {
		md.push(`| \`${data.package}\` | ${overviewDelta(data, 'typecheck')} | ${overviewDelta(data, 'build')} |`);
	}
	md.push('');

	// Per-package detail blocks in the benchmark's own format.
	for (const data of files) {
		md.push('```', renderBlock(data), '```', '');
	}

	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, `${md.join('\n')}\n`);
	console.log(`✔ Wrote ${out} (${files.length} package${files.length === 1 ? '' : 's'})`);
}

main();
