// Tables from the per-workflow attribution (attrib.jsonl), the native
// classes (classify.mjs) and the host step profile of the attribution run.
// Every workflow has the same weight, as in the load test's uniform sample.
// Aggregates and pool keys only (no workflow names or data).
//
//   node attrib-summary.mjs <attrib.jsonl> <classes.json> <steps-dir> [mix requests .jsonl...]
import fs from 'node:fs';
import path from 'node:path';

const [attribFile, classesFile, stepsDir, ...mixFiles] = process.argv.slice(2);
const rows = fs.readFileSync(attribFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const classes = JSON.parse(fs.readFileSync(classesFile, 'utf8'));
const steps = [];
for (const f of fs.existsSync(stepsDir) ? fs.readdirSync(stepsDir).filter((x) => x.endsWith('.jsonl')) : [])
	for (const l of fs.readFileSync(path.join(stepsDir, f), 'utf8').split('\n')) if (l) steps.push(JSON.parse(l));
steps.sort((a, b) => a.t - b.t);
const short = (t) => t.replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-langchain\./, 'lc.');

// Host steps inside each workflow's measured window.
const lower = (t) => {
	let lo = 0, hi = steps.length;
	while (lo < hi) {
		const m = (lo + hi) >> 1;
		if (steps[m].t < t) lo = m + 1;
		else hi = m;
	}
	return lo;
};
for (const r of rows) {
	if (!r.window) continue;
	const i0 = lower(r.window[0]), i1 = lower(r.window[1] + 1);
	const ws = steps.slice(i0, i1);
	r.hostSteps = ws.length / r.runs;
	r.stepCpuUs = ws.reduce((a, s) => a + s.cpu, 0) / r.runs;
	r.totalUs = r.wfrtUs + r.hostUs;
	r.cls = classes[r.key]?.cls ?? 'X';
	r.stepTypes = [...new Set(ws.map((s) => short(s.type)))];
}
const ran = rows.filter((r) => r.window && r.runs > 0);
const pct = (xs, p) => {
	const s = [...xs].sort((a, b) => a - b);
	return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN;
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const f0 = (x) => (Number.isFinite(x) ? x.toFixed(0) : '');

// Success in the mix run, by class.
const mixOk = new Map();
for (const f of mixFiles)
	for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
		if (!l) continue;
		const q = JSON.parse(l);
		const c = classes[q.key]?.cls ?? 'X';
		const m = mixOk.get(c) ?? { n: 0, ok: 0 };
		m.n++;
		if (q.status === 200) m.ok++;
		mixOk.set(c, m);
	}

const NAMES = { A: 'A fully native', B: 'B native except Code', C: 'C one host node step', D: 'D two or more host steps', E: 'E AI cluster', X: 'X not compiled' };
const out = [];
out.push('## Native classes', '');
out.push('Each workflow alone, one run in flight, after 2 warm-up runs (up to 10 runs or 3 s). CPU is from the cgroups of `wfrt` and the host. "wf/s per core" is 1 / mean CPU per successful-shape run. Success: the first run (attribution) and all runs of the 5-minute mix.', '');
out.push('| Class | Workflows | Share of runs | wfrt µs p50 / p90 / mean | host µs p50 / p90 / mean | total µs p50 / p90 / mean | wf/s per core | Host steps per run (mean) | Success (attribution) | Success (mix) |');
out.push('|---|---|---|---|---|---|---|---|---|---|');
const allCls = ['A', 'B', 'C', 'D', 'E', 'X'];
const totalWf = rows.length;
for (const c of allCls) {
	const rs = ran.filter((r) => r.cls === c);
	const n = rows.filter((r) => (classes[r.key]?.cls ?? 'X') === c).length;
	if (!n) continue;
	const w = rs.map((r) => r.wfrtUs), h = rs.map((r) => r.hostUs), t = rs.map((r) => r.totalUs);
	const ok = rows.filter((r) => (classes[r.key]?.cls ?? 'X') === c && r.firstStatus === 200).length;
	const m = mixOk.get(c);
	out.push(`| ${NAMES[c]} | ${n} | ${((100 * n) / totalWf).toFixed(1)}% | ${f0(pct(w, 0.5))} / ${f0(pct(w, 0.9))} / ${f0(mean(w))} | ${f0(pct(h, 0.5))} / ${f0(pct(h, 0.9))} / ${f0(mean(h))} | ${f0(pct(t, 0.5))} / ${f0(pct(t, 0.9))} / ${f0(mean(t))} | ${f0(1e6 / mean(t))} | ${mean(rs.map((r) => r.hostSteps)).toFixed(2)} | ${((100 * ok) / n).toFixed(1)}% | ${m ? `${((100 * m.ok) / m.n).toFixed(1)}%` : ''} |`);
}
const t = ran.map((r) => r.totalUs);
out.push(`| all | ${rows.length} | 100% | ${f0(pct(ran.map((r) => r.wfrtUs), 0.5))} / ${f0(pct(ran.map((r) => r.wfrtUs), 0.9))} / ${f0(mean(ran.map((r) => r.wfrtUs)))} | ${f0(pct(ran.map((r) => r.hostUs), 0.5))} / ${f0(pct(ran.map((r) => r.hostUs), 0.9))} / ${f0(mean(ran.map((r) => r.hostUs)))} | ${f0(pct(t, 0.5))} / ${f0(pct(t, 0.9))} / ${f0(mean(t))} | ${f0(1e6 / mean(t))} | ${mean(ran.map((r) => r.hostSteps)).toFixed(2)} | ${((100 * rows.filter((r) => r.firstStatus === 200).length) / rows.length).toFixed(1)}% | |`);

