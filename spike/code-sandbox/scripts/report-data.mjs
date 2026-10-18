#!/usr/bin/env node
/**
 * Computes the tables of SPIKE-RESULTS-opus-template.md from the raw data of
 * one full pass (full-pass.sh). Prints a Markdown data sheet.
 *
 *   node report-data.mjs <AB_DIR> [--warmup 20] [--loop-warmup 2] > data.md
 *
 * Percentiles: nearest rank on the sorted samples (index floor(p/100 × n)),
 * the same as run-workload.mjs. A p99 needs at least 200 samples, else "—".
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		warmup: { type: 'string', default: '20' },
		'loop-warmup': { type: 'string', default: '2' },
	},
});
const AB = positionals[0];
if (!AB) throw new Error('usage: report-data.mjs <AB_DIR>');
const WARMUP = Number(args.warmup);
const LOOP_WARMUP = Number(args['loop-warmup']);

const MODES = ['node', 'execution', 'workflow'];
const OPTIONS = ['fresh-spare', 'shared', 'shared-pool'];
const OPTION_LABEL = { 'fresh-spare': '`fresh-spare`', shared: '`shared`', 'shared-pool': '`shared + pool`' };
const BENCH_SUFFIX = { 'fresh-spare': '', shared: '-reuse', 'shared-pool': '-reuse-pool' };

// ---------- helpers ----------
const readJsonl = (file) =>
	existsSync(file)
		? readFileSync(file, 'utf-8')
				.split('\n')
				.filter((l) => l.trim().startsWith('{'))
				.map((l) => {
					try {
						return JSON.parse(l);
					} catch {
						return undefined;
					}
				})
				.filter(Boolean)
		: [];
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
function stats(values) {
	const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
	if (!v.length) return { n: 0 };
	return {
		n: v.length,
		p50: pct(v, 50),
		p95: pct(v, 95),
		p99: pct(v, 99),
		max: v.at(-1),
		mean: v.reduce((a, b) => a + b, 0) / v.length,
	};
}
/** Max runner memory over the polls that read it, with "ok polls / polls". */
function pollMem(poll) {
	const ok = poll.filter((x) => x.memory?.containers > 0);
	if (!ok.length) return `not read (0 of ${poll.length} polls)`;
	return `${Math.max(...ok.map((x) => x.memory.totalMiB))} (${ok.length} of ${poll.length} polls)`;
}
const r = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? (Math.round(x * 10 ** d) / 10 ** d).toString() : '—');
const dOf = (s) => (s.p50 !== undefined && s.p50 < 10 ? 1 : 0);
/** "p50 / p95 / p99"; p99 only with 200+ samples. */
function f3(s, d) {
	if (!s || !s.n) return '—';
	d ??= dOf(s);
	return `${r(s.p50, d)} / ${r(s.p95, d)} / ${s.n >= 200 ? r(s.p99, d) : '—'}`;
}
function f2(s, d) {
	if (!s || !s.n) return '—';
	d ??= dOf(s);
	return `${r(s.p50, d)} / ${r(s.p95, d)}`;
}
const nOf = (s) => (s && s.n ? s.n : 0);

function workloadOf(workflowId = '') {
	if (workflowId.startsWith('spikeW14')) return 'WLOAD-W14';
	if (workflowId.startsWith('spikeW9')) return 'WLOAD-W9';
	if (workflowId.startsWith('spikeW1000')) return 'W1';
	if (workflowId.startsWith('spikeW2')) return 'W5';
	if (workflowId.startsWith('spikeW3')) return 'WLOOP';
	if (workflowId.startsWith('spikeW6')) return 'WHTTP';
	if (workflowId === 'spikeW5000000001') return 'WFILE';
	return 'js-code-node';
}
const CLIENT_LABEL = { W1: 'W1', W5: 'W2', WLOOP: 'W3', WHTTP: 'W6' };

function loadTimings(file) {
	const recs = readJsonl(file);
	return {
		tasks: recs.filter((x) => x.type === 'code_sandbox_task'),
		leases: recs.filter((x) => x.type === 'code_sandbox_lease'),
		procs: recs.filter((x) => x.type === 'code_sandbox_event' && x.name === 'processes'),
	};
}

