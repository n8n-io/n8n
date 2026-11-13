// Joins the results of one cloud benchmark run into results.csv and a short
// summary.md.
//   node bench/cloud/summarize.mjs <result-dir>
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
	console.error('usage: summarize.mjs <result-dir>');
	process.exit(2);
}
const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : '');
const sys = (f) => {
	try {
		return JSON.parse(read(f));
	} catch {
		return {};
	}
};
const before = sys('sysinfo-before.json');
const after = sys('sysinfo-after.json');
const f0 = (x) => (Number.isFinite(x) ? Math.round(x).toLocaleString('en-US') : '');
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '');
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '');

const COLS = ['suite', 'workload', 'code', 'shards', 'host_workers', 'conc', 'rate_per_s', 'p50_ms', 'p90_ms', 'p99_ms', 'wfrt_us_per_run', 'host_us_per_run', 'wfrt_cores', 'host_cores', 'stub_cores', 'node_runs_per_run', 'load1', 'notes'];
const rows = [];

// W1 to W7.
const micro = read('micro.csv').trim().split('\n').filter(Boolean);
const mhead = (micro.shift() ?? '').split(',');
for (const line of micro) {
	const c = line.split(',');
	const r = Object.fromEntries(mhead.map((h, i) => [h, c[i]]));
	rows.push({
		suite: 'micro',
		workload: r.workload,
		shards: r.shards,
		host_workers: r.host_workers,
		conc: r.conns,
		rate_per_s: r.rate_per_s,
		p50_ms: r.p50_us ? (Number(r.p50_us) / 1000).toFixed(3) : '',
		p99_ms: r.p99_us ? (Number(r.p99_us) / 1000).toFixed(3) : '',
		wfrt_cores: r.wfrt_cores,
		host_cores: r.host_cores,
		load1: r.load1,
		notes: r.notes,
	});
}

// Warm: CPU per run of each workflow, one at a time.
const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const warm = [];
for (const f of readdirSync(dir).filter((x) => /^warm-.*\.json$/.test(x)).sort()) {
	const doc = JSON.parse(read(f));
	const ok = doc.results.filter((r) => r.runs > 0 && r.failed === 0);
	const dist = (pick) => {
		const xs = ok.map(pick).sort((a, b) => a - b);
		return { p50: pct(xs, 0.5), p90: pct(xs, 0.9), p99: pct(xs, 0.99), mean: xs.reduce((a, b) => a + b, 0) / xs.length };
	};
	const total = dist((r) => r.wfrtUs + r.hostUs);
	const wf = dist((r) => r.wfrtUs);
	const host = dist((r) => r.hostUs);
	const nodeRuns = ok.reduce((a, r) => a + r.nodeRuns, 0) / ok.length;
	const name = f.replace(/^warm-|\.json$/g, '');
	warm.push({ name, code: doc.code, n: ok.length, total, wf, host, nodeRuns });
	rows.push({
		suite: 'warm',
		workload: name,
		code: doc.code,
		shards: 1,
		host_workers: 2,
		conc: doc.conc,
		rate_per_s: (1e6 / total.mean).toFixed(0),
		p50_ms: (total.p50 / 1000).toFixed(3),
		p90_ms: (total.p90 / 1000).toFixed(3),
		p99_ms: (total.p99 / 1000).toFixed(3),
		wfrt_us_per_run: wf.mean.toFixed(0),
		host_us_per_run: host.mean.toFixed(0),
		node_runs_per_run: nodeRuns.toFixed(2),
		notes: 'CPU per run (p50/p90/p99 are CPU ms across workflows); rate = workflows/s per core at the mean',
	});
}

// Mix: all workflows at once.
const mix = read('mix.jsonl')
	.trim()
	.split('\n')
	.filter(Boolean)
	.map((l) => JSON.parse(l));
for (const m of mix) {
	rows.push({
		suite: 'mix',
		workload: 'synthetic',
		code: m.code,
		shards: m.shards,
		host_workers: m.workers,
		conc: m.conc,
		rate_per_s: m.rate.toFixed(1),
		p50_ms: m.p50ms.toFixed(2),
		p90_ms: m.p90ms.toFixed(2),
		p99_ms: m.p99ms.toFixed(2),
		wfrt_us_per_run: m.wfrtUsPerRun.toFixed(0),
		host_us_per_run: m.hostUsPerRun.toFixed(0),
		wfrt_cores: m.wfrtCores.toFixed(2),
		host_cores: m.hostCores.toFixed(2),
		stub_cores: m.stubCores?.toFixed(2) ?? '',
		node_runs_per_run: m.nodeRunsPerRun.toFixed(2),
		notes: `${m.failed} failed; ${m.label}`,
	});
}

