// Starts the compiled engine for the load test and loads the pool into it:
// S `wfrt` processes of one shard each, one fallback host with W workers,
// and the backend of `ctx.service` calls (services.mjs), as systemd units on
// the engine CPU set. Each workflow goes to one
// owner shard (a hash of its key), as an active webhook. The driver sends a
// workflow's requests to its owner's port.
//
//   node26 compiled.mjs --pool pool.jsonl --shards S --workers W --cpus 4,12 [--code native|host]
//     [--port 18080] [--work dir] [--mem 24G]
//
// It writes <work>/manifest.json (entries: key -> { port, path }, units,
// convert and compile times) and stays up until SIGTERM, then stops its
// units. Workflow conversion runs here, outside the engine CPU set, and is
// timed separately.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { keyOf, readPool } from './lib/poolfile.mjs';
import { gymHosts, pool, readBundle, snapshotPut } from './lib/bundle.mjs';
import { refreshOAuth } from './lib/oauth.mjs';
import { wrap } from './lib/transform.mjs';
import { startUnit, stopUnit } from './lib/units.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const LT = process.env.LT || path.join(process.env.HOME, 'wfrt-loadtest');
const SRC = path.join(LT, 'src');
const POOL = arg('pool', path.join(LT, 'data', 'pool.jsonl'));
const SHARDS = Number(arg('shards', '1'));
const WORKERS = Number(arg('workers', '1'));
const CPUS = arg('cpus', '4');
const CODE = arg('code', 'native') === 'host' ? 'host' : 'native';
const PORT = Number(arg('port', '18080'));
const WORK = path.resolve(arg('work', path.join(LT, 'engine', 'compiled')));
const MEM = arg('mem', '24G');
const NODE26 = path.join(LT, 'e2e-cache', 'node-v26.7.0', 'bin', 'node');
const CA = path.join(LT, 'data', 'engine-test', 'harness', 'ca', 'ca.pem');

const imp = (p) => import(pathToFileURL(path.join(SRC, p)).href);
const { convertWorkflow } = await imp('packages/@n8n/workflow-lang/src/convert/index.ts');
const { compile } = await imp('packages/@n8n/workflow-lang/src/compiler/index.ts');
const { buildCredentialsFile } = await imp('packages/@n8n/workflow-lang/src/credentials/build.ts');
const { credentialRegistry } = await imp('packages/@n8n/workflow-lang/scripts/gym/credentials.ts');
const { resolveCredentialData } = await imp('packages/@n8n/workflow-lang/scripts/gym/v1-credentials.ts');

function credentialsFor(slots, bundle) {
	const file = {};
	for (const [slot, { id, type }] of Object.entries(slots)) {
		const c = bundle.credentials.find((x) => x.key === id) ?? bundle.credentials.find((x) => x.type === type);
		if (!c) continue;
		const built = buildCredentialsFile({
			exported: [{ id: slot, name: slot, type: c.type, data: resolveCredentialData(c.type, c.data) }],
			slots: [{ slot, type: c.type }],
			mappings: new Map([[slot, slot]]),
			registry: credentialRegistry(),
		});
		Object.assign(file, built.file);
	}
	return file;
}

const units = [];
function stopAll() {
	for (const u of units) stopUnit(u);
}
process.on('SIGTERM', () => {
	stopAll();
	process.exit(0);
});
process.on('SIGINT', () => {
	stopAll();
	process.exit(0);
});

// The host runs on Node 26. Its expression runtime needs isolated-vm built
// for that Node ABI; a build for the system Node makes every host expression
// fail ("IsolatePool failed to create any bridges"). native26.sh rebuilds it.
try {
	execFileSync(NODE26, ['-e', "const i = new (require('isolated-vm').Isolate)({ memoryLimit: 16 }); i.dispose()"], {
		cwd: path.join(SRC, 'packages/@n8n/expression-runtime'),
		stdio: 'pipe',
	});
} catch (e) {
	throw new Error(`isolated-vm does not load in Node 26: run kit/native26.sh (${String(e.stderr ?? e.message).split('\n').find((l) => l.includes('Error')) ?? ''})`);
}

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(path.join(WORK, 'tables'), { recursive: true });
fs.mkdirSync(path.join(WORK, 'host-home'), { recursive: true });
fs.mkdirSync(path.join(WORK, 'dedup'), { recursive: true });
const gymEnv = {
	GYM_ADDR: process.env.GYM_ADDR ?? '10.255.0.53',
	GYM_HOSTS: (await gymHosts()).join(','),
	GYM_DNS: process.env.GYM_DNS ?? '127.0.0.1:47053',
	GYM_PORT_MAP: process.env.GYM_PORT_MAP ?? '443=47443,5432=56432,3306=53306',
};
const socket = path.join(WORK, 'fb.sock');
startUnit('host', {
	cpus: CPUS,
	mem: MEM,
	dir: WORK,
	env: {
		...gymEnv,
		PATH: `${path.dirname(NODE26)}:/usr/bin:/bin`,
		HOME: WORK,
		NODE_OPTIONS: `--require=${path.join(LT, 'ai-gym', 'deploy', 'e2e', 'host', 'resolve.cjs')}`,
		NODE_EXTRA_CA_CERTS: CA,
		N8N_USER_FOLDER: path.join(WORK, 'host-home'),
		TZ: 'UTC',
		WF_FALLBACK_CODE_ALLOW_MODULES: '*',
		WF_FALLBACK_CODE_TIMEOUT_MS: '300000',
		WF_FALLBACK_DATA_TABLES_DIR: path.join(WORK, 'tables'),
		// As the engine-test adapter: no n8n database, so deduplication data goes to files,
		// one store for the host and the service calls (services.mjs).
		WF_FALLBACK_DEDUPLICATION: 'file',
		WF_FALLBACK_DEDUPLICATION_DIR: path.join(WORK, 'dedup'),
		// Extra host settings for profiles (profile/run.sh): a JSON object.
		...(process.env.LT_HOST_ENV ? JSON.parse(process.env.LT_HOST_ENV) : {}),
	},
	argv: [NODE26, path.join(SRC, 'packages/@n8n/workflow-fallback-host/dist/main.js'), '--socket', socket, '--workers', String(WORKERS)],
});
units.push('host');
for (let i = 0; i < 600 && !fs.existsSync(socket); i++) await new Promise((r) => setTimeout(r, 100));
if (!fs.existsSync(socket)) throw new Error('the fallback host did not start; see logs/host.log');

