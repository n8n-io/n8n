/**
 * Starts the system under test of the synthetic benchmark and keeps it
 * running: the vendor stub (`upstream.mjs`), the fallback host and `wfrt`,
 * with the synthetic workflows (`workflows.mjs`) loaded as active webhooks.
 * `--shards N` starts N `wfrt` processes of one shard each (the admin API
 * needs one shard per process), each pinned to one CPU of WFRT_CPUS.
 *
 * Each workflow has one owner process, and only the owner loads it: the
 * workflow's static data (spec 9.7) lives in one table, so a run must start
 * where the others started. Each process has its own webhook port, and the
 * driver sends a workflow's requests to its owner's port, as n8n's webhook
 * forwarding does (spec 9.7, "One owner per workflow"). The owners are
 * chosen to balance the weights of the mix; with many workflows a hash of
 * the id does the same.
 *
 *   node bench/cloud/synth/engine.ts --work <dir> [--shards 1] [--workers 2] [--code host|native]
 *     [--port 18080] [--control-port 18099] [--bind 127.0.0.1]
 *
 * Environment:
 *   SERVER_CPUS  CPU list for `wfrt` and the host (`taskset -c`, Linux only)
 *   WFRT_CPUS    CPU list for `wfrt` alone (default SERVER_CPUS)
 *   HOST_CPUS    CPU list for the host alone (default SERVER_CPUS)
 *   AUX_CPUS     CPU list for the stub
 *
 * When everything is up, it writes `<work>/ready.json` and serves a small
 * control API on `--control-port` (on `--bind`, so a driver on another
 * machine can reach it):
 *
 *   GET  /manifest  the webhook port and the workflows: name, path, copies, node runs
 *   GET  /cpu       CPU seconds so far of `wfrt` and of the host (all its processes)
 *   GET  /stub      the stub's call counts by route
 *   POST /stop      stops everything and ends
 *
 * The control API has no authentication: run it only on a private network.
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

import { compile } from '../../../../packages/@n8n/workflow-lang/src/compiler/index.ts';
import { convertWorkflow } from '../../../../packages/@n8n/workflow-lang/src/convert/index.ts';
import { credentialsDocument } from '../../../../packages/@n8n/workflow-lang/scripts/gym/credentials.ts';
// @ts-expect-error: a plain JavaScript module without types.
import { credentials as synthCredentials, hosts, requestBody, workflows } from './workflows.mjs';

type Rec = Record<string, unknown>;
const argv = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? (argv[i + 1] ?? fallback) : fallback;
};
const WORK = arg('work', '/tmp/wfrt-synth');
const SHARDS = Number(arg('shards', '1'));
const WORKERS = Number(arg('workers', '2'));
const CODE = arg('code', 'host') === 'native' ? 'native' : 'host';
const PORT = Number(arg('port', '18080'));
const CONTROL_PORT = Number(arg('control-port', '18099'));
const BIND = arg('bind', '127.0.0.1');
const GYM_ADDR = '10.255.0.53';

const here = import.meta.dirname;
const runtimeDir = join(here, '..', '..', '..');
const repoRoot = join(runtimeDir, '..');
const WFRT = process.env.WFRT_BIN ?? join(runtimeDir, 'zig-out', 'bin', 'wfrt');
const HOST = join(repoRoot, 'packages', '@n8n', 'workflow-fallback-host', 'dist', 'main.js');
const isLinux = process.platform === 'linux';

const children: ChildProcess[] = [];

/** Starts a process in its own group, pinned to `cpus` on Linux. */
function start(name: string, cmd: string, args: string[], env: NodeJS.ProcessEnv, cpus: string | undefined): ChildProcess {
	const fd = openSync(join(WORK, `${name}.log`), 'a');
	const pinned = isLinux && cpus ? ['taskset', ['-c', cpus, cmd, ...args]] : [cmd, args];
	const child = spawn(pinned[0] as string, pinned[1] as string[], { env, stdio: ['ignore', fd, fd], detached: true });
	closeSync(fd);
	children.push(child);
	return child;
}

