// The closed-loop load driver of the load test, with a concurrency ramp.
//
//   node drive.mjs --manifest m.json --pool pool.jsonl --keys keys.txt --components comps.json
//     --label v1-b2 --out <dir> [--seed 42] [--warmup 15] [--hold 60] [--start 1] [--factor 1.5]
//     [--max-conc 768] [--conc 1,2,4 (fixed list, no stop rule)] [--restore used|all|none]
//     [--after-restore <url>: POST the restored keys there, for the compiled engine's token refresh]
//     [--vary <seed> [--vary-state on|off]: a new trigger item, and a new gym state, for each run]
//
// Workload: one sequence of pool keys from a seeded PRNG over `--keys` (the
// same for every engine). Each of C workers takes the next key of the
// sequence, sends the key's trigger item to its webhook, and waits for the
// response (the webhook responds when the last node ends). A key that the
// engine could not load counts as a failure without a request.
//
// Each ramp step: restore the gym tenants of the keys that the previous step
// ran, warm up for --warmup s, then measure for --hold s. The ramp starts at
// --start and multiplies the concurrency by --factor (at least +1). It stops
// when the rate gained less than 3% over the best step and the p99 latency
// grew by more than half, or after two steps in a row without a 3% gain, or
// when the success rate falls 10 points under that of the first step. A
// "no gain" stop counts only once the engine uses --min-share (default 0.85)
// of its CPU budget: long workflows (timer waits, retries) make the rate
// noisy at low concurrency while the CPU is still idle.
//
// Every second it samples, for each component of --components
// ({ name: { cgroups: [dir...], cpus: n } }), the CPU time (user, system)
// from cgroup cpu.stat and the RSS of the cgroup's processes; and it probes
// the gym's HTTPS listener (a Slack API call) for its latency.
//
// --vary: run i of the sequence gets the seed runSeed(seed, i) (lib/vary.mjs).
// Its trigger items are a seeded variation of the key's items. With
// --vary-state on (the default), the run first restores its tenant from the
// snapshot with a seeded mutation, then refreshes OAuth tokens when the key
// needs it; one run of a key is in flight at a time. Run i gets the same
// items and state on every engine. The step restore is then skipped. The
// request record holds i, the seed, the input size and the mutation.
//
// Output in --out: steps.jsonl (one line per step), steps.csv,
// requests-<label>-c<conc>.jsonl and samples-<label>-c<conc>.jsonl.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { pool, readBundle, rebasedBytes, rng, snapshotBase, snapshotPut } from './lib/bundle.mjs';
import { leafKinds, mutateSnapshot, runSeed, varyItems } from './lib/vary.mjs';
import { keyOf, readPool } from './lib/poolfile.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const LT = process.env.LT || path.join(os.homedir(), 'wfrt-loadtest');
const OUT = arg('out', '.');
const LABEL = arg('label', 'run');
const SEED = Number(arg('seed', '42'));
const WARMUP = Number(arg('warmup', '15'));
const HOLD = Number(arg('hold', '60'));
const START = Number(arg('start', '1'));
const FACTOR = Number(arg('factor', '1.5'));
const MAX_CONC = Number(arg('max-conc', '768'));
const MIN_SHARE = Number(arg('min-share', '0.85'));
const FIXED = arg('conc', '');
const RESTORE = arg('restore', 'used');
const AFTER_RESTORE = arg('after-restore', '');
const TIMEOUT_MS = Number(arg('timeout', '300')) * 1000;
const META = JSON.parse(arg('meta', '{}'));
const VARY = arg('vary', '');
const VARY_STATE = VARY !== '' && arg('vary-state', 'on') === 'on';
fs.mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(arg('manifest', 'manifest.json'), 'utf8'));
const keys = fs.readFileSync(arg('keys', 'keys.txt'), 'utf8').split('\n').filter(Boolean);
const rows = new Map(readPool(arg('pool', 'pool.jsonl')).map((r) => [keyOf(r.id), r]));
const components = JSON.parse(fs.readFileSync(arg('components', 'components.json'), 'utf8'));
const bodies = new Map();
for (const k of keys) {
	const r = rows.get(k);
	if (!r) throw new Error(`key ${k} is not in the pool`);
	bodies.set(k, JSON.stringify(r.items.length === 1 ? r.items[0] : { items: r.items }));
}