const secret = randomBytes(24).toString('hex');
const shards = [];
for (let k = 0; k < SHARDS; k++) {
	const logDir = path.join(WORK, `wfrt-log-${k}`);
	fs.mkdirSync(logDir, { recursive: true });
	const port = PORT + k;
	const admin = `http://127.0.0.1:${PORT + 100 + k}`;
	startUnit(`wfrt-${k}`, {
		cpus: CPUS,
		mem: MEM,
		dir: WORK,
		env: { ...gymEnv, WFRT_ADMIN_SECRET: secret, TZ: 'UTC' },
		argv: [
			process.env.LT_WFRT ?? path.join(SRC, 'workflow-runtime/zig-out/bin/wfrt'), 'serve', '--profile', 'embedded', '--port', String(port), '--shards', '1',
			'--max-modules', '4096', '--module-store-mb', '512',
			'--admin-port', String(PORT + 100 + k), '--admin-secret-env', 'WFRT_ADMIN_SECRET', '--log-dir', logDir,
			'--fallback', socket, '--gym-env', '--ca-file', CA,
		],
	});
	units.push(`wfrt-${k}`);
	shards.push({ port, admin });
}
const auth = { authorization: `Bearer ${secret}`, 'content-type': 'application/json' };
// The backend of `ctx.service` calls (Data Table, deduplication): wfrt waits for its answers.
startUnit('svc', {
	cpus: CPUS,
	mem: '4G',
	dir: WORK,
	env: { PATH: `${path.dirname(NODE26)}:/usr/bin:/bin`, HOME: WORK, LT, WFRT_ADMIN_SECRET: secret, WF_FALLBACK_DEDUPLICATION_DIR: path.join(WORK, 'dedup'), TZ: 'UTC' },
	argv: [NODE26, path.join(LT, 'kit', 'services.mjs'), '--admin', shards.map((x) => x.admin).join(','), '--tables', path.join(WORK, 'tables'), '--fanout', String(PORT + 300)],
});
units.push('svc');
for (const s of shards) {
	let ok = false;
	for (let i = 0; i < 300 && !ok; i++) {
		ok = await fetch(`${s.admin}/_admin/workflows`, { headers: auth }).then((r) => r.ok, () => false);
		if (!ok) await new Promise((r) => setTimeout(r, 100));
	}
	if (!ok) throw new Error('wfrt did not start; see logs/wfrt-*.log');
}

const KEYS = arg('keys', '');
const rows = readPool(POOL, KEYS ? new Set(fs.readFileSync(KEYS, 'utf8').split('\n').filter(Boolean)) : undefined);
// Compiled modules are cached by key and Code mode: compile time is measured
// once (the first build) and reported with the cache state.
const CACHE = path.join(LT, 'engine', 'compiled-cache', CODE);
fs.mkdirSync(CACHE, { recursive: true });
let cached = 0;
const modules = new Map();
const needsRefresh = (m) => Object.values(m.credentials).some((c) => c.data?.oauthTokenData?.refresh_token);

/**
 * Loads a workflow into its owner shard. `wfrt` does not refresh OAuth2
 * tokens (spec 7), so the tokens are refreshed first against the tenant, as
 * the engine-test adapter does before each run. A tenant restore brings the
 * old tokens back, so the driver asks for this again after each restore
 * (POST /refresh on the control port).
 */
