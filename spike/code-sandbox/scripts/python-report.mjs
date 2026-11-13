#!/usr/bin/env node
/**
 * Tables for SPIKE-RESULTS-opus-python.md from one full-pass.sh result folder
 * (the Python pass in the README).
 *
 *   node python-report.mjs <result folder>
 *
 * p50 / p95 / p99 use the nearest rank (index floor(p / 100 × n)), as in the
 * other spike reports. A p99 needs at least 200 samples, else "—".
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
	console.error('usage: python-report.mjs <result folder>');
	process.exit(1);
}

const readJsonl = (file) =>
	existsSync(file)
		? readFileSync(file, 'utf-8')
				.split('\n')
				.filter((l) => l.startsWith('{'))
				.map((l) => {
					try {
						return JSON.parse(l);
					} catch {
						return null;
					}
				})
				.filter(Boolean)
		: [];

function pct(values, p) {
	const v = values.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
	if (!v.length) return null;
	if (p === 99 && v.length < 200) return null;
	return v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))];
}
const fmt = (v) => (v === null || v === undefined ? '—' : String(Math.round(v * 10) / 10));
const trio = (values) => `${fmt(pct(values, 50))} / ${fmt(pct(values, 95))} / ${fmt(pct(values, 99))}`;
const duo = (values) => `${fmt(pct(values, 50))} / ${fmt(pct(values, 95))}`;

const WORKLOADS = {
	spikeWPY00000001: 'WPY1',
	spikeWPY50000001: 'WPY5',
	spikeWMIX0000001: 'WMIX',
	spikeW1000000001: 'W1',
};

const folders = readdirSync(dir)
	.filter((f) => f.startsWith('latency-'))
	.map((f) => f.slice('latency-'.length));
const order = [
	'task-runners',
	'execution-fresh',
	'execution-fresh-spare',
	'execution-shared',
	'execution-shared-pool',
	'workflow-fresh-spare',
	'workflow-shared',
	'workflow-shared-pool',
];
folders.sort((a, b) => order.indexOf(a) - order.indexOf(b));

console.log(`# Python pass: ${dir}\n`);
if (existsSync(join(dir, 'host.txt'))) console.log(readFileSync(join(dir, 'host.txt'), 'utf-8'));

// 1. Client latency and throughput.
console.log('\n## Client latency (webhook to response), p50 / p95 / p99 ms, and executions/s\n');
console.log('| Config | Workload | Runs | Failed | p50 / p95 / p99 | Executions/s |');
console.log('|---|---|---|---|---|---|');
for (const f of folders) {
	for (const r of readJsonl(join(dir, `latency-${f}`, 'client.jsonl'))) {
		if (r.type !== 'client_summary') continue;
		const wl = r.label.replace(`-${f}`, '');
		const p99 = r.runs >= 200 ? r.p99 : '—';
		console.log(`| ${f} | ${wl} | ${r.runs} | ${r.failed} | ${r.p50} / ${r.p95} / ${p99} | ${r.throughput} |`);
	}
}

// 2. Overhead per task.
console.log('\n## Overhead per task (ms, p50 / p95 / p99). First = waited for a create or a claim\n');
console.log('| Config | Workload | Language | Task | n | Overhead | Create or claim | Run (worker) | Daemon handoff |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const f of folders) {
	const tasks = readJsonl(join(dir, `latency-${f}`, 'timings.jsonl')).filter(
		(r) => r.type === 'code_sandbox_task' && r.outcome === 'ok',
	);
	if (!tasks.length) continue;
	// The THROUGHPUT runs (WPY1-c5) come after all other workloads of the
	// pass. A WPY1 task after the last task of another workload belongs to it.
	const boundary = Math.max(
		...tasks.filter((t) => t.workflowId !== 'spikeWPY00000001').map((t) => t.ts),
	);
	const groups = new Map();
	for (const t of tasks) {
		let wl = WORKLOADS[t.workflowId] ?? t.workflowId;
		if (wl === 'WPY1' && t.ts > boundary) wl = 'WPY1-c5';
		const kind = t.leaseHit ? 'later' : t.createTimings?.pooled ? 'first (pool)' : 'first (create)';
		const key = `${wl}|${t.language ?? 'javascript'}|${kind}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(t);
	}
	for (const [key, list] of [...groups.entries()].sort()) {
		const [wl, lang, kind] = key.split('|');
		console.log(
			`| ${f} | ${wl} | ${lang} | ${kind} | ${list.length} | ${trio(list.map((t) => t.overhead))} | ${duo(
				list.map((t) => t.t_create),
			)} | ${duo(list.map((t) => t.t_run))} | ${duo(list.map((t) => t.daemon?.handoff))} |`,
		);
	}
}

// 3. Resources per sandbox.
console.log('\n## Resources per sandbox (cgroup of the sandbox container, read before the delete)\n');
console.log('| Config | Runtime | Sandboxes | Memory peak MiB p50 / p95 | CPU ms p50 / p95 | Processes started p50 / max |');
console.log('|---|---|---|---|---|---|');
for (const f of folders) {
	const events = readJsonl(join(dir, `latency-${f}`, 'timings.jsonl')).filter(
		(r) => r.type === 'code_sandbox_event' && r.name === 'processes',
	);
	const byRuntime = new Map();
	for (const e of events) {
		const rt = e.runtime ?? 'n8n-js';
		if (!byRuntime.has(rt)) byRuntime.set(rt, []);
		byRuntime.get(rt).push(e);
	}
	for (const [rt, list] of [...byRuntime.entries()].sort()) {
		const workers = list.map((e) => e.workersStarted);
		console.log(
			`| ${f} | ${rt} | ${list.length} | ${duo(list.map((e) => e.memoryPeakBytes / 1048576))} | ${duo(
				list.map((e) => e.cpuUsageUsec / 1000),
			)} | ${fmt(pct(workers, 50))} / ${fmt(Math.max(...workers))} |`,
		);
	}
}

// 4. Sandboxes per execution.
console.log('\n## Sandboxes per execution\n');
console.log('| Config | Workload | Executions | Sandboxes per execution (mean) |');
console.log('|---|---|---|---|');
for (const f of folders) {
	const tasks = readJsonl(join(dir, `latency-${f}`, 'timings.jsonl')).filter(
		(r) => r.type === 'code_sandbox_task',
	);
	const byWl = new Map();
	for (const t of tasks) {
		const wl = WORKLOADS[t.workflowId] ?? t.workflowId;
		if (!byWl.has(wl)) byWl.set(wl, { executions: new Set(), sandboxes: new Set() });
		byWl.get(wl).executions.add(t.executionId);
		byWl.get(wl).sandboxes.add(t.sandboxId);
	}
	for (const [wl, g] of [...byWl.entries()].sort()) {
		console.log(
			`| ${f} | ${wl} | ${g.executions.size} | ${fmt(g.sandboxes.size / g.executions.size)} |`,
		);
	}
}

// 5. Outcomes.
console.log('\n## Task outcomes\n');
for (const f of folders) {
	const tasks = readJsonl(join(dir, `latency-${f}`, 'timings.jsonl')).filter(
		(r) => r.type === 'code_sandbox_task',
	);
	if (!tasks.length) continue;
	const counts = {};
	for (const t of tasks) counts[`${t.language ?? 'javascript'}:${t.outcome}`] = (counts[`${t.language ?? 'javascript'}:${t.outcome}`] ?? 0) + 1;
	console.log(`- ${f}: ${JSON.stringify(counts)}`);
}