const csv = [COLS.join(','), ...rows.map((r) => COLS.map((c) => String(r[c] ?? '').replaceAll(',', ';')).join(','))].join('\n');
writeFileSync(join(dir, 'results.csv'), `${csv}\n`);

// ---- summary.md ----
const md = [];
md.push(`# wfrt cloud benchmark: ${before.cpu_model ?? 'unknown CPU'}`, '');
md.push(`- Machine: ${before.cpu_model}, ${before.cores_online} cores (SMT ${before.smt_active}, NUMA nodes ${before.numa_nodes}), ${before.memory_gb} GB, ${before.virtualization}`);
md.push(`- Kernel ${before.kernel}; governor: ${before.governor}; Zig ${before.zig}; Node.js ${before.node}; commit ${before.git_commit}`);
md.push(`- CPU layout: server cores ${before.server_cpus}, load generator and stubs ${before.aux_cpus}${before.loadgen_ssh ? ' (load generator on a second machine)' : ''}`);
md.push(`- Load average (1, 5, 15 min): before ${before.load_avg_1_5_15}, after ${after.load_avg_1_5_15 ?? '?'}`);
md.push(`- Run: ${before.time} to ${after.time ?? '?'}`, '');

if (warm.length > 0) {
	md.push('## Warm: CPU per run, each workflow alone', '');
	md.push('| Set | Code steps | Workflows | Total p50 / p90 / p99 / mean (µs) | wfrt mean | Host mean | Node runs per run | Workflows/s per core |');
	md.push('|---|---|---|---|---|---|---|---|');
	for (const w of warm) {
		md.push(`| ${w.name} | ${w.code} | ${w.n} | ${f0(w.total.p50)} / ${f0(w.total.p90)} / ${f0(w.total.p99)} / ${f0(w.total.mean)} | ${f0(w.wf.mean)} | ${f0(w.host.mean)} | ${f2(w.nodeRuns)} | ${f0(1e6 / w.total.mean)} |`);
	}
	md.push('', 'For comparison, real workflows on an M5 Pro (docs/poc-report.md, 2026-11-12 t3): Code steps in the host 3,537 µs mean (p50 1,800, p90 8,950); native 2,883 µs (p50 600, p90 8,750).', '');
}

if (mix.length > 0) {
	md.push('## Mix: throughput by shards and host workers', '');
	md.push('| Code | Shards | Host workers | Conc | Workflows/s | p50 / p99 (ms) | wfrt cores | Host cores | wfrt µs/run | Host µs/run | Failed |');
	md.push('|---|---|---|---|---|---|---|---|---|---|---|');
	for (const m of mix) {
		md.push(`| ${m.code} | ${m.shards} | ${m.workers} | ${m.conc} | ${f0(m.rate)} | ${f2(m.p50ms)} / ${f1(m.p99ms)} | ${f2(m.wfrtCores)} | ${f2(m.hostCores)} | ${f0(m.wfrtUsPerRun)} | ${f0(m.hostUsPerRun)} | ${m.failed} |`);
	}
	md.push('');
}

const microRows = rows.filter((r) => r.suite === 'micro');
if (microRows.length > 0) {
	md.push('## W1 to W7 by shard count', '');
	md.push('| Workload | Shards | Rate/s | p50 / p99 (ms) | wfrt cores | Notes |');
	md.push('|---|---|---|---|---|---|');
	for (const r of microRows) md.push(`| ${r.workload} | ${r.shards} | ${f0(Number(r.rate_per_s))} | ${r.p50_ms || '–'} / ${r.p99_ms || '–'} | ${r.wfrt_cores} | ${r.notes ?? ''} |`);
	md.push('');
}
md.push('All rows: `results.csv`. Raw files: `micro.csv`, `warm-*.json`, `mix.jsonl`, `sysinfo-*.json`.');
writeFileSync(join(dir, 'summary.md'), `${md.join('\n')}\n`);
console.log(md.join('\n'));
