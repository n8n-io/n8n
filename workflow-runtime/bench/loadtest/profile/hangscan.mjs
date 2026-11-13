// Runs each workflow once on a running compiled engine, with a short
// timeout, to find the ones that hang or fail.
//
//   node hangscan.mjs --manifest m.json --pool pool.jsonl --keys keys.txt --out scan.jsonl [--conc 8] [--timeout 30]
//     [--log wfrt.log ...]
//
// --log (one or more wfrt log files): each record gets the `egress: request`
// lines that the logs got while its request was in flight. At --conc 1 they
// belong to that run only; at higher --conc they can come from other runs.
import fs from 'node:fs';
import { pool, readBundle, snapshotPut } from '../lib/bundle.mjs';
import { keyOf, readPool } from '../lib/poolfile.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const m = JSON.parse(fs.readFileSync(arg('manifest'), 'utf8'));
const rows = new Map(readPool(arg('pool')).map((r) => [keyOf(r.id), r]));
const keys = fs.readFileSync(arg('keys'), 'utf8').split('\n').filter(Boolean);
const TIMEOUT = Number(arg('timeout', '30')) * 1000;
const out = fs.createWriteStream(arg('out', 'scan.jsonl'));
const LOGS = argv.flatMap((a, i) => (a === '--log' ? [argv[i + 1]] : []));
const logSize = (f) => {
	try {
		return fs.statSync(f).size;
	} catch {
		return 0;
	}
};
/** The `egress: request` lines that each log got after the offsets `from`. */
function egressLines(from) {
	const lines = [];
	LOGS.forEach((f, i) => {
		const end = logSize(f);
		if (end <= from[i]) return;
		const fd = fs.openSync(f, 'r');
		const buf = Buffer.alloc(end - from[i]);
		fs.readSync(fd, buf, 0, buf.length, from[i]);
		fs.closeSync(fd);
		for (const l of buf.toString('utf8').split('\n')) if (l.startsWith('egress: request')) lines.push(l.slice(0, 1000));
	});
	return lines;
}

// The event stream of each shard: `started` maps an execution to its
// workflow; a failed `step` event carries the error that a run that ends as
// needs_attention does not put in its HTTP response.
const execWf = new Map();
const lastError = new Map();
const lastEnd = new Map();
const streams = new AbortController();
// wfrt takes one event reader: read the copies of services.mjs when the manifest has them.
const eventUrls = m.events ?? (m.admin ?? []).map((a) => `${a}/_admin/events`);
for (const url of eventUrls) {
	fetch(url, { headers: { authorization: `Bearer ${m.adminSecret}` }, signal: streams.signal })
		.then(async (res) => {
			let buf = '';
			for await (const chunk of res.body) {
				buf += Buffer.from(chunk).toString('utf8');
				for (let nl = buf.indexOf('\n'); nl >= 0; nl = buf.indexOf('\n')) {
					const line = buf.slice(0, nl);
					buf = buf.slice(nl + 1);
					let e;
					try {
						e = JSON.parse(line);
					} catch {
						continue;
					}
					if (e.type === 'started') execWf.set(e.executionId, e.workflowId);
					const wf = execWf.get(e.executionId);
					if (!wf) continue;
					if (e.type === 'step' && e.status === 'failed') lastError.set(wf, { step: e.step, error: String(e.error ?? '').slice(0, 300) });
					if (e.type === 'finished') lastEnd.set(wf, { status: e.status, step: e.step });
				}
			}
		})
		.catch(() => {});
}
let n = 0;
await pool(keys, Number(arg('conc', '8')), async (key) => {
	const e = m.entries[key];
	const r = rows.get(key);
	if (!e) return;
	try {
		await snapshotPut(r.tenant, readBundle(r.dir).snapshot());
	} catch {
		// Restore conflict: run on the current state.
	}
	await fetch(`${m.control}/refresh`, { method: 'POST', body: JSON.stringify([key]) }).catch(() => {});
	const body = JSON.stringify(r.items.length === 1 ? r.items[0] : { items: r.items });
	const from = LOGS.map(logSize);
	const t0 = performance.now();
	let status;
	let text = '';
	try {
		const res = await fetch(`http://127.0.0.1:${e.port}${e.path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(TIMEOUT) });
		status = res.status;
		text = (await res.text()).slice(0, 300);
	} catch (err) {
		status = err.name === 'TimeoutError' ? 'timeout' : 'error';
	}
	await new Promise((res) => setTimeout(res, 50));
	const egress = LOGS.length ? egressLines(from) : undefined;
	out.write(`${JSON.stringify({ key, id: r.id, status, ms: Math.round(performance.now() - t0), text, end: lastEnd.get(key), failedStep: lastError.get(key), egress })}\n`);
	if (++n % 200 === 0) console.log(n);
});
out.end();
streams.abort();
console.log('scan done');
