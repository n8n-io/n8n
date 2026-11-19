#!/usr/bin/env node
// Compares page-load benchmark runs (the `page-load.json` files that
// tests/performance/pages/page-load.spec.ts writes) and draws their trend.
//
//   node scripts/page-load-compare.mjs <run.json | dir>... [--out trend.html]
//        [--median-pct 10] [--p95-pct 20] [--fail-on-regression]
//
// A directory argument is searched for page-load.json files (CI artifacts,
// PERF_OUTPUT_DIR folders). Runs are ordered by their start time. The last
// run is compared with the one before it: a page is a regression when its
// median grew by more than --median-pct AND more than the noise of the two
// samples (a 95 % interval on the difference of means), the same for p95
// with --p95-pct. With --out, a trend page (Plotly) is written for all runs.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values: options, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		out: { type: 'string' },
		'median-pct': { type: 'string', default: '10' },
		'p95-pct': { type: 'string', default: '20' },
		'fail-on-regression': { type: 'boolean', default: false },
	},
});

const MEDIAN_PCT = Number(options['median-pct']);
const P95_PCT = Number(options['p95-pct']);

function findRunFiles(paths) {
	const files = [];
	const visit = (path) => {
		if (!existsSync(path)) throw new Error(`Not found: ${path}`);
		if (statSync(path).isDirectory()) {
			for (const entry of readdirSync(path)) {
				if (entry === 'node_modules' || entry === 'attachments') continue;
				visit(join(path, entry));
			}
		} else if (basename(path) === 'page-load.json' || /page-load-.*\.json$/.test(basename(path))) {
			files.push(path);
		}
	};
	for (const path of paths) visit(resolve(path));
	return files;
}

function loadRuns(files) {
	const runs = files.map((file) => ({ file, ...JSON.parse(readFileSync(file, 'utf8')) }));
	runs.sort((a, b) => String(a.meta.startedAt).localeCompare(String(b.meta.startedAt)));
	return runs;
}

const runLabel = (run) =>
	`${String(run.meta.startedAt).slice(0, 16).replace('T', ' ')} · ${run.meta.gitSha ? String(run.meta.gitSha).slice(0, 7) : 'local'} · ${run.meta.cpuCores} cores`;

const fmt = (value) =>
	value === null || value === undefined ? 'n/a' : Math.round(value).toLocaleString('en-US');
const signed = (value, suffix = '') =>
	(value >= 0 ? '+' : '') + Math.round(value).toLocaleString('en-US') + suffix;

/** 95 % interval half-width on the difference of two means, from the two samples. */
function noiseOf(baseline, current) {
	const varB = baseline.stddev ** 2 / Math.max(baseline.count, 1);
	const varC = current.stddev ** 2 / Math.max(current.count, 1);
	return 1.96 * Math.sqrt(varB + varC);
}

function verdictFor(key, pct, baseline, current) {
	const delta = current[key] - baseline[key];
	const threshold = (pct / 100) * baseline[key];
	const noise = noiseOf(baseline, current);
	if (delta > Math.max(threshold, noise)) return 'regression';
	if (delta < -Math.max(threshold, noise)) return 'improvement';
	return Math.abs(delta) <= noise ? 'within noise' : 'same';
}

function comparePages(baseline, current) {
	const rows = [];
	for (const page of current.pages) {
		const before = baseline.pages.find((p) => p.id === page.id);
		if (!before) continue;
		const b = before.stats.usableMs;
		const c = page.stats.usableMs;
		if (!b.count || !c.count) continue;
		rows.push({
			id: page.id,
			label: page.label,
			baselineMedian: b.median,
			currentMedian: c.median,
			deltaMedian: c.median - b.median,
			deltaMedianPct: ((c.median - b.median) / b.median) * 100,
			baselineP95: b.p95,
			currentP95: c.p95,
			deltaP95Pct: ((c.p95 - b.p95) / b.p95) * 100,
			noise: noiseOf(b, c),
			medianVerdict: verdictFor('median', MEDIAN_PCT, b, c),
			p95Verdict: verdictFor('p95', P95_PCT, b, c),
			failed: page.failed ?? 0,
		});
	}
	return rows;
}

function markdownTable(headers, rows, aligns) {
	const line = (cells) => `| ${cells.join(' | ')} |`;
	const sep = headers.map((_, i) => (aligns?.[i] === 'right' ? '---:' : ':---'));
	return [line(headers), line(sep), ...rows.map(line)].join('\n');
}

