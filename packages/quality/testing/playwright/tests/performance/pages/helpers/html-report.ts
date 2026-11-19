import { PHASE_KEYS, type PageLoadSample } from './measure';
import type { RunMeta } from './output';
import type { Stats } from './stats';

/** The shape of `page-load.json`; the HTML report embeds it and accepts more of them to compare. */
export interface ReportData {
	meta: RunMeta;
	pages: Array<{
		id: string;
		label: string;
		routeName: string;
		path: string;
		stats: Record<string, Stats>;
		warmup: { usableMs: number | null; deltaMs: number | null; deltaPct: number | null };
		failed: number;
		samples: PageLoadSample[];
	}>;
}

const PLOTLY_SRC = 'https://cdn.plot.ly/plotly-2.35.2.min.js';

/**
 * A self-contained page: the run's data is embedded, Plotly comes from the
 * CDN. Charts: one box per page (the ten runs, warm-up as a marker), the runs
 * of one page in order, and the median phase times of that page. A table
 * holds every statistic. Drop another `page-load.json` on the page to compare
 * two runs side by side.
 */
export function buildHtmlReport(data: ReportData): string {
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	const phases = JSON.stringify(PHASE_KEYS);
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Editor page load</title>
<script src="${PLOTLY_SRC}"></script>
<style>
  :root {
    color-scheme: light;
    --surface-1: #fcfcfb; --surface-2: #f0efec; --border: #d9d8d3;
    --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #7d7c77;
    --series-1: #2a78d6; --series-2: #eb6834; --status-critical: #d03b3b;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --surface-1: #1a1a19; --surface-2: #262625; --border: #3a3a37;
      --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #8f8e88;
      --series-1: #3987e5; --series-2: #d95926; --status-critical: #d03b3b;
    }
  }
  body { margin: 0; padding: 24px 16px; background: var(--surface-1); color: var(--text-primary);
    font: 14px/1.45 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 32px 0 8px; }
  .meta { color: var(--text-secondary); margin: 0 0 16px; }
  .meta span { margin-right: 16px; white-space: nowrap; }
  .controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 8px 0; }
  select { font: inherit; color: var(--text-primary); background: var(--surface-2);
    border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; }
  .chart { width: 100%; min-height: 360px; }
  .drop { border: 1px dashed var(--border); border-radius: 8px; padding: 12px; color: var(--text-secondary); }
  .drop.over { border-color: var(--series-2); }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th:first-child, td:first-child { text-align: left; }
  th { color: var(--text-secondary); font-weight: 600; position: sticky; top: 0; background: var(--surface-1); }
  td.failed { color: var(--status-critical); font-weight: 600; }
  .runs { color: var(--text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .note { color: var(--text-muted); font-size: 12px; }
</style>
</head>
<body>
<main>
  <h1>Editor page load</h1>
  <p class="meta" id="meta"></p>
  <div class="drop" id="drop">Drop another <code>page-load.json</code> here (or <label><input type="file" id="file" accept=".json"> choose a file</label>) to compare it with this run.</div>

  <h2>Time to usable per page</h2>
  <p class="note">One box per page over the measured runs, every run as a dot. The warm-up (first visit) is the diamond.</p>
  <div class="chart" id="boxes"></div>

  <div class="controls"><label>Page <select id="page"></select></label></div>
  <h2>Runs in order</h2>
  <div class="chart" id="runs"></div>

  <h2>Median phase times of the page</h2>
  <p class="note">When each boot request finished (responseEnd, median over the measured runs) and when the page was usable.</p>
  <div class="chart" id="phases"></div>

  <h2>All statistics (ms)</h2>
  <p class="note">The Traces column links the Chrome trace files that sit next to this report (one per traced run). Open a file in Chrome DevTools → Performance → "Load profile", or drop it on <a href="https://ui.perfetto.dev">ui.perfetto.dev</a>; the Timings track carries the <code>n8n-test:usable</code> mark.</p>
  <div style="overflow:auto"><table id="table"></table></div>
</main>
<script>
const RUNS = [${json}];
const PHASES = ${phases};
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmt = (v) => v === null || v === undefined ? '' : Math.round(v).toLocaleString('en-US');
const runLabel = (run, index) => (index === 0 ? 'This run' : 'Run ' + (index + 1)) + ' · ' + String(run.meta.startedAt).slice(0, 16).replace('T', ' ') + ' · ' + run.meta.cpuCores + ' cores';
const measured = (page) => page.samples.filter((s) => !s.warmup && s.usableMs !== null);
const warmupOf = (page) => page.warmup ?? { usableMs: (page.samples.find((s) => s.warmup) ?? {}).usableMs ?? null, deltaMs: null, deltaPct: null };
const failedOf = (page) => page.failed ?? page.samples.filter((s) => s.error).length;
const seriesColor = (index) => css(index === 0 ? '--series-1' : '--series-2');

function layout(extra) {
  return Object.assign({
    paper_bgcolor: css('--surface-1'), plot_bgcolor: css('--surface-1'),
    font: { color: css('--text-primary'), size: 13 },
    margin: { l: 56, r: 16, t: 16, b: 96 },
    xaxis: { gridcolor: css('--border'), zeroline: false, automargin: true },
    yaxis: { gridcolor: css('--border'), zeroline: false, title: { text: 'ms', font: { color: css('--text-secondary') } }, rangemode: 'tozero' },
    legend: { orientation: 'h', y: 1.08, font: { color: css('--text-secondary') } },
    hoverlabel: { bgcolor: css('--surface-2'), font: { color: css('--text-primary') } },
  }, extra);
}

function renderMeta() {
  const m = RUNS[0].meta;
  document.getElementById('meta').innerHTML = [
    ['Started', String(m.startedAt).replace('T', ' ').slice(0, 19)], ['Base URL', m.baseUrl],
    ['Runs per page', m.iterations + ' after ' + m.warmup + ' warm-up'], ['Host', m.cpuCores + ' cores, ' + m.memoryGb + ' GB'],
    ['Trace', m.traceMode], ['Cold cache', m.coldCache ? 'yes' : 'no'], ['Git', m.gitSha ? String(m.gitSha).slice(0, 10) : 'n/a'],
  ].map(([k, v]) => '<span><b>' + k + ':</b> ' + v + '</span>').join('');
}

function renderBoxes() {
  const traces = [];
  RUNS.forEach((run, index) => {
    const color = seriesColor(index);
    traces.push({
      type: 'box', name: runLabel(run, index), legendgroup: 'run' + index, offsetgroup: 'run' + index,
      x: run.pages.flatMap((p) => measured(p).map(() => p.label)),
      y: run.pages.flatMap((p) => measured(p).map((s) => s.usableMs)),
      boxpoints: 'all', jitter: 0.4, pointpos: 0, marker: { color, size: 6, opacity: 0.7 },
      line: { color, width: 2 }, fillcolor: 'rgba(0,0,0,0)',
      hovertemplate: '%{x}<br>%{y:.0f} ms<extra>' + runLabel(run, index) + '</extra>',
    });
    traces.push({
      type: 'scatter', mode: 'markers', name: 'Warm-up · ' + runLabel(run, index), legendgroup: 'run' + index,
      x: run.pages.map((p) => p.label), y: run.pages.map((p) => warmupOf(p).usableMs),
      marker: { color, symbol: 'diamond-open', size: 11, line: { width: 2 } },
      hovertemplate: '%{x}<br>warm-up %{y:.0f} ms<extra></extra>',
    });
  });
  Plotly.react('boxes', traces, layout({ boxmode: 'group', xaxis: { tickangle: -30, gridcolor: css('--border'), automargin: true } }), { responsive: true, displaylogo: false });
}

function renderRuns(pageId) {
  const traces = [];
  RUNS.forEach((run, index) => {
    const page = run.pages.find((p) => p.id === pageId);
    if (!page) return;
    const color = seriesColor(index);
    const runs = page.samples.filter((s) => !s.warmup);
    traces.push({
      type: 'scatter', mode: 'lines+markers', name: runLabel(run, index),
      x: runs.map((s) => s.iteration), y: runs.map((s) => s.usableMs),
      line: { color, width: 2 }, marker: { color, size: 8 },
      hovertemplate: 'run %{x}: %{y:.0f} ms<extra>' + runLabel(run, index) + '</extra>',
    });
    const warmup = page.samples.find((s) => s.warmup);
    if (warmup && warmup.usableMs !== null) {
      traces.push({ type: 'scatter', mode: 'markers', name: 'Warm-up · ' + runLabel(run, index), x: [0], y: [warmup.usableMs],
        marker: { color, symbol: 'diamond-open', size: 11, line: { width: 2 } }, hovertemplate: 'warm-up: %{y:.0f} ms<extra></extra>' });
    }
  });
  const medians = RUNS.map((run, index) => { const p = run.pages.find((q) => q.id === pageId); return p ? { y: p.stats.usableMs.median, color: seriesColor(index) } : null; }).filter(Boolean);
  Plotly.react('runs', traces, layout({
    xaxis: { title: { text: 'run (0 = warm-up)' }, dtick: 1, gridcolor: css('--border'), zeroline: false },
    shapes: medians.map((m) => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: m.y, y1: m.y, line: { color: m.color, width: 1, dash: 'dot' } })),
    annotations: medians.map((m) => ({ xref: 'paper', x: 1, y: m.y, text: 'median ' + fmt(m.y), showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { color: css('--text-secondary'), size: 11 } })),
  }), { responsive: true, displaylogo: false });
}

