// Writes summary.md for a load-test run folder: the saturation point of each
// ramp, all steps, CPU and RSS per component, success against the
// reference, and the node types of the workflows each engine failed. It
// prints aggregates only (no workflow ids, names or data).
//
// Success shows twice: over all keys, and without the keys of --exclude (by
// default data/keys-selfn8n.txt: workflows that call the reference n8n of
// the prepare step, which the load test does not run: a harness gap).
//
//   node summarize.mjs <run dir> [pool.jsonl] [--exclude keys.txt]
import fs from 'node:fs';
import path from 'node:path';
import { readBundle } from './lib/bundle.mjs';
import { keyOf, readPool } from './lib/poolfile.mjs';

const dir = process.argv[2];
const poolFile = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : path.join(process.env.HOME, 'wfrt-loadtest', 'data', 'pool.jsonl');
const exI = process.argv.indexOf('--exclude');
const exFile = exI > 0 ? process.argv[exI + 1] : path.join(process.env.HOME, 'wfrt-loadtest', 'data', 'keys-selfn8n.txt');
const excluded = new Set(fs.existsSync(exFile) ? fs.readFileSync(exFile, 'utf8').split('\n').filter(Boolean) : []);
const lines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const steps = lines(path.join(dir, 'steps.jsonl'));
const f1 = (x) => (x === null || x === undefined ? '' : Number(x).toFixed(1));
const f0 = (x) => (x === null || x === undefined ? '' : Number(x).toFixed(0));
const pc = (x) => (x === null || x === undefined ? '' : `${(100 * x).toFixed(1)}%`);
const out = [];
/** Success of one step without the excluded keys, from its request file. */
const successEx = (s) => {
	const rs = lines(path.join(dir, `requests-${s.label}-c${s.conc}.jsonl`)).filter((r) => !excluded.has(r.key));
	return rs.length ? rs.filter((r) => r.status === 200).length / rs.length : null;
};
const labels = [...new Set(steps.map((s) => s.label))];
const role = (name, s) => (name === 'loadgen' ? 'loadgen' : /^gym/.test(name) ? 'gym' : 'engine');
const engineCores = (s) => Object.entries(s.cpu).filter(([n]) => role(n) === 'engine').reduce((a, [, v]) => a + v.cores, 0);
const engineRss = (s) => Object.entries(s.cpu).filter(([n]) => role(n) === 'engine').reduce((a, [, v]) => a + (v.rssMB.max ?? 0), 0);
const gymShare = (s) => {
	const g = Object.entries(s.cpu).filter(([n]) => role(n) === 'gym');
	return g.length ? g.reduce((a, [, v]) => a + v.cores, 0) / g[0][1].budget : 0;
};

