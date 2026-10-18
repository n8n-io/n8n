#!/usr/bin/env node
/**
 * Prints a summary of one pass result folder (pool-pass.sh or reuse-ab-pass.sh):
 * host, load, client latency, overhead per task, n8n benchmark, direct k6
 * benchmark and task outcomes.
 *
 *   node summarize.mjs <result folder>
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) {
	console.error('usage: summarize.mjs <result folder>');
	process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf-8') : '');
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const q = (a, p) => {
	if (!a.length) return '-';
	const s = [...a].sort((x, y) => x - y);
	return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

console.log(`# ${dir}\n`);
console.log(read('host.txt').trim());
const loads = read('load-avg.txt')
	.split('\n')
	.map((l) => Number(l.trim().split(/\s+/)[1]))
	.filter((n) => !Number.isNaN(n));
console.log(`load average (1 min): p50 ${q(loads, 0.5)}, min ${q(loads, 0)}, max ${q(loads, 1)}\n`);

console.log('## Client latency, p50 / p95 (ms)\n');
for (const l of read('latency.txt').split('\n')) {
	if (!l.startsWith('{"label"')) continue;
	const r = JSON.parse(l);
	console.log(`- ${r.label}: ${r.p50} / ${r.p95} (runs ${r.runs}, failed ${r.failed})`);
}

const outcomes = {};
const addOutcomes = (o) => {
	for (const [k, v] of Object.entries(o ?? {})) outcomes[k] = (outcomes[k] ?? 0) + v;
};
const analyze = (file) =>
	JSON.parse(execFileSync('node', [join(here, 'analyze.mjs'), file, '--json'], { encoding: 'utf-8' }));
const fmt = (s) => (s?.n ? `${s.p50}/${s.p95}` : '-');

console.log('\n## Overhead per task (ms, p50/p95)\n');
console.log('| run | group | n | total | overhead | create | channel | send | handoff | accept→done | run | rpc post/call |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
const timingDirs = [];
for (const d of readdirSync(dir)) if (d.startsWith('latency-')) timingDirs.push(d);
if (existsSync(join(dir, 'benchmark')))
	for (const d of readdirSync(join(dir, 'benchmark'))) timingDirs.push(join('benchmark', d));
for (const d of timingDirs.sort()) {
	const f = join(dir, d, 'timings.jsonl');
	if (!existsSync(f)) continue;
	const out = analyze(f);
	addOutcomes(out.outcomes);
	for (const [key, r] of Object.entries(out.tasks)) {
		console.log(
			`| ${d} | ${key} | ${r.t_total.n} | ${fmt(r.t_total)} | ${fmt(r.overhead)} | ${fmt(r.t_create)} | ${fmt(r.t_channel)} | ${fmt(r.t_send)} | ${fmt(r.daemon_handoff)} | ${fmt(r.t_accept_to_done)} | ${fmt(r.t_run)} | ${fmt(r.rpc_post_per_call)} |`,
		);
	}
}

console.log('\n## n8n benchmark (js-code-node)\n');
if (existsSync(join(dir, 'benchmark'))) {
	for (const d of readdirSync(join(dir, 'benchmark')).sort()) {
		const k6 = strip(read(join('benchmark', d, 'k6.txt')));
		const it = k6.match(/iterations\.*:\s+\d+\s+([\d.]+)\/s/);
		const dur = k6.match(/http_req_duration\.*:.*?med=([\d.]+\w+).*?p\(95\)=([\d.]+\w+)/);
		const checks = k6.match(/checks\.*:\s+([\d.]+%)/);
		console.log(`- ${d}: ${it?.[1] ?? '?'} executions/s, p50 ${dur?.[1] ?? '?'}, p95 ${dur?.[2] ?? '?'}, checks ${checks?.[1] ?? '?'}`);
	}
}

console.log('\n## Direct Task API benchmark (k6)\n');
for (const f of readdirSync(dir).filter((n) => n.startsWith('k6-') && n.endsWith('.txt')).sort()) {
	const k6 = strip(read(f));
	const parts = [];
	for (const m of k6.matchAll(/(code_[a-z_]+)\.*:\s+(avg=.*|\d+\s+[\d.]+\/s)/g)) {
		const [, name, rest] = m;
		const med = rest.match(/med=([\d.]+\w+)/)?.[1];
		const p95 = rest.match(/p\(95\)=([\d.]+\w+)/)?.[1];
		if (med) parts.push(`${name} ${med}/${p95}`);
		else parts.push(`${name} ${rest.split(/\s+/)[0]}`);
	}
	console.log(`- ${f}: ${parts.join(', ')}`);
}

console.log(`\n## Task outcomes\n\n${JSON.stringify(outcomes)}`);
