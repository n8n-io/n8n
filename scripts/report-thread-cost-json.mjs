#!/usr/bin/env node
/**
 * Markdown cost/cache comparison for two or more enriched *-threads.json files.
 * The first file is the baseline. Read-only; prints to stdout.
 */

import fs from 'node:fs';

const files = process.argv.slice(2);
if (files.length < 2) {
	console.error(
		'Usage: node scripts/report-thread-cost-json.mjs <baseline-threads.json> <other-threads.json> [...]',
	);
	process.exit(1);
}

const sum = (rows, key) => rows.reduce((acc, r) => acc + (r[key] ?? 0), 0);
const money = (v) => `$${v.toFixed(2)}`;
const tokens = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`);
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const delta = (v, base) => `${v >= base ? '+' : ''}${(((v - base) / base) * 100).toFixed(0)}%`;

const experiments = files.map((file) => {
	const data = JSON.parse(fs.readFileSync(file, 'utf8'));
	const rows = data.rows ?? [];
	const missing = rows.filter((r) => r.costUsd == null).length;
	if (missing > 0) {
		console.error(`WARNING: ${file} has ${missing} rows without costUsd — run enrich first`);
	}
	return {
		name: data.experiment ?? file,
		rows,
		threads: rows.length,
		llmSpans: sum(rows, 'llmSpans'),
		inputTokens: sum(rows, 'inputTokens'),
		outputTokens: sum(rows, 'outputTokens'),
		cacheRead: sum(rows, 'cacheReadTokens'),
		cacheWrite: sum(rows, 'cacheWriteTokens'),
		cost: sum(rows, 'costUsd'),
	};
});

const baseline = experiments[0];
const baseAvg = baseline.cost / baseline.threads;

console.log('# LangSmith experiment cost report\n');
console.log(`Baseline: **${baseline.name}**\n`);
console.log('## Overview\n');
console.log(
	'| Experiment | Threads | LLM spans | Input | Output | Cache read | Cache write | Hit rate | Total cost | Avg cost/thread |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const exp of experiments) {
	const avg = exp.cost / exp.threads;
	const vsBase = exp === baseline ? '' : ` (${delta(avg, baseAvg)})`;
	console.log(
		`| ${exp.name} | ${exp.threads} | ${exp.llmSpans} | ${tokens(exp.inputTokens)} | ` +
			`${tokens(exp.outputTokens)} | ${tokens(exp.cacheRead)} | ${tokens(exp.cacheWrite)} | ` +
			`${pct(exp.cacheRead / exp.inputTokens)} | ${money(exp.cost)} | ${money(avg)}${vsBase} |`,
	);
}

console.log('\n## Avg cost per thread by eval\n');
const testCases = [...new Set(experiments.flatMap((e) => e.rows.map((r) => r.testCase)))].sort();
console.log(`| Eval | ${experiments.map((e) => e.name).join(' | ')} |`);
console.log(`|---|${experiments.map(() => '---').join('|')}|`);
for (const tc of testCases) {
	const baseRows = baseline.rows.filter((r) => r.testCase === tc);
	const baseEvalAvg = baseRows.length > 0 ? sum(baseRows, 'costUsd') / baseRows.length : null;
	const cells = experiments.map((exp) => {
		const rows = exp.rows.filter((r) => r.testCase === tc);
		if (rows.length === 0) return 'n/a';
		const avg = sum(rows, 'costUsd') / rows.length;
		if (exp === baseline || baseEvalAvg == null) return money(avg);
		return `${money(avg)} (${delta(avg, baseEvalAvg)})`;
	});
	console.log(`| ${tc} | ${cells.join(' | ')} |`);
}