// ---- the request sequence: the same for every engine ----
const rand = rng(SEED);
const sequence = [];
function keyAt(i) {
	while (sequence.length <= i) sequence.push(keys[Math.floor(rand() * keys.length)]);
	return sequence[i];
}
let seqNext = 0;

// ---- requests ----
const agents = new Map();
function agentFor(port, conc) {
	let a = agents.get(port);
	if (!a) {
		a = new http.Agent({ keepAlive: true, maxSockets: Infinity });
		agents.set(port, a);
	}
	return a;
}

// ---- varied runs: items, tenant state, one run of a key at a time ----
const bases = new Map();
/** The parsed snapshot of a key and its leaf kinds; the 512 most recent stay in memory. */
function baseOf(key) {
	let b = bases.get(key);
	if (b) bases.delete(key);
	else {
		const { doc, clockAt } = snapshotBase(rows.get(key).dir);
		b = { doc, clockAt, leaves: leafKinds(doc) };
		if (bases.size >= 512) bases.delete(bases.keys().next().value);
	}
	bases.set(key, b);
	return b;
}
const locks = new Map();
async function withKey(key, fn) {
	const prev = locks.get(key) ?? Promise.resolve();
	let release;
	const mine = new Promise((r) => (release = r));
	const chain = prev.then(() => mine);
	locks.set(key, chain);
	await prev;
	try {
		return await fn();
	} finally {
		release();
		if (locks.get(key) === chain) locks.delete(key);
	}
}
// Keys whose refresh refreshed nothing once: their credentials have no OAuth2 token.
const noRefresh = new Set();
async function restoreVaried(key, seed) {
	const t0 = performance.now();
	const b = baseOf(key);
	const doc = structuredClone(b.doc);
	const mut = mutateSnapshot(seed, doc, b.leaves);
	let restoreError;
	try {
		await snapshotPut(rows.get(key).tenant, rebasedBytes(doc, b.clockAt));
	} catch (e) {
		restoreError = String(e.message).slice(0, 120);
	}
	if (AFTER_RESTORE && !noRefresh.has(key)) {
		const r = await fetch(AFTER_RESTORE, { method: 'POST', body: JSON.stringify([key]) }).then((x) => x.json(), () => ({}));
		if (!r.refreshed && !r.credentials) noRefresh.add(key);
	}
	return { mut, restoreMs: performance.now() - t0, restoreError };
}
function variedBody(key, seed) {
	const { items, original } = varyItems(seed, rows.get(key).items);
	return { body: JSON.stringify(items.length === 1 ? items[0] : { items }), original };
}

function send(key, body = bodies.get(key)) {
	const e = manifest.entries[key];
	const t0 = performance.now();
	if (!e) return Promise.resolve({ status: 'not_loaded', ms: 0 });
	return new Promise((resolve) => {
		const req = http.request(
			{
				host: '127.0.0.1',
				port: e.port,
				path: e.path,
				method: 'POST',
				agent: agentFor(e.port),
				headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
				timeout: TIMEOUT_MS,
			},
			(res) => {
				res.resume();
				res.on('end', () => resolve({ status: res.statusCode, ms: performance.now() - t0 }));
				res.on('error', () => resolve({ status: 'reset', ms: performance.now() - t0 }));
			},
		);
		req.on('timeout', () => req.destroy(new Error('timeout')));
		req.on('error', (err) => resolve({ status: err.message === 'timeout' ? 'timeout' : 'conn_error', ms: performance.now() - t0 }));
		req.end(body);
	});
}