function median(values) { const s = values.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

function renderPhases(pageId) {
  const traces = [];
  const rowsByRun = RUNS.map((run) => {
    const page = run.pages.find((p) => p.id === pageId);
    if (!page) return [];
    const samples = measured(page);
    return PHASES.map((key) => { const v = samples.map((s) => s.phases[key]).filter((x) => x !== null); return v.length ? { key, ms: median(v) } : null; })
      .filter(Boolean).concat([{ key: 'usable', ms: page.stats.usableMs.median }]).sort((a, b) => a.ms - b.ms);
  });
  const order = (rowsByRun[0] || []).map((r) => r.key);
  rowsByRun.forEach((rows, index) => {
    if (!rows.length) return;
    traces.push({
      type: 'bar', orientation: 'h', name: runLabel(RUNS[index], index),
      y: rows.map((r) => r.key), x: rows.map((r) => r.ms), text: rows.map((r) => fmt(r.ms) + ' ms'), textposition: 'outside',
      marker: { color: seriesColor(index) }, textfont: { color: css('--text-secondary') },
      hovertemplate: '%{y}: %{x:.0f} ms<extra>' + runLabel(RUNS[index], index) + '</extra>',
    });
  });
  Plotly.react('phases', traces, layout({
    barmode: 'group', bargap: 0.35, margin: { l: 120, r: 80, t: 16, b: 48 },
    xaxis: { title: { text: 'ms after navigation start' }, gridcolor: css('--border'), zeroline: false },
    yaxis: { categoryorder: 'array', categoryarray: order.slice().reverse(), gridcolor: css('--border'), automargin: true },
    height: 48 + 28 * Math.max(order.length, 4),
  }), { responsive: true, displaylogo: false });
}

function renderTable() {
  const cols = ['median', 'avg', 'p75', 'p80', 'p90', 'p95', 'p99', 'stddev', 'min', 'max'];
  const head = '<tr><th>Page</th><th>Run</th>' + cols.map((c) => '<th>' + c + '</th>').join('') + '<th>CV</th><th>Failed</th><th>Warm-up</th><th>Warm-up − avg</th><th>Runs</th><th>Traces</th></tr>';
  const traceLinks = (p) => p.samples.filter((x) => x.tracePath).map((x) => {
    const file = String(x.tracePath).split(/[\\\\/]/).pop();
    return '<a href="' + file + '" download title="Chrome trace: open in Chrome DevTools → Performance → Load profile, or in ui.perfetto.dev">' + (x.warmup ? 'warm-up' : 'run ' + x.iteration) + '</a>';
  }).join(', ');
  const rows = RUNS.flatMap((run, index) => run.pages.map((p) => {
    const s = p.stats.usableMs;
    return '<tr><td>' + p.label + '</td><td>' + (index === 0 ? 'this' : 'run ' + (index + 1)) + '</td>'
      + cols.map((c) => '<td>' + fmt(s[c]) + '</td>').join('')
      + '<td>' + Math.round(s.cv * 100) + ' %</td>'
      + '<td' + (failedOf(p) ? ' class="failed"' : '') + '>' + failedOf(p) + '</td>'
      + '<td>' + fmt(warmupOf(p).usableMs) + '</td>'
      + '<td>' + (warmupOf(p).deltaMs === null ? '' : (warmupOf(p).deltaMs >= 0 ? '+' : '') + fmt(warmupOf(p).deltaMs) + ' (' + Math.round(warmupOf(p).deltaPct) + ' %)') + '</td>'
      + '<td class="runs">' + p.samples.filter((x) => !x.warmup).map((x) => x.usableMs === null ? 'x' : Math.round(x.usableMs)).join(' ') + '</td>'
      + '<td>' + (index === 0 ? traceLinks(p) : '') + '</td></tr>';
  }));
  document.getElementById('table').innerHTML = head + rows.join('');
}

function renderAll() {
  renderMeta(); renderBoxes(); renderTable();
  const select = document.getElementById('page');
  const current = select.value || RUNS[0].pages[0].id;
  select.innerHTML = RUNS[0].pages.map((p) => '<option value="' + p.id + '"' + (p.id === current ? ' selected' : '') + '>' + p.label + '</option>').join('');
  renderRuns(select.value); renderPhases(select.value);
}

function addRun(text) {
  try {
    const run = JSON.parse(text);
    if (!run || !Array.isArray(run.pages)) throw new Error('not a page-load.json');
    RUNS.splice(1, RUNS.length - 1, run);
    renderAll();
  } catch (error) { alert('Could not read the file: ' + error.message); }
}

document.getElementById('page').addEventListener('change', (event) => { renderRuns(event.target.value); renderPhases(event.target.value); });
document.getElementById('file').addEventListener('change', (event) => { const f = event.target.files[0]; if (f) f.text().then(addRun); });
const drop = document.getElementById('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) f.text().then(addRun); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderAll);
if (window.Plotly) renderAll(); else { renderMeta(); renderTable(); document.getElementById('boxes').textContent = 'Charts need network access to load Plotly; the table below works offline.'; }
</script>
</body>
</html>
`;
}