function printComparison(baseline, current, rows) {
	console.log(`\nBaseline: ${runLabel(baseline)}  (${baseline.file})`);
	console.log(`Current:  ${runLabel(current)}  (${current.file})`);
	console.log(
		`Thresholds: median ${MEDIAN_PCT} %, p95 ${P95_PCT} %, both beyond the 95 % noise band of the two samples.\n`,
	);
	console.log(
		markdownTable(
			[
				'Page',
				'Median before',
				'Median now',
				'Δ median',
				'Δ %',
				'Noise ±',
				'p95 before',
				'p95 now',
				'Δ p95 %',
				'Verdict',
			],
			rows.map((r) => [
				r.label,
				fmt(r.baselineMedian),
				fmt(r.currentMedian),
				signed(r.deltaMedian, ' ms'),
				signed(r.deltaMedianPct, ' %'),
				fmt(r.noise),
				fmt(r.baselineP95),
				fmt(r.currentP95),
				signed(r.deltaP95Pct, ' %'),
				r.medianVerdict === r.p95Verdict
					? r.medianVerdict
					: `median ${r.medianVerdict}, p95 ${r.p95Verdict}`,
			]),
			['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'left'],
		),
	);
}

function printTrend(runs) {
	const pages = runs[runs.length - 1].pages;
	console.log(`\nMedian time to usable per run (ms):\n`);
	console.log(
		markdownTable(
			['Page', ...runs.map((run) => runLabel(run))],
			pages.map((page) => [
				page.label,
				...runs.map((run) => {
					const p = run.pages.find((q) => q.id === page.id);
					return p && p.stats.usableMs.count ? fmt(p.stats.usableMs.median) : 'n/a';
				}),
			]),
			['left', ...runs.map(() => 'right')],
		),
	);
}

function trendHtml(runs, rows) {
	const data = JSON.stringify(
		runs.map((run) => ({
			label: runLabel(run),
			startedAt: run.meta.startedAt,
			file: run.file,
			pages: run.pages.map((p) => ({
				id: p.id,
				label: p.label,
				median: p.stats.usableMs.median,
				p95: p.stats.usableMs.p95,
				p80: p.stats.usableMs.p80,
				min: p.stats.usableMs.min,
				max: p.stats.usableMs.max,
				warmup: p.warmup?.usableMs ?? null,
				failed: p.failed ?? 0,
			})),
		})),
	).replace(/</g, '\\u003c');
	const comparison = JSON.stringify(rows).replace(/</g, '\\u003c');
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page load trend</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
  :root { color-scheme: light; --surface-1: #fcfcfb; --surface-2: #f0efec; --border: #d9d8d3; --text-primary: #0b0b0b; --text-secondary: #52514e;
    --series-1: #2a78d6; --series-2: #eb6834; --good: #0ca30c; --critical: #d03b3b; }
  @media (prefers-color-scheme: dark) { :root { color-scheme: dark; --surface-1: #1a1a19; --surface-2: #262625; --border: #3a3a37; --text-primary: #f0efec; --text-secondary: #c3c2b7;
    --series-1: #3987e5; --series-2: #d95926; } }
  body { margin: 0; padding: 24px 16px; background: var(--surface-1); color: var(--text-primary); font: 14px/1.45 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 1200px; margin: 0 auto; } h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 32px 0 8px; }
  .note { color: var(--text-secondary); font-size: 12px; } select { font: inherit; color: var(--text-primary); background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; }
  .chart { width: 100%; min-height: 380px; } table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; } th:first-child, td:first-child, td.verdict { text-align: left; }
  th { color: var(--text-secondary); font-weight: 600; } .regression { color: var(--critical); font-weight: 600; } .improvement { color: var(--good); font-weight: 600; }
</style></head>
<body><main>
  <h1>Page load trend</h1>
  <p class="note" id="meta"></p>
  <h2>Last run against the one before</h2>
  <p class="note">Median threshold ${MEDIAN_PCT} %, p95 threshold ${P95_PCT} %; a change counts only when it is also beyond the 95 % noise band of the two samples.</p>
  <div style="overflow:auto"><table id="compare"></table></div>
  <h2>Time to usable over runs</h2>
  <label>Page <select id="page"></select></label>
  <div class="chart" id="trend"></div>
  <h2>Median per run (ms)</h2>
  <div style="overflow:auto"><table id="medians"></table></div>
</main>
<script>
const RUNS = ${data}; const ROWS = ${comparison};
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmt = (v) => v === null || v === undefined ? 'n/a' : Math.round(v).toLocaleString('en-US');
const signed = (v, s) => (v >= 0 ? '+' : '') + Math.round(v).toLocaleString('en-US') + (s || '');
document.getElementById('meta').textContent = RUNS.length + ' runs, ' + RUNS[0].label + ' → ' + RUNS[RUNS.length - 1].label;
document.getElementById('compare').innerHTML = '<tr><th>Page</th><th>Median before</th><th>Median now</th><th>Δ median</th><th>Δ %</th><th>Noise ±</th><th>p95 before</th><th>p95 now</th><th>Δ p95 %</th><th>Verdict</th></tr>'
  + ROWS.map((r) => '<tr><td>' + r.label + '</td><td>' + fmt(r.baselineMedian) + '</td><td>' + fmt(r.currentMedian) + '</td><td>' + signed(r.deltaMedian, ' ms') + '</td><td>' + signed(r.deltaMedianPct, ' %') + '</td><td>' + fmt(r.noise) + '</td><td>' + fmt(r.baselineP95) + '</td><td>' + fmt(r.currentP95) + '</td><td>' + signed(r.deltaP95Pct, ' %') + '</td><td class="verdict ' + r.medianVerdict.replace(' ', '-') + '">' + (r.medianVerdict === r.p95Verdict ? r.medianVerdict : 'median ' + r.medianVerdict + ', p95 ' + r.p95Verdict) + '</td></tr>').join('');
const pages = RUNS[RUNS.length - 1].pages;
const select = document.getElementById('page');
select.innerHTML = pages.map((p) => '<option value="' + p.id + '">' + p.label + '</option>').join('');
function render(pageId) {
  const x = RUNS.map((r) => r.label);
  const pick = (key) => RUNS.map((r) => { const p = r.pages.find((q) => q.id === pageId); return p ? p[key] : null; });
  Plotly.react('trend', [
    { type: 'scatter', mode: 'lines+markers', name: 'median', x, y: pick('median'), line: { color: css('--series-1'), width: 2 }, marker: { size: 8, color: css('--series-1') }, hovertemplate: 'median %{y:.0f} ms<extra>%{x}</extra>' },
    { type: 'scatter', mode: 'lines+markers', name: 'p95', x, y: pick('p95'), line: { color: css('--series-2'), width: 2, dash: 'dot' }, marker: { size: 8, color: css('--series-2') }, hovertemplate: 'p95 %{y:.0f} ms<extra>%{x}</extra>' },
    { type: 'scatter', mode: 'markers', name: 'warm-up', x, y: pick('warmup'), marker: { symbol: 'diamond-open', size: 11, color: css('--series-1'), line: { width: 2 } }, hovertemplate: 'warm-up %{y:.0f} ms<extra>%{x}</extra>' },
  ], { paper_bgcolor: css('--surface-1'), plot_bgcolor: css('--surface-1'), font: { color: css('--text-primary'), size: 13 }, margin: { l: 56, r: 16, t: 16, b: 96 },
    xaxis: { gridcolor: css('--border'), tickangle: -20, automargin: true }, yaxis: { gridcolor: css('--border'), rangemode: 'tozero', title: { text: 'ms' } },
    legend: { orientation: 'h', y: 1.08 }, hoverlabel: { bgcolor: css('--surface-2'), font: { color: css('--text-primary') } } }, { responsive: true, displaylogo: false });
}
document.getElementById('medians').innerHTML = '<tr><th>Page</th>' + RUNS.map((r) => '<th>' + r.label + '</th>').join('') + '</tr>'
  + pages.map((p) => '<tr><td>' + p.label + '</td>' + RUNS.map((r) => { const q = r.pages.find((z) => z.id === p.id); return '<td>' + (q ? fmt(q.median) : 'n/a') + '</td>'; }).join('') + '</tr>').join('');
select.addEventListener('change', (e) => render(e.target.value));
render(pages[0].id);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => render(select.value));
</script></body></html>
`;
}

const files = findRunFiles(positionals);
if (files.length === 0) {
	console.error('No page-load.json files found. Pass run files or folders that contain them.');
	process.exit(2);
}
const runs = loadRuns(files);
console.log(`Found ${runs.length} run(s):`);
for (const run of runs) console.log(`  ${runLabel(run)}  ${run.file}`);

let rows = [];
if (runs.length >= 2) {
	const [baseline, current] = runs.slice(-2);
	rows = comparePages(baseline, current);
	printComparison(baseline, current, rows);
}
if (runs.length >= 3) printTrend(runs);

if (options.out) {
	writeFileSync(resolve(options.out), trendHtml(runs, rows));
	console.log(`\nTrend page: ${resolve(options.out)}`);
}

const regressions = rows.filter(
	(r) => r.medianVerdict === 'regression' || r.p95Verdict === 'regression',
);
if (regressions.length > 0) {
	console.log(
		`\n${regressions.length} page(s) regressed: ${regressions.map((r) => r.id).join(', ')}`,
	);
	if (options['fail-on-regression']) process.exit(1);
}