// ---- sampling: cgroup CPU and RSS, machine load, gym probe ----
const PAGE = 4096;
function readCpu(dir) {
	try {
		const s = fs.readFileSync(path.join(dir, 'cpu.stat'), 'utf8');
		const v = (k) => Number(new RegExp(`^${k} (\\d+)`, 'm').exec(s)?.[1] ?? 0);
		return { user: v('user_usec') / 1e6, system: v('system_usec') / 1e6 };
	} catch {
		return { user: 0, system: 0 };
	}
}
function readRss(dir) {
	let bytes = 0;
	try {
		for (const pid of fs.readFileSync(path.join(dir, 'cgroup.procs'), 'utf8').split('\n').filter(Boolean)) {
			try {
				bytes += Number(fs.readFileSync(`/proc/${pid}/statm`, 'utf8').split(' ')[1]) * PAGE;
			} catch {
				// Ended.
			}
		}
	} catch {
		// No cgroup.
	}
	return bytes;
}
function sampleComponents() {
	const out = {};
	for (const [name, c] of Object.entries(components)) {
		let user = 0, system = 0, rss = 0;
		for (const dir of c.cgroups) {
			const cpu = readCpu(dir);
			user += cpu.user;
			system += cpu.system;
			rss += readRss(dir);
		}
		out[name] = { user, system, rss };
	}
	const self = process.cpuUsage();
	out.loadgen = { user: self.user / 1e6, system: self.system / 1e6, rss: process.memoryUsage().rss };
	return out;
}

const caFile = path.join(LT, 'data', 'engine-test', 'harness', 'ca', 'ca.pem');
const ca = fs.existsSync(caFile) ? fs.readFileSync(caFile) : undefined;
const gymAgent = new https.Agent({ keepAlive: true, maxSockets: 1 });
function probeGym() {
	const t0 = performance.now();
	return new Promise((resolve) => {
		const req = https.request(
			{ host: '127.0.0.1', port: 47443, servername: 'slack.com', path: '/api/api.test', method: 'POST', headers: { host: 'slack.com' }, ca, agent: gymAgent, timeout: 10000 },
			(res) => {
				res.resume();
				res.on('end', () => resolve(performance.now() - t0));
			},
		);
		req.on('error', () => resolve(null));
		req.on('timeout', () => req.destroy());
		req.end();
	});
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null);
const stats = (xs) => {
	if (!xs.length) return { min: null, mean: null, max: null };
	return { min: Math.min(...xs), mean: xs.reduce((a, b) => a + b, 0) / xs.length, max: Math.max(...xs) };
};

// ---- one step ----
async function restore(tenantKeys) {
	if (RESTORE === 'none' || VARY_STATE) return 0;
	const t0 = Date.now();
	const list = RESTORE === 'all' ? keys : [...tenantKeys];
	await pool(list, 16, async (k) => {
		const r = rows.get(k);
		try {
			await snapshotPut(r.tenant, readBundle(r.dir).snapshot());
		} catch (e) {
			console.error(`restore ${k}: ${e.message}`);
		}
	});
	if (AFTER_RESTORE) {
		const r = await fetch(AFTER_RESTORE, { method: 'POST', body: JSON.stringify(list) }).then((x) => x.json(), (e) => ({ error: e.message }));
		console.log(`after restore: ${JSON.stringify(r)}`);
	}
	return (Date.now() - t0) / 1000;
}