/** Drops the tasks of the first `n` executions of each workflow (the warm-up runs). */
function dropWarmup(tasks, warmupFor) {
	const order = new Map();
	for (const t of tasks) {
		const w = t.workflowId ?? '';
		if (!order.has(w)) order.set(w, []);
		const list = order.get(w);
		if (!list.includes(t.executionId)) list.push(t.executionId);
	}
	const skip = new Set();
	for (const [w, list] of order) for (const e of list.slice(0, warmupFor(workloadOf(w)))) skip.add(e);
	return tasks.filter((t) => !skip.has(t.executionId));
}

const latencyDir = (name) => join(AB, `latency-${name}`);
const benchDir = (name) => join(AB, 'benchmark', name);
const clientSummaries = (dir) => readJsonl(join(dir, 'client.jsonl')).filter((x) => x.type === 'client_summary');

function config(mode, opt) {
	const lat = loadTimings(join(latencyDir(`${mode}-${opt}`), 'timings.jsonl'));
	const benches = {};
	for (const vus of [1, 5]) {
		const dir = benchDir(`sandbox-${mode}${BENCH_SUFFIX[opt]}-vus${vus}`);
		benches[vus] = { dir, ...loadTimings(join(dir, 'timings.jsonl')) };
	}
	const warmupFor = (w) => (w === 'WLOOP' ? LOOP_WARMUP : WARMUP);
	return {
		mode,
		opt,
		lat,
		latTasks: dropWarmup(lat.tasks, warmupFor),
		client: clientSummaries(latencyDir(`${mode}-${opt}`)),
		benches,
		poll: readJsonl(join(AB, `poll-${mode}-${opt}.jsonl`)),
	};
}
const configs = {};
for (const m of MODES) for (const o of OPTIONS) configs[`${m}-${o}`] = config(m, o);
const fresh = {
	lat: loadTimings(join(latencyDir('execution-fresh'), 'timings.jsonl')),
	bench: loadTimings(join(benchDir('sandbox-execution-fresh-vus1'), 'timings.jsonl')),
};

const out = [];
const p = (s = '') => out.push(s);
const table = (head, rows) => {
	p(`| ${head.join(' | ')} |`);
	p(`|${head.map(() => '---').join('|')}|`);
	for (const row of rows) p(`| ${row.join(' | ')} |`);
	p();
};

// ---------- host ----------
p(`# Data sheet: ${AB}`);
p();
p('```');
p(existsSync(join(AB, 'host.txt')) ? readFileSync(join(AB, 'host.txt'), 'utf-8').trim() : 'no host.txt');
p('```');
const load = existsSync(join(AB, 'load-avg.txt'))
	? readFileSync(join(AB, 'load-avg.txt'), 'utf-8').trim().split('\n').map((l) => Number(l.split(' ')[1]))
	: [];
p(`Load average (1 min) during the pass: ${f2(stats(load), 1)} (p50 / p95), max ${r(stats(load).max, 1)}`);
p();

// ---------- section 4 ----------
p('## 4. Building blocks (direct Task API)');
const D = join(AB, 'direct');
const creates = readJsonl(join(D, 'creates.jsonl'));
const seqC = creates.filter((x) => x.kind === 'seq');
const b10 = creates.filter((x) => x.kind === 'burst10');
const b50 = creates.filter((x) => x.kind === 'burst50');
const claims = readJsonl(join(D, 'claims.jsonl'));
const cburst = readJsonl(join(D, 'claim-burst.jsonl'));
const proc = readJsonl(join(D, 'procstart.jsonl'));
const idle = readJsonl(join(D, 'idle.jsonl'));
const okMs = (list) => stats(list.filter((x) => x.ok).map((x) => x.ms));
const failNote = (list) => {
	const failed = list.filter((x) => !x.ok).length;
	return failed ? `, ${failed} of ${list.length} failed` : '';
};
const rpcPerCall = (tasks) =>
	stats(
		tasks
			.filter((t) => workloadOf(t.workflowId) === 'WHTTP' && t.daemon?.worker?.rpcCount > 0)
			.map((t) => t.daemon.worker.rpcMs / t.daemon.worker.rpcCount),
	);