async function put(key, m) {
	const credentials = structuredClone(m.credentials);
	if (needsRefresh(m)) refreshed[key] = await refreshOAuth(credentials, CA);
	const body = JSON.stringify({ versionId: 'v1', module: m.module, active: true, webhookPrefix: '/webhook', credentials });
	const res = await fetch(`${shards[m.owner].admin}/_admin/workflows/${key}`, { method: 'PUT', headers: auth, body });
	if (!res.ok) throw new Error(`load: ${res.status} ${(await res.text()).slice(0, 200)}`);
}
const entries = {};
const failed = {};
const refreshed = {};
let convertMs = 0;
let compileMs = 0;
let loadMs = 0;
const t0 = Date.now();
await pool(rows, 4, async (row) => {
	const key = keyOf(row.id);
	try {
		const b = readBundle(row.dir);
		const w = wrap(b, key, row.items);
		let text = JSON.stringify(w.workflow);
		for (const dt of b.resources.dataTables ?? []) {
			const id = `${key}-${dt.key}`.replace(/[^A-Za-z0-9_-]/g, '_');
			fs.writeFileSync(
				path.join(WORK, 'tables', `${id}.json`),
				JSON.stringify({ id, name: `${dt.name} ${key}`, columns: dt.columns.map((name) => ({ name, type: 'string' })), rows: dt.rows ?? [] }),
			);
			text = text.replaceAll(dt.key, id);
		}
		const wf = JSON.parse(text);
		const cacheFile = path.join(CACHE, `${key}.json`);
		let unit;
		if (fs.existsSync(cacheFile)) {
			unit = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
			cached++;
		} else {
			const c0 = performance.now();
			const converted = convertWorkflow(wf, {
				name: String(b.meta.name ?? b.meta.id),
				resolveWorkflow: (id) => (id === 'GYM_STUB_SUBWORKFLOW' ? b.resources.subworkflow : undefined),
				trigger: w.webhookName,
				trace: 'none',
				codeNodes: CODE,
			});
			const c1 = performance.now();
			if (!converted.ok) throw new Error(`convert: ${converted.diagnostics.find((d) => d.severity === 'error')?.message ?? 'failed'}`);
			const compiled = compile(converted.source, { fileName: '/workflow.ts' });
			const c2 = performance.now();
			convertMs += c1 - c0;
			compileMs += c2 - c1;
			if (!compiled.ok || !compiled.module) throw new Error(`compile: ${compiled.diagnostics?.[0]?.message ?? 'failed'}`);
			unit = {
				module: Buffer.from(compiled.module).toString('base64'),
				slots: converted.credentials ?? {},
				fallbackNodes: converted.fallbackNodes ?? [],
				convertMs: c1 - c0,
				compileMs: c2 - c1,
			};
			fs.writeFileSync(cacheFile, JSON.stringify(unit));
		}
		const owner = parseInt(key.slice(0, 8), 16) % SHARDS;
		const loaded = { owner, module: unit.module, credentials: credentialsFor(unit.slots, b), tenant: row.tenant, dir: row.dir };
		if (needsRefresh(loaded)) await snapshotPut(row.tenant, b.snapshot());
		const l0 = performance.now();
		await put(key, loaded);
		loadMs += performance.now() - l0;
		modules.set(key, loaded);
		entries[key] = { port: shards[owner].port, path: `/webhook/${w.path}`, owner };
	} catch (e) {
		failed[key] = String(e.message).slice(0, 300);
	}
});
const manifest = {
	engine: `compiled-${CODE}`,
	shards: SHARDS,
	workers: WORKERS,
	cpus: CPUS,
	units,
	loaded: Object.keys(entries).length,
	failed,
	refreshed,
	control: `http://127.0.0.1:${PORT + 99}`,
	// For profile/stepcost.mjs, which loads its own workflows. Local only.
	admin: shards.map((x) => x.admin),
	// The event streams, served again by services.mjs: wfrt takes one reader only.
	events: shards.map((_, k) => `http://127.0.0.1:${PORT + 300 + k}/`),
	adminSecret: secret,
	loadSeconds: (Date.now() - t0) / 1000,
	cachedModules: cached,
	convertMs,
	compileMs,
	adminPutMs: loadMs,
	entries,
};
fs.writeFileSync(path.join(WORK, 'manifest.json'), JSON.stringify(manifest, null, 1));
// The control port: POST /refresh with a JSON list of keys loads them again with fresh tokens.
http
	.createServer((req, res) => {
		if (req.method !== 'POST' || req.url !== '/refresh') return void res.writeHead(404).end();
		let text = '';
		req.on('data', (d) => (text += d));
		req.on('end', async () => {
			const keys = JSON.parse(text || '[]').filter((k) => modules.has(k) && needsRefresh(modules.get(k)));
			const t = Date.now();
			let failedPuts = 0;
			await pool(keys, 8, async (k) => {
				try {
					await put(k, modules.get(k));
				} catch {
					failedPuts++;
				}
			});
			res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ refreshed: keys.length, failed: failedPuts, seconds: (Date.now() - t) / 1000 }));
		});
	})
	.listen(PORT + 99, '127.0.0.1');
console.log(`ready: ${manifest.loaded} loaded, ${Object.keys(failed).length} failed, convert ${(convertMs / 1000).toFixed(1)} s, compile ${(compileMs / 1000).toFixed(1)} s`);
setInterval(() => {}, 1 << 30);