let touched = new Set(keys);
async function step(conc) {
	const restoreS = await restore(touched);
	touched = new Set();
	const tag = `${LABEL}-c${conc}`;
	const reqFile = fs.createWriteStream(path.join(OUT, `requests-${tag}.jsonl`));
	const sampFile = fs.createWriteStream(path.join(OUT, `samples-${tag}.jsonl`));
	let measuring = false;
	let stopping = false;
	const results = [];
	const worker = async () => {
		while (!stopping) {
			const i = seqNext++;
			const key = keyAt(i);
			touched.add(key);
			let r;
			let rec = {};
			const startedMeasured = measuring;
			if (VARY) {
				const seed = runSeed(VARY, i);
				const v = variedBody(key, seed);
				rec = { seed, inBytes: Buffer.byteLength(v.body), original: v.original };
				r = VARY_STATE
					? await withKey(key, async () => {
							const st = await restoreVaried(key, seed);
							Object.assign(rec, { mut: st.mut, restoreMs: Math.round(st.restoreMs), restoreError: st.restoreError });
							return await send(key, v.body);
						})
					: await send(key, v.body);
			} else r = await send(key);
			if (startedMeasured && measuring) {
				results.push({ key, status: r.status, ms: r.ms });
				reqFile.write(`${JSON.stringify({ i, key, status: r.status, ms: Math.round(r.ms * 10) / 10, ...rec })}\n`);
			}
		}
	};
	const workers = Array.from({ length: conc }, worker);
	await new Promise((r) => setTimeout(r, WARMUP * 1000));
	// Measured window.
	const samples = [];
	const probes = [];
	const c0 = sampleComponents();
	const w0 = performance.now();
	const sampleStart = Date.now();
	measuring = true;
	let prev = c0;
	let prevT = w0;
	const sampler = setInterval(() => {
		const now = performance.now();
		const c = sampleComponents();
		const row = { t: Date.now(), load1: os.loadavg()[0], comps: {} };
		for (const [name, v] of Object.entries(c)) {
			const dt = (now - prevT) / 1000;
			row.comps[name] = { cores: (v.user + v.system - prev[name].user - prev[name].system) / dt, rss: v.rss };
		}
		prev = c;
		prevT = now;
		samples.push(row);
		sampFile.write(`${JSON.stringify(row)}\n`);
	}, 1000);
	const prober = setInterval(async () => {
		const ms = await probeGym();
		probes.push(ms);
	}, 250);
	await new Promise((r) => setTimeout(r, HOLD * 1000));
	measuring = false;
	clearInterval(sampler);
	clearInterval(prober);
	const c1 = sampleComponents();
	const wall = (performance.now() - w0) / 1000;
	stopping = true;
	await Promise.all(workers);
	reqFile.end();
	sampFile.end();

	const lat = results.map((r) => r.ms).sort((a, b) => a - b);
	const statusMix = {};
	for (const r of results) statusMix[r.status] = (statusMix[r.status] ?? 0) + 1;
	const ok = results.filter((r) => r.status === 200).length;
	const nodeRuns = results.reduce((a, r) => a + (r.status === 200 ? (rows.get(r.key).nodesRan ?? 0) : 0), 0);
	const cpu = {};
	for (const name of Object.keys(c1)) {
		const user = (c1[name].user - c0[name].user) / wall;
		const system = (c1[name].system - c0[name].system) / wall;
		const budget = components[name]?.cpus ?? 2;
		const rss = samples.map((s) => s.comps[name]?.rss ?? 0);
		cpu[name] = { user, system, cores: user + system, share: (user + system) / budget, budget, rssMB: Object.fromEntries(Object.entries(stats(rss)).map(([k, v]) => [k, v === null ? null : Math.round(v / 1048576)])) };
	}
	const pr = probes.filter((x) => x !== null).sort((a, b) => a - b);
	const row = {
		time: new Date(sampleStart).toISOString(),
		label: LABEL,
		...META,
		conc,
		seconds: wall,
		restoreSeconds: restoreS,
		completed: results.length,
		rate: results.length / wall,
		okRate: ok / wall,
		successRate: results.length ? ok / results.length : null,
		nodeRunsPerSec: nodeRuns / wall,
		p50: pct(lat, 0.5),
		p90: pct(lat, 0.9),
		p99: pct(lat, 0.99),
		max: lat.at(-1) ?? null,
		statusMix,
		distinctKeys: new Set(results.map((r) => r.key)).size,
		cpu,
		gymProbe: { n: pr.length, failed: probes.length - pr.length, p50: pct(pr, 0.5), p99: pct(pr, 0.99) },
		load1: os.loadavg()[0],
		seqEnd: seqNext,
	};
	fs.appendFileSync(path.join(OUT, 'steps.jsonl'), `${JSON.stringify(row)}\n`);
	appendCsv(row);
	const comp = Object.entries(cpu).map(([k, v]) => `${k} ${v.cores.toFixed(2)}c/${(v.share * 100).toFixed(0)}%`).join(' ');
	console.log(`${LABEL} c=${conc}: ${row.rate.toFixed(1)}/s ok ${(row.successRate * 100).toFixed(1)}% p50 ${row.p50?.toFixed(0)} p99 ${row.p99?.toFixed(0)} ms | ${comp} | gym p50 ${row.gymProbe.p50?.toFixed(1)} ms`);
	return row;
}

