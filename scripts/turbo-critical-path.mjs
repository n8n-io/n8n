#!/usr/bin/env node
/**
 * Reports the build-time-weighted critical path of a Turborepo run, from a
 * `turbo run <task> --summarize` summary file. The critical path is the
 * dependency chain with the largest total duration — the lower bound on wall
 * time no amount of parallelism can beat. Use it to spot tasks worth
 * shrinking or edges worth removing.
 *
 * Usage: node scripts/turbo-critical-path.mjs [path-to-summary.json]
 * Defaults to the newest file in .turbo/runs/. Prints markdown; never fails.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TOP_N = 10;

function newestRunSummary() {
	const dir = join(process.cwd(), '.turbo', 'runs');
	const files = readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(dir, f))
		.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
	if (files.length === 0) throw new Error(`no run summaries in ${dir}`);
	return files[0];
}

function fmt(seconds) {
	return seconds >= 100 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

try {
	const file = process.argv[2] ?? newestRunSummary();
	const summary = JSON.parse(readFileSync(file, 'utf8'));

	const tasks = (summary.tasks ?? [])
		.filter((t) => t.execution?.startTime && t.execution?.endTime)
		.map((t) => ({
			id: t.taskId,
			dur: (t.execution.endTime - t.execution.startTime) / 1000,
			deps: t.dependencies ?? [],
			cached: t.cache?.status === 'HIT',
		}));
	if (tasks.length === 0) throw new Error(`no executed tasks in ${file}`);

	const byId = new Map(tasks.map((t) => [t.id, t]));
	const memo = new Map();
	function heaviestChain(id) {
		if (memo.has(id)) return memo.get(id);
		const task = byId.get(id);
		if (!task) return { total: 0, path: [] };
		// turbo graphs are acyclic, so plain recursion terminates
		let best = { total: 0, path: [] };
		for (const dep of task.deps) {
			const chain = heaviestChain(dep);
			if (chain.total > best.total) best = chain;
		}
		const result = { total: best.total + task.dur, path: [...best.path, id] };
		memo.set(id, result);
		return result;
	}

	let critical = { total: 0, path: [] };
	for (const t of tasks) {
		const chain = heaviestChain(t.id);
		if (chain.total > critical.total) critical = chain;
	}

	const cpu = tasks.reduce((sum, t) => sum + t.dur, 0);
	const wall =
		(Math.max(...summary.tasks.map((t) => t.execution?.endTime ?? 0)) -
			Math.min(
				...summary.tasks.filter((t) => t.execution?.startTime).map((t) => t.execution.startTime),
			)) /
		1000;
	const cachedCount = tasks.filter((t) => t.cached).length;

	const label = (t) => `\`${t.id}\`${t.cached ? ' (cache hit)' : ''}`;

	const lines = [
		`### Turbo critical path — \`${summary.execution?.command ?? 'run'}\``,
		'',
		`Wall ${fmt(wall)} · task CPU ${fmt(cpu)} · parallelism ${(cpu / wall).toFixed(1)}× · ${tasks.length} tasks (${cachedCount} cache hits)`,
		'',
		`**Critical path: ${fmt(critical.total)}** (${((critical.total / wall) * 100).toFixed(0)}% of wall time)`,
		'',
		...critical.path.map((id) => `- ${fmt(byId.get(id).dur)} ${label(byId.get(id))}`),
		'',
		`**Slowest tasks**`,
		'',
		...tasks
			.slice()
			.sort((a, b) => b.dur - a.dur)
			.slice(0, TOP_N)
			.map((t) => `- ${fmt(t.dur)} ${label(t)}`),
		'',
	];
	console.log(lines.join('\n'));
} catch (error) {
	// Reporting only — never break the build over it.
	console.log(`turbo-critical-path: skipped (${error.message})`);
}