const rpcExec = rpcPerCall(configs['execution-shared'].latTasks);
const pooledBurst = cburst.filter((x) => x.ok && x.pooled);
const createdBurst = cburst.filter((x) => x.ok && !x.pooled);
table(
	['Operation', 'n', 'p50 / p95 / p99 (ms)', 'Notes'],
	[
		['Create, one at a time', nOf(okMs(seqC)), f3(okMs(seqC)), `runner create ${f2(stats(seqC.map((x) => x.timings?.runnerCreate)))}; first spare ready ${f2(stats(seqC.map((x) => x.timings?.spareReady)))}${failNote(seqC)}`],
		['Create, 10 at the same time', nOf(okMs(b10)), f3(okMs(b10)), `${failNote(b10).slice(2) || 'no failures'}`],
		['Create, 50 at the same time', nOf(okMs(b50)), f3(okMs(b50)), `${failNote(b50).slice(2) || 'no failures'}`],
		['Claim from the pool', nOf(okMs(claims.filter((x) => x.pooled))), f3(okMs(claims.filter((x) => x.pooled))), `API claim time ${f2(stats(claims.filter((x) => x.pooled).map((x) => x.claim ?? 0)), 1)}; ${claims.filter((x) => !x.pooled).length} of ${claims.length} not from the pool`],
		['Claim during a burst larger than the pool', nOf(okMs(cburst)), f3(okMs(cburst)), `from the pool ${pooledBurst.length}: ${f2(stats(pooledBurst.map((x) => x.ms)))}; created ${createdBurst.length}: ${f2(stats(createdBurst.map((x) => x.ms)))}${failNote(cburst)}`],
		['JS process start, `no-snapshot`', nOf(stats(proc.filter((x) => x.runtime === 'n8n-js-nosnapshot').map((x) => x.handoff))), f3(stats(proc.filter((x) => x.runtime === 'n8n-js-nosnapshot').map((x) => x.handoff))), 'daemon hand-off without a spare process'],
		['JS process start, `snapshot`', nOf(stats(proc.filter((x) => x.runtime === 'n8n-js').map((x) => x.handoff))), f3(stats(proc.filter((x) => x.runtime === 'n8n-js').map((x) => x.handoff))), 'daemon hand-off without a spare process'],
		['RPC round trip (worker → n8n → worker)', nOf(rpcExec), f3(rpcExec, 1), 'WHTTP, `execution` + `shared`, mean per call per task, includes the echo server'],
		['Delete', nOf(stats(seqC.map((x) => x.delMs))), f3(stats(seqC.map((x) => x.delMs))), ''],
	],
);
p('RPC round trip per config (WHTTP, ms per call):');
table(
	['Mode', ...OPTIONS.map((o) => OPTION_LABEL[o])],
	MODES.map((m) => [`\`${m}\``, ...OPTIONS.map((o) => f3(rpcPerCall(configs[`${m}-${o}`].latTasks), 1))]),
);
p('RPC result request in n8n (t_rpc_post per call, WHTTP, ms):');
table(
	['Mode', ...OPTIONS.map((o) => OPTION_LABEL[o])],
	MODES.map((m) => [
		`\`${m}\``,
		...OPTIONS.map((o) =>
			f3(
				stats(
					configs[`${m}-${o}`].latTasks
						.filter((t) => workloadOf(t.workflowId) === 'WHTTP' && t.rpc_post_count > 0)
						.map((t) => t.t_rpc_post / t.rpc_post_count),
				),
				1,
			),
		),
	]),
);

