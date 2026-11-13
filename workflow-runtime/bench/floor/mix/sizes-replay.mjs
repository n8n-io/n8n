// Replays engine-test bundles one at a time on the compiled engine and
// measures payload sizes only. No payload content is kept.
//
//   node sizes-replay.mjs <out.jsonl> <tmp-dir> <ids-file>
//
// - A local HTTPS proxy sits between the engine and the gym (GYM_PORT_MAP
//   443 points to it). It ends TLS with a leaf certificate signed by the gym
//   CA, forwards each request to the gym and counts bytes for each call.
// - The adapter keeps each run's events.jsonl (ENGINE_TEST_KEEP=all). We sum
//   the bytes of each step's trace items, then delete the run's folder.
// - Postgres and MySQL traffic does not go through the proxy (not HTTP).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import tls from 'node:tls';
import { pathToFileURL } from 'node:url';

const [OUT, TMP, IDS] = process.argv.slice(2);
const BED = path.join(process.env.HOME, 'work/verifier/data/workflows/gym/engine-test');
const SET = path.join(BED, 'sets/1000-v3/bundles');
const CA = path.join(BED, 'harness/ca');
const GYM_HTTPS = 47443;
const ADAPTER = path.join(process.env.HOME, 'work/n8n/packages/@n8n/workflow-lang/scripts/gym/engine-test-adapter.mjs');
fs.mkdirSync(path.join(TMP, 'certs'), { recursive: true });
fs.mkdirSync(path.join(TMP, 'scratch'), { recursive: true });

// One leaf certificate per server name, made with openssl and cached.
const contexts = new Map();
function contextFor(name) {
	if (contexts.has(name)) return contexts.get(name);
	const base = path.join(TMP, 'certs', name.replace(/[^a-z0-9.-]/gi, '_'));
	if (!fs.existsSync(`${base}.crt`)) {
		execFileSync('openssl', ['req', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-keyout', `${base}.key`,
			'-subj', `/CN=${name}`, '-addext', `subjectAltName=DNS:${name}`, '-CA', `${CA}/ca.pem`, '-CAkey', `${CA}/ca-key.pem`,
			'-days', '7', '-out', `${base}.crt`], { stdio: 'ignore' });
	}
	const ctx = tls.createSecureContext({ key: fs.readFileSync(`${base}.key`), cert: fs.readFileSync(`${base}.crt`) });
	contexts.set(name, ctx);
	return ctx;
}

// The calls of the bundle that runs now.
let calls = [];
const headerBytes = (raw) => raw.reduce((a, s) => a + Buffer.byteLength(s) + 2, 0);
const upstream = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
const proxy = https.createServer(
	{ SNICallback: (name, cb) => { try { cb(null, contextFor(name)); } catch (e) { cb(e); } }, ALPNProtocols: ['http/1.1'] },
	(req, res) => {
		const host = req.socket.servername || String(req.headers.host || '').split(':')[0];
		const c = {
			host, method: req.method, token: /oauth|token/i.test(req.url ?? '') && req.method === 'POST',
			reqHead: Buffer.byteLength(`${req.method} ${req.url} HTTP/1.1`) + headerBytes(req.rawHeaders), reqBody: 0,
			status: 0, respHead: 0, respBody: 0, enc: '',
		};
		calls.push(c);
		const up = https.request({ host: '127.0.0.1', port: GYM_HTTPS, servername: host, method: req.method, path: req.url,
			headers: req.headers, agent: upstream }, (ur) => {
			c.status = ur.statusCode;
			c.respHead = headerBytes(ur.rawHeaders);
			c.enc = ur.headers['content-encoding'] ?? '';
			ur.on('data', (d) => (c.respBody += d.length));
			res.writeHead(ur.statusCode, ur.rawHeaders);
			ur.pipe(res);
		});
		up.on('error', () => { c.status = -1; res.destroy(); });
		req.on('data', (d) => (c.reqBody += d.length));
		req.pipe(up);
	},
);
await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
const port = proxy.address().port;

