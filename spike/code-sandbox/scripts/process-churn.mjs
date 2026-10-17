#!/usr/bin/env node
/**
 * Process churn: how many worker processes the sandboxes start, per workload,
 * scope mode and worker mode. Reads the timing records.
 *
 *   node process-churn.mjs <mode>=<timings.jsonl> [<mode>=<timings.jsonl> ...]
 *
 * <mode> is one of:
 *   per-task         a new process per task, spare workers on
 *   per-task-nospare a new process per task, spare workers off
 *   reuse            worker reuse, spare workers on
 *
 * Counts per sandbox (checked by TestWorkersStarted in the code daemon):
 *   per-task:         slots (first spares) + tasks (one new spare after each task)
 *   per-task-nospare: tasks
 *   reuse:            1 shared process + 1 per task that ended it (crash, out of memory, or a
 *                     timeout or cancel that the process did not confirm). The computed count
 *                     treats every such task as a restart, so it can be too high.
 * "Used" processes ran at least one task (daemon timing workerTasks = 1).
 * "Measured" is the daemon counter workersStarted, read before the delete
 * (code_sandbox_event "processes"). It is empty if the records do not have it.
 */
import { readFileSync } from 'node:fs';

const DEFAULT_SLOTS = { node: 1, execution: 2, workflow: 4 };
const KILLING_OUTCOMES = new Set(['timeout', 'cancelled', 'oom', 'infra_error']);

function workloadOf(workflowId = '') {
	if (workflowId.startsWith('spikeW14')) return 'W14';
	if (workflowId === 'spikeW9000000002') return 'W9 (sub-workflow)';
	if (workflowId === 'spikeW5000000002') return 'W5b';
	const m = /^spikeW(\d+?)0+(\d+)$/.exec(workflowId);
	if (m) return `W${m[1]}`;
	return 'js-code-node';
}

const rows = new Map();
for (const arg of process.argv.slice(2)) {
	const [mode, file] = arg.split('=');
	const records = readFileSync(file, 'utf-8')
		.split('\n')
		.filter((l) => l.startsWith('{"type":"code_sandbox_'))
		.map((l) => JSON.parse(l));
	const tasks = records.filter((r) => r.type === 'code_sandbox_task' && r.sandboxId);
	// Slots per sandbox from the lease records. A lease that n8n released at
	// shutdown can miss its record, so fall back to the default of the scope.
	const slotsBySandbox = new Map(
		records.filter((r) => r.type === 'code_sandbox_lease').map((l) => [l.sandboxId, l.slots]),
	);
	const measuredBySandbox = new Map(
		records
			.filter((r) => r.type === 'code_sandbox_event' && r.name === 'processes')
			.map((e) => [e.sandboxId, e.workersStarted]),
	);
	const tasksBySandbox = new Map();
	for (const t of tasks) {
		const list = tasksBySandbox.get(t.sandboxId) ?? [];
		list.push(t);
		tasksBySandbox.set(t.sandboxId, list);
	}
	for (const [sandboxId, own] of tasksBySandbox) {
		const first = own[0];
		const slots = slotsBySandbox.get(sandboxId) ?? DEFAULT_SLOTS[first.scopeMode];
		const key = `${workloadOf(first.workflowId)}|${first.scopeMode}|${mode}`;
		const row = rows.get(key) ?? {
			executions: new Set(),
			tasks: 0,
			sandboxes: 0,
			started: 0,
			used: 0,
			measured: 0,
			measuredSandboxes: 0,
			computedForMeasured: 0,
		};
		row.sandboxes++;
		row.tasks += own.length;
		for (const t of own) if (t.executionId) row.executions.add(t.executionId);
		let computed;
		if (mode === 'per-task') computed = slots + own.length;
		else if (mode === 'per-task-nospare') computed = own.length;
		else computed = 1 + own.filter((t) => KILLING_OUTCOMES.has(t.outcome)).length;
		row.started += computed;
		const measured = measuredBySandbox.get(sandboxId);
		if (typeof measured === 'number') {
			row.measured += measured;
			row.measuredSandboxes++;
			row.computedForMeasured += computed;
		}
		row.used += own.filter((t) => (t.daemon?.workerTasks ?? 1) === 1).length;
		rows.set(key, row);
	}
}

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
console.log(
	'| workload | scope | mode | executions | tasks | sandboxes | processes started | used | started per execution | started per task | tasks per used process | measured (sandboxes) | computed for the same sandboxes |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [key, r] of [...rows.entries()].sort()) {
	const [w, s, m] = key.split('|');
	const ex = r.executions.size || 1;
	console.log(
		`| ${w} | ${s} | ${m} | ${r.executions.size} | ${r.tasks} | ${r.sandboxes} | ${r.started} | ${r.used} | ${fmt(r.started / ex)} | ${fmt(r.started / Math.max(1, r.tasks))} | ${fmt(r.tasks / Math.max(1, r.used))} | ${r.measuredSandboxes ? `${r.measured} (${r.measuredSandboxes})` : '-'} | ${r.measuredSandboxes ? r.computedForMeasured : '-'} |`,
	);
}