// ---------- section 5 ----------
p('## 5. Overhead per task');
function taskGroups(c) {
	const t = c.latTasks;
	const by = (w) => t.filter((x) => workloadOf(x.workflowId) === w);
	const first = (list) => list.filter((x) => x.leaseHit === false);
	const later = (list) => list.filter((x) => x.leaseHit !== false);
	return {
		firstW1: first(by('W1')),
		// workflow mode creates its sandboxes mostly in the warm-up runs: count
		// the warm-up tasks too.
		firstAll: c.lat.tasks.filter((x) => x.leaseHit === false),
		laterW5: later(by('W5')),
		laterW1: later(by('W1')),
		laterLoop: later(by('WLOOP')),
		whttp: by('WHTTP'),
	};
}
const ov = (list) => stats(list.map((x) => x.overhead));
const rows5 = [];
for (const [label, mode, key] of [
	['`node`, first task (W1)', 'node', 'firstW1'],
	['`execution`, first task (W1)', 'execution', 'firstW1'],
	['`workflow`, first task (all workloads, warm-up included)', 'workflow', 'firstAll'],
	['`execution`, later task (W5)', 'execution', 'laterW5'],
	['`execution`, later task (WLOOP)', 'execution', 'laterLoop'],
	['`node`, later task (WLOOP)', 'node', 'laterLoop'],
	['`workflow`, later task (W1)', 'workflow', 'laterW1'],
	['`workflow`, later task (W5)', 'workflow', 'laterW5'],
]) {
	rows5.push([label, ...OPTIONS.map((o) => {
		const s = ov(taskGroups(configs[`${mode}-${o}`])[key]);
		return `${f3(s)} (n=${nOf(s)})`;
	})]);
}
rows5.push(['WHTTP task, per `httpRequest` call (`execution`)', ...OPTIONS.map((o) => {
	const s = rpcPerCall(configs[`execution-${o}`].latTasks);
	return `${f3(s, 1)} (n=${nOf(s)})`;
})]);
table(['Mode, task', ...OPTIONS.map((o) => OPTION_LABEL[o])], rows5);

p('Overhead parts (p50 / p95, ms). Transport = time to `accepted` minus daemon input write and hand-off.');
const partsRows = [];
for (const [label, mode, key] of [
	['`execution`, first task (W1)', 'execution', 'firstW1'],
	['`node`, first task (W1)', 'node', 'firstW1'],
	['`execution`, later task (W5)', 'execution', 'laterW5'],
	['`workflow`, later task (W1)', 'workflow', 'laterW1'],
	['`execution`, WHTTP task', 'execution', 'whttp'],
]) {
	for (const o of OPTIONS) {
		const list = taskGroups(configs[`${mode}-${o}`])[key];
		if (!list.length) continue;
		partsRows.push([
			`${label}, ${OPTION_LABEL[o]}`,
			list.length,
			f2(ov(list)),
			key.startsWith('first') ? f2(stats(list.map((x) => x.t_create))) : '—',
			'— (removed)',
			f2(stats(list.map((x) => x.daemon?.handoff))),
			f2(stats(list.map((x) => (x.t_send ?? NaN) - (x.daemon?.handoff ?? 0) - (x.daemon?.inputWrite ?? 0)))),
			key === 'whttp' ? f2(stats(list.map((x) => x.daemon?.worker?.rpcMs))) : '—',
			f2(stats(list.map((x) => x.t_accept_to_done))),
			f2(stats(list.map((x) => x.t_run))),
			f2(stats(list.map((x) => x.t_outputs))),
		]);
	}
}
table(['Task, option', 'n', 'Overhead', 'Create or claim', 'Channel open', 'Hand-off wait', 'Transport', 'RPC (all calls)', '`accepted` to `done`', 'User code', 'Outputs'], partsRows);

// ---------- section 6.1 ----------
p('## 6.1 Latency per execution (client, webhook to response, ms)');
const tr = clientSummaries(latencyDir('task-runners'));
const cs = (list, label) => list.find((x) => x.label === label);
const fc = (s) => (s ? `${s.p50} / ${s.p95} / ${s.runs >= 200 ? s.p99 : '—'}${s.failed ? ` (${s.failed} failed)` : ''}` : '—');
const rows61 = [];
for (const w of ['W1', 'W5', 'WLOOP', 'WHTTP']) {
	const lbl = CLIENT_LABEL[w];
	const t = cs(tr, `${lbl}-task-runners`);
	rows61.push([w, 'Task runners', `${fc(t)}`, '—', '—', t?.runs ?? 0]);
	for (const m of MODES) {
		const cells = OPTIONS.map((o) => cs(configs[`${m}-${o}`].client, `${lbl}-${m}-${o}`));
		rows61.push([w, `\`${m}\``, ...cells.map(fc), cells.map((c) => c?.runs ?? 0).join('/')]);
	}
}
table(['Scenario', 'Backend', '`fresh-spare`', '`shared`', '`shared + pool`', 'runs'], rows61);
const fr = clientSummaries(latencyDir('execution-fresh'));
p(`\`execution\` + \`fresh\`: ${['W1', 'W5', 'WLOOP'].map((w) => `${w} ${fc(cs(fr, `${CLIENT_LABEL[w]}-execution-fresh`))}`).join('; ')}`);
p();