out.push('', '## CPU per run: distribution over workflows', '');
out.push('| | p10 | p25 | p50 | p75 | p90 | p99 | mean |', '|---|---|---|---|---|---|---|---|');
for (const [name, xs] of [['wfrt µs', ran.map((r) => r.wfrtUs)], ['host µs', ran.map((r) => r.hostUs)], ['total µs', t], ['host steps per run', ran.map((r) => r.hostSteps)]])
	out.push(`| ${name} | ${[0.1, 0.25, 0.5, 0.75, 0.9, 0.99].map((p) => pct(xs, p).toFixed(name.includes('steps') ? 2 : 0)).join(' | ')} | ${mean(xs).toFixed(name.includes('steps') ? 2 : 0)} |`);
const noHost = ran.filter((r) => r.hostSteps === 0);
out.push('', `Workflows with no host step in their runs: ${noHost.length} of ${ran.length} (${((100 * noHost.length) / ran.length).toFixed(1)}%).`);
out.push(`Of all workflows, ${((100 * ran.filter((r) => r.wfrtUs < 50).length) / ran.length).toFixed(1)}% have wfrt CPU under 50 µs per run, so would be under 50 µs without host steps; ${((100 * noHost.filter((r) => r.totalUs < 50).length) / ran.length).toFixed(1)}% are under 50 µs in total today. wfrt CPU of no-host workflows: p50 ${f0(pct(noHost.map((r) => r.wfrtUs), 0.5))} µs, p90 ${f0(pct(noHost.map((r) => r.wfrtUs), 0.9))} µs; host CPU of no-host workflows (the server process): mean ${f0(mean(noHost.map((r) => r.hostUs)))} µs.`);

const sumT = t.reduce((a, b) => a + b, 0);
const top = [...ran].sort((a, b) => b.totalUs - a.totalUs);
let acc = 0, k10 = 0, k50 = 0;
for (const [i, r] of top.entries()) {
	acc += r.totalUs;
	if (!k10 && acc >= 0.5 * sumT) k50 = i + 1;
	if (!k10 && i + 1 >= top.length * 0.1) k10 = acc / sumT;
}
out.push('', '## Workflows that dominate total CPU', '');
out.push(`The top 10% of workflows by CPU per run take ${(100 * k10).toFixed(1)}% of all CPU; ${k50} workflows (${((100 * k50) / top.length).toFixed(1)}%) take half of it.`, '');
out.push('| Key | Class | total µs/run | wfrt µs | host µs | host steps/run | step CPU µs/run | Host step node types |', '|---|---|---|---|---|---|---|---|');
for (const r of top.slice(0, 25)) out.push(`| ${r.key} | ${r.cls} | ${f0(r.totalUs)} | ${f0(r.wfrtUs)} | ${f0(r.hostUs)} | ${r.hostSteps.toFixed(1)} | ${f0(r.stepCpuUs)} | ${r.stepTypes.join(', ')} |`);

// Host CPU by node type across workflows (equal weight per workflow).
const byType = new Map();
for (const r of ran) {
	const i0 = lower(r.window[0]), i1 = lower(r.window[1] + 1);
	for (const s of steps.slice(i0, i1)) {
		const k = short(s.type);
		const g = byType.get(k) ?? { n: 0, cpu: 0, list: [] };
		g.n += 1 / r.runs;
		g.cpu += s.cpu / r.runs;
		g.list.push(s.cpu);
		byType.set(k, g);
	}
}
const hostSum = ran.reduce((a, r) => a + r.hostUs, 0);
out.push('', '## Host CPU by node type (attribution run, one step at a time)', '');
out.push('| Node type | Steps per pool pass | Share of host CPU | CPU per step p50 (µs) | p90 (µs) |', '|---|---|---|---|---|');
for (const [k, g] of [...byType].sort((a, b) => b[1].cpu - a[1].cpu).slice(0, 30))
	out.push(`| ${k} | ${g.n.toFixed(0)} | ${((100 * g.cpu) / hostSum).toFixed(1)}% | ${f0(pct(g.list, 0.5))} | ${f0(pct(g.list, 0.9))} |`);
const stepShare = ran.reduce((a, r) => a + r.stepCpuUs, 0) / hostSum;
out.push('', `Step CPU (worker, step message to result) is ${(100 * stepShare).toFixed(1)}% of host CPU in this run; the rest is the host server process and IPC outside the steps.`);

// Failures.
const failed = rows.filter((r) => r.notLoaded || r.firstStatus !== 200);
const norm = (e) =>
	String(e ?? '')
		.replace(/"stack(trace)?":.*$/s, '')
		.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '<id>')
		.replace(/\d{3,}/g, '<n>')
		.slice(0, 140);
const groups = new Map();
for (const r of failed) {
	const k = r.notLoaded ? `not loaded: ${norm(r.notLoaded)}` : `${r.firstStatus} ${norm(r.error)}`;
	groups.set(k, [...(groups.get(k) ?? []), r.key]);
}
out.push('', `## Workflows that fail on the compiled engine: ${failed.length} of ${rows.length}`, '');
out.push('| Error (first run) | Workflows | Keys |', '|---|---|---|');
for (const [k, keys] of [...groups].sort((a, b) => b[1].length - a[1].length)) out.push(`| ${k.replace(/\|/g, '/').replace(/\n/g, ' ')} | ${keys.length} | ${keys.slice(0, 12).join(' ')}${keys.length > 12 ? ' …' : ''} |`);
console.log(out.join('\n'));