function stopAll(): void {
	for (const c of children) {
		if (c.pid !== undefined && c.exitCode === null) {
			try {
				process.kill(-c.pid, 'SIGTERM');
			} catch {
				// Gone.
			}
		}
	}
}

async function waitFor(what: string, check: () => Promise<boolean> | boolean, ms = 60_000): Promise<void> {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		try {
			if (await check()) return;
		} catch {
			// Not up yet.
		}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`${what} did not start in ${ms} ms; see the logs in ${WORK}`);
}

// ---- CPU time of process trees: /proc on Linux, ps elsewhere ----

const CLK_TCK = isLinux ? Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim()) : 100;

function procTable(): Array<{ pid: number; ppid: number; cpu: number }> {
	if (isLinux) {
		const rows = [];
		for (const d of readdirSync('/proc')) {
			if (!/^\d+$/.test(d)) continue;
			try {
				const stat = readFileSync(`/proc/${d}/stat`, 'utf8');
				// The command name can hold spaces: the fields start after the last ')'.
				const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
				rows.push({ pid: Number(d), ppid: Number(f[1]), cpu: (Number(f[11]) + Number(f[12])) / CLK_TCK });
			} catch {
				// Ended meanwhile.
			}
		}
		return rows;
	}
	const out = execFileSync('ps', ['-axo', 'pid=,ppid=,cputime='], { encoding: 'utf8' });
	return out
		.trim()
		.split('\n')
		.map((l) => l.trim().split(/\s+/))
		.map(([pid, ppid, t]) => {
			const [hms, frac = '0'] = t.split('.');
			const secs = hms.split(':').reduce((a, x) => a * 60 + Number(x), 0) + Number(`0.${frac}`);
			return { pid: Number(pid), ppid: Number(ppid), cpu: secs };
		});
}

/** CPU seconds of each root and all its descendants. */
function treeCpu(roots: Record<string, number>): Record<string, number> {
	const table = procTable();
	const out: Record<string, number> = {};
	for (const [name, root] of Object.entries(roots)) {
		const mine = new Set([root]);
		for (let grew = true; grew; ) {
			grew = false;
			for (const r of table) {
				if (mine.has(r.ppid) && !mine.has(r.pid)) {
					mine.add(r.pid);
					grew = true;
				}
			}
		}
		out[name] = table.filter((r) => mine.has(r.pid)).reduce((a, r) => a + r.cpu, 0);
	}
	return out;
}

/** The webhook port of process `k`: `--port` for the first, then 300 above it. */
function webhookPort(k: number): number {
	return k === 0 ? PORT : PORT + 300 + k;
}

/** "0-3,6" to [0, 1, 2, 3, 6]. */
function expandCpus(list: string | undefined): number[] {
	if (!list || !isLinux) return [];
	const out: number[] = [];
	for (const part of list.split(',')) {
		const [a, b] = part.split('-').map(Number);
		for (let c = a; c <= (b ?? a); c++) out.push(c);
	}
	return out;
}

// ---- certificates for the stub: a CA and one leaf for all vendor names ----

