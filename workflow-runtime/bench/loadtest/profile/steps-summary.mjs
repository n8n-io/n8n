// Splits the host CPU of a window by node type and operation, from the host
// step profile (WF_FALLBACK_STEP_PROFILE lines), and gives per-step CPU.
//
//   node steps-summary.mjs <steps-dir> <window-start-ms> <window-end-ms> <host-cpu-seconds-in-window> [--top 30]
import fs from 'node:fs';
import path from 'node:path';

const [dir, a, b, hostCpuS] = process.argv.slice(2);
const TOP = Number(process.argv[process.argv.indexOf('--top') + 1] || 30);
const t0 = Number(a), t1 = Number(b);
const steps = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl')))
	for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n'))
		if (l) {
			const s = JSON.parse(l);
			if (s.t >= t0 && s.t <= t1) steps.push(s);
		}
const short = (t) => t.replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-langchain\./, 'lc.');
const groups = new Map();
let sum = 0;
for (const s of steps) {
	const k = `${short(s.type)}${s.resource ? `.${s.resource}` : ''}${s.operation ? `.${s.operation}` : ''}`;
	const g = groups.get(k) ?? { n: 0, cpu: 0, list: [] };
	g.n++;
	g.cpu += s.cpu;
	g.list.push(s.cpu);
	groups.set(k, g);
	sum += s.cpu;
}
const pct = (xs, p) => xs.sort((x, y) => x - y)[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const host = Number(hostCpuS) * 1e6;
const all = steps.map((s) => s.cpu);
console.log(`Window ${((t1 - t0) / 1000).toFixed(0)} s: ${steps.length} host steps, ${(steps.length / ((t1 - t0) / 1000)).toFixed(1)} steps/s.`);
console.log(`Step CPU (worker, from step message to result) is ${((100 * sum) / host).toFixed(1)}% of all host CPU; the rest is the host server process, IPC outside steps, and idle worker work.`);
console.log(`Per step CPU over all steps: p50 ${(pct(all, 0.5) / 1000).toFixed(2)} ms, p90 ${(pct(all, 0.9) / 1000).toFixed(2)} ms, mean ${(sum / steps.length / 1000).toFixed(2)} ms. ${steps.filter((s) => s.overlap).length} of ${steps.length} steps overlapped another step in the same worker (their CPU includes some of the other).`);
console.log('\n| Node type . resource . operation | Steps | Share of host CPU | CPU per step p50 (ms) | p90 (ms) | mean (ms) |\n|---|---|---|---|---|---|');
for (const [k, g] of [...groups].sort((x, y) => y[1].cpu - x[1].cpu).slice(0, TOP))
	console.log(`| ${k} | ${g.n} | ${((100 * g.cpu) / host).toFixed(1)}% | ${(pct(g.list, 0.5) / 1000).toFixed(2)} | ${(pct(g.list, 0.9) / 1000).toFixed(2)} | ${(g.cpu / g.n / 1000).toFixed(2)} |`);
