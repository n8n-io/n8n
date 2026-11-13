// Per-workflow CPU attribution of the compiled engine: each workflow alone,
// one run in flight, as bench/warm/warm.ts does it, but through the
// load-test webhook and with CPU from the cgroups of `wfrt` and the host.
//
//   node attrib.mjs --manifest <compiled manifest> --pool pool.jsonl --keys keys.txt --steps <step-profile dir>
//     --out attrib.jsonl [--runs 10] [--max-seconds 3]
//
// For each key: restore the tenant and refresh its tokens, run it twice to
// warm up (the first response is kept for the failure list), then run it
// --runs times (or for --max-seconds). The host step lines
// (WF_FALLBACK_STEP_PROFILE) inside the window give the host steps per run
// and their CPU. Output: one JSON line per key.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { readBundle, snapshotPut } from '../lib/bundle.mjs';
import { keyOf, readPool } from '../lib/poolfile.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const manifest = JSON.parse(fs.readFileSync(arg('manifest'), 'utf8'));
const rows = new Map(readPool(arg('pool')).map((r) => [keyOf(r.id), r]));
const keys = fs.readFileSync(arg('keys'), 'utf8').split('\n').filter(Boolean);
const STEPS = arg('steps', '');
const OUT = arg('out', 'attrib.jsonl');
const RUNS = Number(arg('runs', '10'));
const MAX_S = Number(arg('max-seconds', '3'));
const CG = '/sys/fs/cgroup/lt.slice';
const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).key) : []);

const cpu = (unit) => {
	const s = fs.readFileSync(path.join(CG, `lt-${unit}.service`, 'cpu.stat'), 'utf8');
	return Number(/^usage_usec (\d+)/m.exec(s)[1]);
};
const wfrtUnits = manifest.units.filter((u) => u.startsWith('wfrt'));
const wfrtCpu = () => wfrtUnits.reduce((a, u) => a + cpu(u), 0);
const hostCpu = () => cpu('host');

const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
function post(e, body) {
	const t0 = performance.now();
	return new Promise((resolve) => {
		const req = http.request(
			{ host: '127.0.0.1', port: e.port, path: e.path, method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, timeout: 120000 },
			(res) => {
				let text = '';
				res.on('data', (d) => (text += d));
				res.on('end', () => resolve({ status: res.statusCode, text, ms: performance.now() - t0 }));
			},
		);
		req.on('timeout', () => req.destroy(new Error('timeout')));
		req.on('error', (err) => resolve({ status: err.message, text: '', ms: performance.now() - t0 }));
		req.end(body);
	});
}

const out = fs.createWriteStream(OUT, { flags: 'a' });
let n = 0;
for (const key of keys) {
	if (done.has(key)) continue;
	const e = manifest.entries[key];
	const r = rows.get(key);
	if (!e) {
		out.write(`${JSON.stringify({ key, notLoaded: manifest.failed?.[key] ?? 'not loaded' })}\n`);
		continue;
	}
	try {
		await snapshotPut(r.tenant, readBundle(r.dir).snapshot());
	} catch (e) {
		// A tenant whose snapshot conflicts with another tenant (a shared vendor host) runs on its current state.
		console.error(`restore ${key}: ${String(e.message).slice(0, 160)}`);
	}
	await fetch(manifest.control + '/refresh', { method: 'POST', body: JSON.stringify([key]) }).catch(() => {});
	const body = JSON.stringify(r.items.length === 1 ? r.items[0] : { items: r.items });
	const first = await post(e, body);
	await post(e, body);
	const w0 = wfrtCpu();
	const h0 = hostCpu();
	const t0 = Date.now();
	let runs = 0;
	let ok = 0;
	const wall = [];
	while (runs < RUNS && Date.now() - t0 < MAX_S * 1000) {
		const x = await post(e, body);
		runs++;
		if (x.status === 200) ok++;
		wall.push(x.ms);
	}
	const t1 = Date.now();
	const row = {
		key,
		firstStatus: first.status,
		error: first.status === 200 ? undefined : first.text.slice(0, 400),
		runs,
		ok,
		wfrtUs: (wfrtCpu() - w0) / runs,
		hostUs: (hostCpu() - h0) / runs,
		wallMs: wall.sort((a, b) => a - b)[Math.floor(wall.length / 2)],
		window: [t0, t1],
		nodesRan: r.nodesRan,
		triggerType: r.triggerType,
	};
	out.write(`${JSON.stringify(row)}\n`);
	if (++n % 100 === 0) console.log(`${n} done`);
}
out.end();
agent.destroy();
console.log('attribution done');