out.push(`# Load test: ${path.basename(dir)}`, '');
out.push('## Saturation point of each ramp', '');
out.push('The saturation point is the step with the most successful workflows per second.', '');
out.push('| Ramp | Engine | Budget (vCPU) | Setup | Conc | OK wf/s | All wf/s | Success (all) | Success (excl. self-n8n) | p50 ms | p90 ms | p99 ms | Engine cores | Engine CPU/OK run (ms) | Engine RSS max (MB) | Gym max share | Build |');
out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const sats = [];
for (const l of labels) {
	const ss = steps.filter((s) => s.label === l);
	const s = ss.reduce((a, b) => (b.okRate > a.okRate ? b : a), ss[0]);
	sats.push(s);
	const cores = engineCores(s);
	out.push(`| ${l} | ${s.engine} | ${s.budget} | ${s.mode} | ${s.conc} | ${f1(s.okRate)} | ${f1(s.rate)} | ${pc(s.successRate)} | ${pc(successEx(s))} | ${f0(s.p50)} | ${f0(s.p90)} | ${f0(s.p99)} | ${cores.toFixed(2)} | ${s.okRate ? f1((cores * 1000) / s.okRate) : ''} | ${f0(engineRss(s))} | ${pc(Math.max(...ss.map(gymShare)))} | ${String(s.build ?? '').slice(0, 14)} |`);
}
out.push('', '## Every step', '');
out.push('| Ramp | Conc | Done | wf/s | OK wf/s | Success (all) | Success (excl. self-n8n) | Node runs/s | p50 | p90 | p99 | max | Engine cores (share) | Gym cores (share) | Gym probe p50/p99 ms | Load gen cores | Load1 |');
out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const s of steps) {
	const e = engineCores(s);
	const g = Object.entries(s.cpu).filter(([n]) => role(n) === 'gym').reduce((a, [, v]) => a + v.cores, 0);
	out.push(`| ${s.label} | ${s.conc} | ${s.completed} | ${f1(s.rate)} | ${f1(s.okRate)} | ${pc(s.successRate)} | ${pc(successEx(s))} | ${f0(s.nodeRunsPerSec)} | ${f0(s.p50)} | ${f0(s.p90)} | ${f0(s.p99)} | ${f0(s.max)} | ${e.toFixed(2)} (${pc(e / s.budget)}) | ${g.toFixed(2)} (${pc(gymShare(s))}) | ${f1(s.gymProbe.p50)}/${f1(s.gymProbe.p99)} | ${f1(s.cpu.loadgen?.cores)} | ${f1(s.load1)} |`);
}
out.push('', '## CPU and RSS per component at the saturation point', '');
out.push('| Ramp | Component | User cores | System cores | Share of its CPUs | RSS min/mean/max (MB) |');
out.push('|---|---|---|---|---|---|');
for (const s of sats)
	for (const [n, v] of Object.entries(s.cpu))
		out.push(`| ${s.label} | ${n} | ${v.user.toFixed(2)} | ${v.system.toFixed(2)} | ${pc(v.share)} | ${v.rssMB.min}/${v.rssMB.mean}/${v.rssMB.max} |`);

// Failures by node type: keys that never succeeded in a ramp, with the node types of their workflows.
const rows = new Map(readPool(poolFile).map((r) => [keyOf(r.id), r]));
const typesOf = new Map();
const types = (k) => {
	if (!typesOf.has(k)) {
		const r = rows.get(k);
		let t = [];
		try {
			t = [...new Set(readBundle(r.dir).workflow.nodes.filter((n) => !n.disabled).map((n) => n.type.replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-langchain\./, 'lc.')))];
		} catch {
			// Missing bundle.
		}
		typesOf.set(k, t);
	}
	return typesOf.get(k);
};
out.push('', '## Workflows each engine could not run', '');
out.push('A workflow counts here when none of its runs in the ramp succeeded. "Node types" counts the node types of those workflows that are rare among the workflows the engine ran.', '');
out.push('| Ramp | Workflows run | Never succeeded | Never succeeded (excl. self-n8n) | Status mix of failures | Most common node types in failed workflows (count) |');
out.push('|---|---|---|---|---|---|');
for (const l of labels) {
	const ok = new Map();
	const mix = {};
	for (const f of fs.readdirSync(dir).filter((x) => x.startsWith(`requests-${l}-c`))) {
		for (const r of lines(path.join(dir, f))) {
			ok.set(r.key, (ok.get(r.key) ?? false) || r.status === 200);
			if (r.status !== 200) mix[r.status] = (mix[r.status] ?? 0) + 1;
		}
	}
	const failed = [...ok].filter(([, v]) => !v).map(([k]) => k);
	const count = new Map();
	for (const k of failed) for (const t of types(k)) count.set(t, (count.get(t) ?? 0) + 1);
	const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, c]) => `${t} (${c})`).join(', ');
	out.push(`| ${l} | ${ok.size} | ${failed.length} | ${failed.filter((k) => !excluded.has(k)).length} | ${Object.entries(mix).map(([k, v]) => `${k}: ${v}`).join(', ')} | ${top} |`);
}
for (const f of ['sysinfo-before.json', 'sysinfo-after.json']) {
	if (fs.existsSync(path.join(dir, f))) out.push('', `## ${f}`, '', '```json', fs.readFileSync(path.join(dir, f), 'utf8').trim(), '```');
}
fs.writeFileSync(path.join(dir, 'summary.md'), `${out.join('\n')}\n`);
console.log(out.slice(0, 12 + labels.length).join('\n'));