function makeCerts(dir: string): { ca: string; cert: string; key: string } {
	const ca = join(dir, 'ca.pem');
	const cert = join(dir, 'leaf.pem');
	const key = join(dir, 'leaf-key.pem');
	if (existsSync(cert)) return { ca, cert, key };
	const openssl = existsSync('/opt/homebrew/opt/openssl@3/bin/openssl') ? '/opt/homebrew/opt/openssl@3/bin/openssl' : 'openssl';
	const run = (args: string[]) => execFileSync(openssl, args, { cwd: dir, stdio: 'ignore' });
	run(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-subj', '/CN=wfrt synthetic CA', '-keyout', 'ca-key.pem', '-out', 'ca.pem']);
	run(['req', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=synthetic upstream', '-keyout', 'leaf-key.pem', '-out', 'leaf.csr']);
	const sans = [...hosts, 'localhost'].map((h: string) => `DNS:${h}`).join(',');
	writeFileSync(join(dir, 'leaf.ext'), `subjectAltName=${sans},IP:127.0.0.1\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\n`);
	run(['x509', '-req', '-in', 'leaf.csr', '-CA', 'ca.pem', '-CAkey', 'ca-key.pem', '-CAcreateserial', '-days', '30', '-extfile', 'leaf.ext', '-out', 'leaf.pem']);
	return { ca, cert, key };
}

// ---- main ----

async function main() {
	mkdirSync(WORK, { recursive: true });
	rmSync(join(WORK, 'ready.json'), { force: true });
	const certs = makeCerts(WORK);
	const [stubHttps, stubHttp, adminPort] = [PORT + 10, PORT + 11, PORT + 100];

	const upstream = start(
		'upstream',
		process.execPath,
		[join(here, 'upstream.mjs'), '--https', String(stubHttps), '--http', String(stubHttp), '--cert', certs.cert, '--key', certs.key, '--log', join(WORK, 'unknown-routes.txt')],
		process.env,
		process.env.AUX_CPUS,
	);
	const gymEnv = { GYM_ADDR, GYM_HOSTS: hosts.join(','), GYM_PORT_MAP: `443=${stubHttps},80=${stubHttp}` };

	const socket = join(WORK, 'fb.sock');
	rmSync(socket, { force: true });
	mkdirSync(join(WORK, 'host-home'), { recursive: true });
	const host = start(
		'host',
		process.execPath,
		[HOST, '--socket', socket, '--workers', String(WORKERS)],
		{
			...process.env,
			...gymEnv,
			NODE_OPTIONS: `--require=${join(here, 'resolve.cjs')}`,
			NODE_EXTRA_CA_CERTS: certs.ca,
			N8N_USER_FOLDER: join(WORK, 'host-home'),
			WF_FALLBACK_CODE_TIMEOUT_MS: '60000',
			TZ: 'UTC',
		},
		process.env.HOST_CPUS ?? process.env.SERVER_CPUS,
	);
	await waitFor('the fallback host', () => existsSync(socket));

	// One wfrt process for each shard: the admin API (spec 9.1) needs one
	// shard per process. Each has its own webhook port; they share the host.
	const secret = randomBytes(24).toString('hex');
	const auth = { authorization: `Bearer ${secret}`, 'content-type': 'application/json' };
	const cpuList = expandCpus(process.env.WFRT_CPUS ?? process.env.SERVER_CPUS);
	const shards: ChildProcess[] = [];
	const admins: string[] = [];
	for (let k = 0; k < SHARDS; k++) {
		mkdirSync(join(WORK, `wfrt-log-${k}`), { recursive: true });
		const cpus = cpuList.length > 0 ? String(cpuList[k % cpuList.length]) : undefined;
		shards.push(
			start(
				`wfrt-${k}`,
				WFRT,
				['serve', '--profile', 'embedded', '--port', String(webhookPort(k)), '--shards', '1', '--admin-port', String(adminPort + k), '--admin-secret-env', 'WFRT_ADMIN_SECRET', '--log-dir', join(WORK, `wfrt-log-${k}`), '--fallback', socket, '--gym-env', '--ca-file', certs.ca],
				{ ...process.env, ...gymEnv, WFRT_ADMIN_SECRET: secret, TZ: 'UTC' },
				cpus,
			),
		);
		admins.push(`http://127.0.0.1:${adminPort + k}`);
	}
	for (const admin of admins) await waitFor('wfrt', async () => (await fetch(`${admin}/_admin/workflows`, { headers: auth })).ok);

	// Load each workflow as an active webhook on its owner: the process with
	// the least weight so far, heaviest workflows first.
	const manifest: Rec[] = [];
	const list = workflows as Array<{ copies: number; workflow: Rec }>;
	const load = new Array<number>(SHARDS).fill(0);
	const owner = new Map<number, number>();
	for (const i of list.map((_, i) => i).sort((a, b) => list[b].copies - list[a].copies)) {
		const k = load.indexOf(Math.min(...load));
		owner.set(i, k);
		load[k] += list[i].copies;
	}
	for (const [i, w] of list.entries()) {
		const wf = w.workflow;
		const name = String(wf.name);
		const converted = convertWorkflow(wf, { name, trigger: 'Webhook', codeNodes: CODE });
		if (!converted.ok) throw new Error(`${name}: convert failed: ${JSON.stringify(converted.diagnostics ?? '').slice(0, 400)}`);
		const compiled = compile(converted.source, { fileName: '/workflow.ts' });
		if (!compiled.ok || !compiled.module) throw new Error(`${name}: compile failed`);
		const doc = credentialsDocument(converted.credentials ?? {}, synthCredentials);
		const body = JSON.stringify({ versionId: 'v1', module: Buffer.from(compiled.module).toString('base64'), active: true, webhookPrefix: '/webhook', credentials: doc.file });
		const k = owner.get(i) ?? 0;
		const res = await fetch(`${admins[k]}/_admin/workflows/synth-${i}`, { method: 'PUT', headers: auth, body });
		if (!res.ok) throw new Error(`${name}: load failed: ${res.status} ${await res.text()}`);
		const nodes = Array.isArray(wf.nodes) ? (wf.nodes as Rec[]) : [];
		const path = String((nodes[0].parameters as Rec).path);
		manifest.push({ name, path: `/webhook/${path}`, port: webhookPort(k), owner: k, copies: w.copies, nodeRuns: nodes.length, sample: requestBody(1) });
	}

	const roots: Record<string, number> = { host: host.pid ?? 0, upstream: upstream.pid ?? 0 };
	shards.forEach((c, k) => (roots[`wfrt${k}`] = c.pid ?? 0));
	const cpuNow = () => {
		const t = treeCpu(roots);
		let wfrt = 0;
		for (let k = 0; k < SHARDS; k++) wfrt += t[`wfrt${k}`];
		// Instructions and cycles of the wfrt processes (macOS, RUSAGE_BIN: bench/perf/rusage.c).
		let instructions = 0;
		let cycles = 0;
		if (process.env.RUSAGE_BIN) {
			const pids = shards.map((c) => String(c.pid ?? 0));
			for (const line of execFileSync(process.env.RUSAGE_BIN, pids, { encoding: 'utf8' }).trim().split('\n')) {
				const [, ins, cyc] = line.split(' ').map(Number);
				instructions += ins;
				cycles += cyc;
			}
		}
		return { t: Date.now(), wfrt, host: t.host, upstream: t.upstream, instructions, cycles };
	};
	const info = { port: PORT, shards: SHARDS, workers: WORKERS, code: CODE, workflows: manifest };
	const control = createServer((req, res) => {
		const send = (body: unknown) => {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(body));
		};
		if (req.url === '/manifest') return send(info);
		if (req.url === '/cpu') return send(cpuNow());
		if (req.url === '/stub') {
			void fetch(`http://127.0.0.1:${stubHttp}/_stub/stats`).then(async (r) => send(await r.json()), () => send({}));
			return;
		}
		if (req.url === '/stop' && req.method === 'POST') {
			send({ stopping: true });
			stopAll();
			setTimeout(() => process.exit(0), 500);
			return;
		}
		res.writeHead(404);
		res.end();
	});
	control.listen(CONTROL_PORT, BIND);
	writeFileSync(join(WORK, 'ready.json'), JSON.stringify(info, null, 1));
	console.log(`ready: ${manifest.length} workflows, webhooks on ${PORT}, control on ${BIND}:${CONTROL_PORT}`);
	for (const c of [...shards, host, upstream]) {
		c.on('exit', (code) => {
			if (code !== 0 && code !== null) console.error(`a process ended with ${code}; see ${WORK}`);
		});
	}
}

process.on('SIGTERM', () => {
	stopAll();
	process.exit(0);
});
process.on('SIGINT', () => {
	stopAll();
	process.exit(0);
});
main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	stopAll();
	process.exit(1);
});