// The adapter reads these when it starts wfrt and the host.
process.env.GYM_PORT_MAP = `443=${port},5432=56432,3306=53306`;
process.env.ENGINE_TEST_KEEP = 'all';
process.env.ENGINE_TEST_SCRATCH = path.join(TMP, 'scratch');

const lib = await import(pathToFileURL(path.join(BED, 'harness/lib.mjs')).href);
const engine = await import(pathToFileURL(ADAPTER).href);
await engine.setup();

// Byte size of an item's JSON, without the binary part; the binary part apart.
const size = (it) => {
	if (!it || typeof it !== 'object') return [Buffer.byteLength(JSON.stringify(it) ?? ''), 0];
	const { $binary, ...json } = it;
	return [Buffer.byteLength(JSON.stringify(json)), $binary ? Buffer.byteLength(JSON.stringify($binary)) : 0];
};
const len = (v) => (v == null ? 0 : Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v)));

function measureEvents(file, types) {
	const runs = [];
	const httpSteps = [];
	if (!fs.existsSync(file)) return { runs, httpSteps };
	const started = new Map();
	for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
		if (!line) continue;
		const e = JSON.parse(line);
		if (e.type === 'trace' && typeof e.step === 'string') {
			if (e.items && !Array.isArray(e.items)) continue; // $error / $subRuns traces
			const raw = Array.isArray(e.items) ? e.items : [];
			const lists = raw.length > 0 && raw.every(Array.isArray) ? raw : [raw];
			let items = 0, bytes = 0, bin = 0;
			for (const l of lists) for (const it of l) { const [j, b] = size(it); items++; bytes += j; bin += b; }
			runs.push({ type: types[e.step] ?? '?', step: e.step, items, bytes, bin });
		} else if (e.type === 'step' && e.status === 'started' && e.args && 'url' in e.args && 'method' in e.args) {
			started.set(e.step, len(e.args.body));
		} else if (e.type === 'step' && e.status === 'completed' && started.has(e.step) && e.result) {
			httpSteps.push({ reqBody: started.get(e.step), respBody: len(e.result.body) });
			started.delete(e.step);
		}
	}
	return { runs, httpSteps };
}

const ids = fs.readFileSync(IDS, 'utf8').split('\n').filter(Boolean);
const out = fs.createWriteStream(OUT, { flags: 'a' });
let n = 0;
for (const id of ids) {
	const b = lib.readBundle(path.join(SET, id));
	calls = [];
	const t0 = Date.now();
	let match = 'harness_error', status = '';
	try {
		await lib.snapshotPut(b.meta.tenant, b.snapshot);
		const actual = await engine.execute(b);
		match = lib.compare(b.expected, actual).match;
		status = actual.status;
	} catch { /* counted as harness_error */ }
	await lib.gym('delete_tenant', { tenant: b.meta.tenant }).catch(() => {});
	const types = Object.fromEntries((b.workflow.nodes ?? []).map((x) => [x.name, x.type]));
	const dirs = fs.readdirSync(path.join(TMP, 'scratch')).filter((d) => d.startsWith(`wfrt-${id}-`));
	const m = dirs.length ? measureEvents(path.join(TMP, 'scratch', dirs[0], 'events.jsonl'), types) : { runs: [], httpSteps: [] };
	if (!process.env.MIX_KEEP) for (const d of dirs) fs.rmSync(path.join(TMP, 'scratch', d), { recursive: true, force: true });
	// Keep step names out of the output: mark the trigger run, then drop the name.
	const runs = m.runs.map(({ step, ...r }) => ({ ...r, trigger: step === b.run.trigger }));
	out.write(JSON.stringify({ id, match, status, triggerType: b.meta.trigger_type, triggerMode: b.meta.trigger_mode,
		seconds: (Date.now() - t0) / 1000, runs, httpSteps: m.httpSteps, calls: calls.slice() }) + '\n');
	console.log(`[${++n}/${ids.length}] ${match} ${id} calls=${calls.length} runs=${runs.length}`);
}
out.end();
proxy.close();
upstream.destroy();
// The adapter stops wfrt and the host when it is idle, then the process exits.
