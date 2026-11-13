// Splits the host CPU of a warm run by node type and operation.
//   node bench/warm/host-profile.mjs <warm.json> <steps-dir> [--top 40] [--markdown]
//
// <warm.json> comes from `warm.ts --profile <steps-dir> --conc 1`. Each host
// worker wrote one line for each step to <steps-dir>/steps-<pid>.jsonl. The
// script keeps the steps inside the warm window of each workflow, so first
// runs and compile time do not count.
//
// Each workflow counts once, as in the production mix: a step's share is its
// CPU per run, summed over the workflows, divided by the host CPU per run
// (from `ps`), summed over the workflows. "Host outside steps" is the rest:
// the server process, IPC, and worker time between steps.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [resultsFile, stepsDir] = process.argv.slice(2);
const flag = (name, fallback) => {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : fallback;
};
const TOP = Number(flag('top', '40'));
const MARKDOWN = process.argv.includes('--markdown');
if (!resultsFile || !stepsDir) {
	console.error('usage: host-profile.mjs <warm.json> <steps-dir> [--top 40] [--markdown]');
	process.exit(2);
}

const doc = JSON.parse(readFileSync(resultsFile, 'utf8'));
const ok = doc.results.filter((r) => typeof r.runs === 'number' && r.runs > 0 && r.failed === 0 && Array.isArray(r.window));

const steps = [];
for (const f of readdirSync(stepsDir)) {
	if (!f.endsWith('.jsonl')) continue;
	for (const line of readFileSync(join(stepsDir, f), 'utf8').split('\n')) {
		if (line) steps.push(JSON.parse(line));
	}
}
steps.sort((a, b) => a.t - b.t);

const short = (type) => type.replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-langchain\./, 'lc.');
const byType = new Map();
const byOp = new Map();
const add = (map, key, perRun, stepsPerRun, cpuSteps, wf) => {
	const e = map.get(key) ?? { perRun: 0, stepsPerRun: 0, cpu: 0, count: 0, workflows: new Set() };
	e.perRun += perRun;
	e.stepsPerRun += stepsPerRun;
	e.cpu += cpuSteps.cpu;
	e.count += cpuSteps.count;
	e.workflows.add(wf);
	map.set(key, e);
};

let hostTotal = 0;
let overlapped = 0;
let counted = 0;
let lo = 0;
for (const r of ok) {
	const [t0, t1] = r.window;
	while (lo < steps.length && steps[lo].t < t0) lo++;
	const local = new Map();
	for (let i = lo; i < steps.length && steps[i].t <= t1; i++) {
		const s = steps[i];
		counted++;
		if (s.overlap) overlapped++;
		const type = short(s.type);
		const op = [s.resource, s.operation].filter(Boolean).join('.');
		const k = `${type}\u0000${op}`;
		const e = local.get(k) ?? { cpu: 0, count: 0 };
		e.cpu += s.cpu;
		e.count += 1;
		local.set(k, e);
	}
	hostTotal += r.hostUs;
	for (const [k, e] of local) {
		const [type, op] = k.split('\u0000');
		add(byType, type, e.cpu / r.runs, e.count / r.runs, e, r.id);
		add(byOp, op ? `${type} ${op}` : type, e.cpu / r.runs, e.count / r.runs, e, r.id);
	}
}

const inSteps = [...byType.values()].reduce((a, e) => a + e.perRun, 0);
const pct = (x) => `${((100 * x) / hostTotal).toFixed(1)}%`;
const us = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(1));

function table(title, map) {
	const rows = [...map.entries()].sort((a, b) => b[1].perRun - a[1].perRun).slice(0, TOP);
	let cum = 0;
	if (MARKDOWN) {
		console.log(`\n${title}\n`);
		console.log('| # | Step | Share of host CPU | Cumulative | CPU per step (µs) | Workflows |');
		console.log('|---|---|---|---|---|---|');
	} else {
		console.log(`\n${title}`);
	}
	rows.forEach(([key, e], i) => {
		cum += e.perRun;
		const cols = [String(i + 1), key, pct(e.perRun), pct(cum), us(e.cpu / e.count), String(e.workflows.size)];
		console.log(MARKDOWN ? `| ${cols.join(' | ')} |` : cols.join('\t'));
	});
}

console.log(
	`${ok.length} workflows, ${counted} steps (${((100 * overlapped) / Math.max(1, counted)).toFixed(1)}% overlapped), host CPU ${us(hostTotal / ok.length)} µs per run on average`,
);
console.log(`In steps: ${pct(inSteps)} of host CPU. Host outside steps: ${pct(hostTotal - inSteps)}.`);
table('By node type', byType);
table('By node type and operation', byOp);