// ---------- section 6.3 ----------
p('## 6.3 n8n benchmark (js-code-node)');
function k6(dir) {
	const f = join(dir, 'k6.txt');
	if (!existsSync(f)) return undefined;
	// eslint-disable-next-line no-control-regex
	const text = readFileSync(f, 'utf-8').replace(/\x1b\[[0-9;]*m/g, '');
	const it = /iterations\.*:\s*([\d.]+)\s+([\d.]+)\/s/.exec(text);
	const dur = /http_req_duration\.*:\s*(.*)/.exec(text)?.[1] ?? '';
	const val = (k) => {
		const m = new RegExp(`${k.replace(/[()]/g, '\\$&')}=([\\d.]+)(ms|s|µs)`).exec(dur);
		if (!m) return undefined;
		const v = Number(m[1]);
		return m[2] === 's' ? v * 1000 : m[2] === 'µs' ? v / 1000 : v;
	};
	const failed = /http_req_failed\.*:\s*([\d.]+)%/.exec(text)?.[1];
	const checks = /checks\.*:\s*([\d.]+)%/.exec(text)?.[1];
	return { iterations: Number(it?.[1]), rate: Number(it?.[2]), med: val('med'), p95: val('p(95)'), p99: val('p(99)'), failed, checks };
}
const fk = (k) => (k && Number.isFinite(k.rate) ? `${r(k.rate, 2)}/s (${r(k.med)} / ${r(k.p95)} / ${k.iterations >= 200 ? r(k.p99) : '—'} ms; n=${k.iterations}${k.failed && Number(k.failed) > 0 ? `; failed ${k.failed}%` : ''})` : '—');
const rows63 = [['Task runners', fk(k6(benchDir('task-runners-vus1'))), fk(k6(benchDir('task-runners-vus5')))]];
for (const m of MODES) for (const o of OPTIONS) rows63.push([`\`${m}\`, ${OPTION_LABEL[o]}`, fk(k6(configs[`${m}-${o}`].benches[1].dir)), fk(k6(configs[`${m}-${o}`].benches[5].dir))]);
rows63.push(['`execution`, `fresh`', fk(k6(benchDir('sandbox-execution-fresh-vus1'))), '—']);
table(['Backend', '1 VU', '5 VUs'], rows63);
p('Pool hit rate (first tasks from the pool):');
const hit = (b) => {
	const firsts = b.tasks.filter((t) => t.leaseHit === false);
	if (!firsts.length) return '—';
	const pooled = firsts.filter((t) => t.createTimings?.pooled).length;
	return `${r((100 * pooled) / firsts.length)}% (${pooled}/${firsts.length})`;
};
table(['Mode', 'Latency pass (sequential)', '1 VU', '5 VUs'], MODES.map((m) => [`\`${m}\``, hit(configs[`${m}-shared-pool`].lat), hit(configs[`${m}-shared-pool`].benches[1]), hit(configs[`${m}-shared-pool`].benches[5])]));

// ---------- section 3 ----------
p('## 3.1 Sandboxes per execution');
function sandboxesPerExecution(tasks, w) {
	const list = tasks.filter((t) => workloadOf(t.workflowId) === w);
	const ex = new Set(list.map((t) => t.executionId));
	const sb = new Set(list.map((t) => t.sandboxId));
	return ex.size ? sb.size / ex.size : NaN;
}
const rows31 = [];
for (const w of ['W1', 'W5', 'WLOOP', 'js-code-node']) {
	rows31.push([w, ...MODES.map((m) => OPTIONS.map((o) => {
		const c = configs[`${m}-${o}`];
		const tasks = w === 'js-code-node' ? c.benches[1].tasks : c.latTasks;
		return r(sandboxesPerExecution(tasks, w), 2);
	}).join(' / '))]);
}
table(['Scenario (fresh-spare / shared / shared + pool)', ...MODES.map((m) => `\`${m}\``)], rows31);
p('Under load (WLOAD, `shared`):');
const loadRows = [];
const loads = {};
for (const m of MODES) loads[m] = { ...loadTimings(join(AB, `load-${m}-reuse`, 'timings.jsonl')), client: readJsonl(join(AB, `load-${m}-reuse`, 'client.jsonl')), poll: readJsonl(join(AB, `load-${m}-reuse`, 'sandboxes.jsonl')) };
const span = (leases) => (leases.length ? (Math.max(...leases.map((l) => l.releasedAt)) - Math.min(...leases.map((l) => l.createdAt))) / 1000 : NaN);
loadRows.push(['Creates per second', ...MODES.map((m) => r(loads[m].leases.length / span(loads[m].leases), 2))]);
loadRows.push(['Sandboxes created', ...MODES.map((m) => loads[m].leases.length)]);
loadRows.push(['Hold time p50 / p95 (ms)', ...MODES.map((m) => f2(stats(loads[m].leases.map((l) => l.holdMs))))]);
loadRows.push(['Idle ratio p50', ...MODES.map((m) => r(stats(loads[m].leases.map((l) => l.idleRatio)).p50, 2))]);
loadRows.push(['Executions per sandbox p50 / p95', ...MODES.map((m) => f2(stats(loads[m].leases.map((l) => l.executionCount))))]);
loadRows.push(['Concurrent sandboxes, max', ...MODES.map((m) => r(stats(loads[m].poll.map((x) => x.codeSandboxes)).max))]);
loadRows.push(['Runner memory total, max (MiB)', ...MODES.map((m) => pollMem(loads[m].poll))]);
loadRows.push(['Task outcomes', ...MODES.map((m) => JSON.stringify(Object.fromEntries(Object.entries(loads[m].tasks.reduce((a, t) => ((a[t.outcome] = (a[t.outcome] ?? 0) + 1), a), {})))))]);
loadRows.push(['Leak check', ...MODES.map((m) => loads[m].client.filter((x) => x.type === 'leak_check').map((x) => x.leaked).join(',') || '—')]);
table(['Measurement', ...MODES.map((m) => `\`${m}\``)], loadRows);
p('Load client summaries:');
for (const m of MODES) for (const s of loads[m].client.filter((x) => x.type === 'client_summary')) p(`- ${s.label}: ${s.throughput}/s, ${s.p50} / ${s.p95} / ${s.runs >= 200 ? s.p99 : '—'} ms, runs ${s.runs}, failed ${s.failed}`);
p();

// ---------- section 3.2 ----------
p('## 3.2 Process churn');
function procStats(t) {
	const tasksBySb = new Map();
	for (const x of t.tasks) tasksBySb.set(x.sandboxId, (tasksBySb.get(x.sandboxId) ?? 0) + 1);
	const started = [];
	const ran = [];
	for (const pr of t.procs) {
		if (typeof pr.workersStarted !== 'number') continue;
		const n = tasksBySb.get(pr.sandboxId) ?? 0;
		started.push(pr.workersStarted);
		ran.push(n);
	}
	return { started, ran };
}
function procRow(t, option) {
	const { started, ran } = procStats(t);
	const used = ran.map((n) => (option === 'shared' ? (n > 0 ? 1 : 0) : n));
	const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
	const wasted = started.map((s, i) => s - used[i]);
	return [r(mean(started), 2), r(mean(used), 2), r(mean(wasted), 2), started.length];
}
table(['Option (`execution`, latency pass, all workloads)', 'Started per sandbox (mean)', 'Ran a task (mean)', 'Wasted (mean)', 'sandboxes'], [
	['`fresh`', ...procRow(fresh.lat, 'fresh')],
	['`fresh-spare`', ...procRow(configs['execution-fresh-spare'].lat, 'fresh-spare')],
	['`shared`', ...procRow(configs['execution-shared'].lat, 'shared')],
]);
function procPerExecution(t, w) {
	const wl = new Map();
	for (const x of t.tasks) wl.set(x.sandboxId, workloadOf(x.workflowId));
	const ex = new Set(t.tasks.filter((x) => workloadOf(x.workflowId) === w).map((x) => x.executionId));
	let sum = 0;
	for (const pr of t.procs) if (wl.get(pr.sandboxId) === w && typeof pr.workersStarted === 'number') sum += pr.workersStarted;
	return ex.size ? sum / ex.size : NaN;
}
const rows32 = [];
for (const w of ['W1', 'W5', 'WLOOP', 'js-code-node']) {
	const pick = (m, o) => (w === 'js-code-node' ? { tasks: configs[`${m}-${o}`].benches[1].tasks, procs: configs[`${m}-${o}`].benches[1].procs } : configs[`${m}-${o}`].lat);
	const fr2 = w === 'js-code-node' ? fresh.bench : fresh.lat;
	rows32.push([
		w,
		`${r(procPerExecution(pick('node', 'fresh-spare'), w), 2)} / ${r(procPerExecution(pick('node', 'shared'), w), 2)}`,
		`${r(procPerExecution(fr2, w), 2)} / ${r(procPerExecution(pick('execution', 'fresh-spare'), w), 2)} / ${r(procPerExecution(pick('execution', 'shared'), w), 2)}`,
		`${r(procPerExecution(pick('workflow', 'fresh-spare'), w), 2)} / ${r(procPerExecution(pick('workflow', 'shared'), w), 2)}`,
	]);
}
table(['Scenario', '`node`: fresh-spare / shared', '`execution`: fresh / fresh-spare / shared', '`workflow`: fresh-spare / shared'], rows32);
const missingProcs = Object.values(configs).reduce((a, c) => a + c.lat.leases.length - c.lat.procs.length, 0);
p(`Leases without a process record (latency passes): ${missingProcs}`);
p();

// ---------- section 7.1 ----------
p('## 7.1 Memory per sandbox (cgroup memory.peak at the delete, MiB)');
const MiB = 1024 * 1024;
const rows71 = [];
for (const m of MODES) for (const o of OPTIONS) {
	const c = configs[`${m}-${o}`];
	const procs = [...c.lat.procs, ...c.benches[1].procs, ...c.benches[5].procs].filter((x) => x.memoryPeakBytes > 0);
	const s = stats(procs.map((x) => x.memoryPeakBytes / MiB));
	const cur = stats(procs.map((x) => x.memoryCurrentBytes / MiB));
	rows71.push([`\`${m}\``, OPTION_LABEL[o], { node: 1, execution: 2, workflow: 4 }[m], r(s.p50), r(s.p95), r(s.max), `${r(cur.p50)}`, r(stats(c.poll.map((x) => x.codeSandboxes)).max), pollMem(c.poll), s.n]);
}
table(['Mode', 'Option', 'Slots', 'Peak p50', 'Peak p95', 'Peak max', 'At delete p50', 'Concurrent sandboxes, max', 'Runner total, max (MiB)', 'sandboxes'], rows71);
p('Idle sandboxes (direct pass, no task, read after 30 s):');
const idleRows = [];
for (const m of MODES) for (const o of ['fresh-spare', 'shared']) {
	const list = idle.filter((x) => x.mode === m && x.option === o);
	idleRows.push([`\`${m}\``, OPTION_LABEL[o], list.length, r(stats(list.map((x) => x.memoryCurrentBytes / MiB)).p50), r(stats(list.map((x) => x.memoryPeakBytes / MiB)).p50), r(stats(list.map((x) => x.cpuUsageUsec / 1000)).p50), r(stats(list.map((x) => x.workersStarted)).p50)]);
}
table(['Mode', 'Option', 'n', 'Memory now p50 (MiB)', 'Memory peak p50 (MiB)', 'CPU-ms p50', 'Processes started'], idleRows);

// ---------- section 7.2 ----------
p('## 7.2 CPU (cgroup cpu.stat usage_usec at the delete)');
function cpuPerExecution(t, w) {
	const execsBySb = new Map();
	const wl = new Map();
	for (const x of t.tasks) {
		if (!execsBySb.has(x.sandboxId)) execsBySb.set(x.sandboxId, new Set());
		execsBySb.get(x.sandboxId).add(x.executionId);
		wl.set(x.executionId, workloadOf(x.workflowId));
	}
	const cpuBySb = new Map(t.procs.filter((x) => typeof x.cpuUsageUsec === 'number').map((x) => [x.sandboxId, x.cpuUsageUsec / 1000]));
	const perExec = new Map();
	for (const [sb, execs] of execsBySb) {
		const cpu = cpuBySb.get(sb);
		if (cpu === undefined) continue;
		for (const e of execs) perExec.set(e, (perExec.get(e) ?? 0) + cpu / execs.size);
	}
	return stats([...perExec.entries()].filter(([e]) => wl.get(e) === w).map(([, v]) => v));
}
const rows72 = [];
for (const w of ['W1', 'W5', 'WLOOP', 'js-code-node']) for (const m of MODES) {
	rows72.push([w, `\`${m}\``, ...OPTIONS.map((o) => {
		const c = configs[`${m}-${o}`];
		const t = w === 'js-code-node' ? c.benches[1] : c.lat;
		const s = cpuPerExecution(t, w);
		return `${f2(s)} (n=${nOf(s)})`;
	})]);
}
table(['Scenario', 'Mode', ...OPTIONS.map((o) => OPTION_LABEL[o])], rows72);
p('CPU-ms per sandbox and per task (p50, latency pass):');
const rows72b = [];
for (const m of MODES) for (const o of OPTIONS) {
	const t = configs[`${m}-${o}`].lat;
	const tasksBySb = new Map();
	for (const x of t.tasks) tasksBySb.set(x.sandboxId, (tasksBySb.get(x.sandboxId) ?? 0) + 1);
	const withCpu = t.procs.filter((x) => typeof x.cpuUsageUsec === 'number');
	const perSb = stats(withCpu.map((x) => x.cpuUsageUsec / 1000));
	const perTask = stats(withCpu.filter((x) => tasksBySb.get(x.sandboxId) > 0).map((x) => x.cpuUsageUsec / 1000 / tasksBySb.get(x.sandboxId)));
	const idleList = idle.filter((x) => x.mode === m && x.option === (o === 'shared-pool' ? 'shared' : o));
	rows72b.push([`\`${m}\``, OPTION_LABEL[o], r(perSb.p50), r(perTask.p50, 1), o === 'shared-pool' ? 'see `shared`' : r(stats(idleList.map((x) => x.cpuUsageUsec / 1000)).p50), withCpu.length]);
}
table(['Mode', 'Option', 'Per sandbox', 'Per task', 'Sandbox with 0 tasks (30 s idle)', 'sandboxes'], rows72b);

// ---------- section 9 ----------
p('## 9. WFILE (`execution` + `shared`)');
const fileDir = latencyDir('execution-shared-file');
const fileT = loadTimings(join(fileDir, 'timings.jsonl')).tasks.filter((t) => t.bin_in_count > 0);
const fileC = clientSummaries(fileDir);
const sizeOf = (bytes) => (bytes < 10 * MiB ? '1mb' : bytes < 500 * MiB ? '100mb' : '1gb');
const rows9 = [];
for (const [size, bytes] of [['1mb', MiB], ['100mb', 100 * MiB], ['1gb', 1024 * MiB]]) {
	const list = fileT.filter((t) => sizeOf(t.bytes_in_bin ?? 0) === size);
	const c = cs(fileC, `WFILE-${size}-execution-shared-file`);
	const tput = c ? (bytes / MiB / (c.p50 / 1000)).toFixed(1) : '—';
	rows9.push([size, c ? `${c.p50} / ${c.p95}` : '—', f2(stats(list.map((t) => t.t_send))), f2(stats(list.map((t) => t.t_accept_to_done))), f2(stats(list.map((t) => t.t_outputs))), `${tput} MiB/s`, `${c?.runs ?? 0} runs, ${c?.failed ?? 0} failed; ${list.length} tasks`]);
}
table(['Size', 'Total (client) p50 / p95', 'Upload to `accepted`', 'Process (`accepted` to `done`)', 'Download and store', 'Throughput (size ÷ total p50)', 'n'], rows9);

// ---------- outcomes ----------
p('## Outcomes per config');
for (const [k, c] of Object.entries(configs)) {
	const all = [...c.lat.tasks, ...c.benches[1].tasks, ...c.benches[5].tasks];
	const o = all.reduce((a, t) => ((a[t.outcome] = (a[t.outcome] ?? 0) + 1), a), {});
	const retried = all.filter((t) => t.attempts > 1).length;
	p(`- ${k}: ${JSON.stringify(o)}, retried ${retried}`);
}
console.log(out.join('\n'));