function appendCsv(r) {
	const file = path.join(OUT, 'steps.csv');
	const comps = Object.keys(r.cpu).sort();
	const head = ['time', 'label', 'engine', 'budget', 'conc', 'seconds', 'completed', 'rate', 'okRate', 'successRate', 'nodeRunsPerSec', 'p50', 'p90', 'p99', 'max', 'gymP50', 'gymP99', 'load1',
		...comps.flatMap((c) => [`${c}_user`, `${c}_sys`, `${c}_share`, `${c}_rssMin`, `${c}_rssMean`, `${c}_rssMax`])];
	const val = [r.time, r.label, r.engine ?? '', r.budget ?? '', r.conc, r.seconds.toFixed(2), r.completed, r.rate.toFixed(2), r.okRate.toFixed(2), r.successRate?.toFixed(4), r.nodeRunsPerSec.toFixed(1),
		r.p50?.toFixed(1), r.p90?.toFixed(1), r.p99?.toFixed(1), r.max?.toFixed(1), r.gymProbe.p50?.toFixed(2), r.gymProbe.p99?.toFixed(2), r.load1.toFixed(2),
		...comps.flatMap((c) => [r.cpu[c].user.toFixed(3), r.cpu[c].system.toFixed(3), r.cpu[c].share.toFixed(3), r.cpu[c].rssMB.min, r.cpu[c].rssMB.mean, r.cpu[c].rssMB.max])];
	if (!fs.existsSync(file)) fs.writeFileSync(file, `${head.join(',')}\n`);
	fs.appendFileSync(file, `${val.join(',')}\n`);
}

// ---- the ramp ----
const done = [];
if (FIXED) {
	for (const c of FIXED.split(',').map(Number)) done.push(await step(c));
} else {
	let conc = START;
	let best = null;
	let flat = 0;
	while (conc <= MAX_CONC) {
		const r = await step(conc);
		done.push(r);
		const first = done[0];
		if (r.successRate !== null && first.successRate !== null && r.successRate < first.successRate - 0.1) {
			console.log('stop: the success rate fell');
			break;
		}
		const gain = best ? r.okRate / best.okRate - 1 : 1;
		const engineShare = Object.entries(r.cpu).filter(([n]) => components[n]?.role === 'engine').reduce((a, [, v]) => a + v.cores, 0) / (META.budget || 1);
		const prev = done.at(-2);
		if (gain < 0.03 && engineShare >= MIN_SHARE) {
			flat++;
			if (flat >= 2 || (prev && r.p99 > prev.p99 * 1.5)) {
				console.log(`stop: no gain (${(gain * 100).toFixed(1)}%), p99 ${r.p99?.toFixed(0)} ms`);
				break;
			}
		} else flat = 0;
		if (!best || r.okRate > best.okRate) best = r;
		conc = Math.max(conc + 1, Math.round(conc * FACTOR));
	}
}
const sat = done.reduce((a, b) => (b.okRate > a.okRate ? b : a), done[0]);
fs.appendFileSync(path.join(OUT, 'saturation.jsonl'), `${JSON.stringify({ label: LABEL, ...META, conc: sat.conc, okRate: sat.okRate, rate: sat.rate, p50: sat.p50, p99: sat.p99, successRate: sat.successRate })}\n`);
console.log(`saturation ${LABEL}: c=${sat.conc} ${sat.okRate.toFixed(1)} ok/s`);
for (const a of agents.values()) a.destroy();
gymAgent.destroy();
