#!/usr/bin/env node
/**
 * Reads the timing records (code_sandbox_task, code_sandbox_lease) and prints
 * p50, p95 and p99 per workload, scope mode and variant (SPIKE-SPEC-opus.md,
 * section 10.5).
 *
 *   node analyze.mjs timings.jsonl [--variant spare-on] [--first-only] [--json]
 *
 * The workload comes from the workflow id (spikeW1... -> W1). A "first" task
 * is the first task on a new sandbox (leaseHit false); "first, pooled" is a first
 * task on a sandbox from the warm pool; "later" tasks reuse a sandbox. The pool estimate is overhead - t_create + 20 ms (section 10.7).
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		variant: { type: 'string', default: '' },
		json: { type: 'boolean', default: false },
	},
});
if (!positionals[0]) {
	console.error('usage: analyze.mjs timings.jsonl [--variant name]');
	process.exit(1);
}

const POOL_CLAIM_MS = 20;
const records = readFileSync(positionals[0], 'utf-8')
	.split('\n')
	.filter((l) => l.startsWith('{'))
	.map((l) => {
		try {
			return JSON.parse(l);
		} catch {
			return null;
		}
	})
	.filter(Boolean);

function workloadOf(workflowId = '') {
	const m = /^spikeW(\d+?)0+(\d+)$/.exec(workflowId);
	if (workflowId.startsWith('spikeW14')) return 'W14';
	if (workflowId === 'spikeW9000000002') return 'W9-sub';
	if (!m) return workflowId || 'unknown';
	return `W${m[1]}`;
}

function pct(values, p) {
	const v = values.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
	if (!v.length) return null;
	return v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))];
}

function stats(values) {
	const v = values.filter((x) => typeof x === 'number');
	return { n: v.length, p50: pct(v, 50), p95: pct(v, 95), p99: pct(v, 99) };
}

const tasks = records.filter((r) => r.type === 'code_sandbox_task');
const leases = records.filter((r) => r.type === 'code_sandbox_lease');

const taskFields = [
	't_total',
	'overhead',
	't_acquire',
	't_create',
	't_channel',
	't_build',
	't_send',
	't_run',
	't_accept_to_done',
	't_outputs',
	'slotWaitMs',
	'bytes_task_json',
	'rpc_count',
];

const groups = new Map();
for (const t of tasks) {
	// "first, pooled": the sandbox service gave the sandbox from its warm pool.
	const kind = t.leaseHit !== false ? 'later' : t.createTimings?.pooled ? 'first, pooled' : 'first';
	const key = `${workloadOf(t.workflowId)} | ${t.scopeMode} | ${kind}`;
	if (!groups.has(key)) groups.set(key, []);
	groups.get(key).push(t);
}

const out = { variant: args.variant, tasks: {}, leases: {}, outcomes: {}, flags: {} };
for (const [key, list] of [...groups.entries()].sort()) {
	const row = {};
	for (const f of taskFields) row[f] = stats(list.map((t) => t[f]));
	row.daemon_handoff = stats(list.map((t) => t.daemon?.handoff));
	row.daemon_inputWrite = stats(list.map((t) => t.daemon?.inputWrite));
	row.pool_estimate = stats(
		list
			.filter((t) => typeof t.t_create === 'number')
			.map((t) => t.overhead - t.t_create + POOL_CLAIM_MS),
	);
	out.tasks[key] = row;
}

for (const t of tasks) out.outcomes[t.outcome] = (out.outcomes[t.outcome] ?? 0) + 1;
out.flags = {
	randomKey: tasks.filter((t) => t.randomKey).length,
	binSentUnused: tasks.filter((t) => t.binSentUnused).length,
	sandboxOutOutsideBinary: tasks.filter((t) => t.sandboxOutOutsideBinary).length,
	retried: tasks.filter((t) => t.attempts > 1).length,
	leftoverFiles: tasks.filter((t) => (t.daemon?.leftoverFiles ?? 0) > 0).length,
};

const leaseGroups = new Map();
for (const l of leases) {
	const key = `${workloadOf(l.workflowId)} | ${l.scopeMode}`;
	if (!leaseGroups.has(key)) leaseGroups.set(key, []);
	leaseGroups.get(key).push(l);
}
for (const [key, list] of [...leaseGroups.entries()].sort()) {
	const span =
		Math.max(...list.map((l) => l.releasedAt)) - Math.min(...list.map((l) => l.createdAt));
	const reasons = {};
	for (const l of list) reasons[l.releaseReason] = (reasons[l.releaseReason] ?? 0) + 1;
	out.leases[key] = {
		sandboxes: list.length,
		createRatePerSec: span > 0 ? Math.round((list.length / (span / 1000)) * 100) / 100 : null,
		holdMs: stats(list.map((l) => l.holdMs)),
		idleRatio: stats(list.map((l) => Math.round(l.idleRatio * 100) / 100)),
		taskCount: stats(list.map((l) => l.taskCount)),
		executionCount: stats(list.map((l) => l.executionCount)),
		maxConcurrentTasks: stats(list.map((l) => l.maxConcurrentTasks)),
		createMs: stats(list.map((l) => l.createMs)),
		releaseReasons: reasons,
	};
}

if (args.json) {
	console.log(JSON.stringify(out, null, 2));
} else {
	const fmt = (s) => (s.n ? `${s.p50}/${s.p95}/${s.p99}` : '-');
	console.log(`# Tasks (p50/p95/p99 ms)${args.variant ? ` - ${args.variant}` : ''}`);
	console.log(
		'| workload | scope | task | n | total | overhead | pool est. | acquire | create | send | handoff | accept→done | run | outputs |',
	);
	console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
	for (const [key, r] of Object.entries(out.tasks)) {
		const [w, s, k] = key.split(' | ');
		console.log(
			`| ${w} | ${s} | ${k} | ${r.t_total.n} | ${fmt(r.t_total)} | ${fmt(r.overhead)} | ${fmt(r.pool_estimate)} | ${fmt(r.t_acquire)} | ${fmt(r.t_create)} | ${fmt(r.t_send)} | ${fmt(r.daemon_handoff)} | ${fmt(r.t_accept_to_done)} | ${fmt(r.t_run)} | ${fmt(r.t_outputs)} |`,
		);
	}
	console.log('\n# Leases');
	console.log(
		'| workload | scope | sandboxes | creates/s | hold p50/p95 | idle ratio p50 | tasks p50/p95 | executions p50/p95 | release reasons |',
	);
	console.log('|---|---|---|---|---|---|---|---|---|');
	for (const [key, l] of Object.entries(out.leases)) {
		const [w, s] = key.split(' | ');
		console.log(
			`| ${w} | ${s} | ${l.sandboxes} | ${l.createRatePerSec} | ${l.holdMs.p50}/${l.holdMs.p95} | ${l.idleRatio.p50} | ${l.taskCount.p50}/${l.taskCount.p95} | ${l.executionCount.p50}/${l.executionCount.p95} | ${JSON.stringify(l.releaseReasons)} |`,
		);
	}
	console.log('\n# Outcomes', JSON.stringify(out.outcomes));
	console.log('# Flags', JSON.stringify(out.flags));
}
