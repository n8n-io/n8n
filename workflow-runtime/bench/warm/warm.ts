/**
 * Warm CPU per run of real workflows: one long-running `wfrt` (one shard)
 * and one fallback host, each workflow loaded once and run many times.
 *
 *   nice -n 10 node bench/warm/warm.ts --set <sets/1000> --replay <replay.jsonl> \
 *     [--sample 120 | --only <id,...>] [--runs 200] [--seconds 8] [--conc 4] [--code host|native] \
 *     [--profile <dir>] --out <file.json>
 *
 * It takes the bundles that matched the reference exactly in a replay
 * (`bench/mix/replay-cpu.mjs`), skips bundles with data tables, restores the
 * bundle's gym tenant once, checks that a first run ends as the reference
 * did, then runs the workflow `--runs` times or for `--seconds`, with
 * `--conc` runs in flight. Runs have no trace, as in production. The CPU of
 * `wfrt` and of the host (all its processes) comes from `ps`; compile time
 * and the gym do not count. The gym's responses can repeat between runs.
 *
 * `--profile <dir>` makes each host worker write the CPU time of each step
 * to `<dir>` (`step-profile.ts` of the host). Each result then has the time
 * window of its warm runs, and `host-profile.mjs` splits the host CPU by
 * node type and operation. Use `--conc 1`, so that steps do not overlap.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { compile } from '../../../packages/@n8n/workflow-lang/src/compiler/index.ts';
import { convertWorkflow } from '../../../packages/@n8n/workflow-lang/src/convert/index.ts';
import { buildCredentialsFile } from '../../../packages/@n8n/workflow-lang/src/credentials/build.ts';
import type { CredentialsFile } from '../../../packages/@n8n/workflow-lang/src/credentials/build.ts';
import { credentialRegistry } from '../../../packages/@n8n/workflow-lang/scripts/gym/credentials.ts';
import {
	GYM_ADDR,
	gymHosts,
	startEngine,
	stopAll,
} from '../../../packages/@n8n/workflow-lang/scripts/gym/processes.ts';
import { resolveCredentialData } from '../../../packages/@n8n/workflow-lang/scripts/gym/v1-credentials.ts';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

const argv = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? (argv[i + 1] ?? fallback) : fallback;
};
const SET = arg('set', '');
const REPLAY = arg('replay', '');
const SAMPLE = Number(arg('sample', '120'));
const RUNS = Number(arg('runs', '200'));
const SECONDS = Number(arg('seconds', '8'));
const CONC = Number(arg('conc', '4'));
const CODE = arg('code', 'host') === 'native' ? 'native' : 'host';
const OUT = arg('out', 'warm.json');
const PROFILE = arg('profile', '');
const BED = process.env.ENGINE_TEST_DIR ?? join(process.env.HOME ?? '', 'work/verifier/data/workflows/gym/engine-test');
const GYM_ADMIN = process.env.GYM_ADMIN ?? 'http://127.0.0.1:47090';

interface Lib {
	readBundle(dir: string): Rec;
	snapshotPut(tenant: string, bytes: Buffer): Promise<void>;
	gym(op: string, body: Rec): Promise<unknown>;
}

// ---- a small admin client: manual runs without trace, finished events ----

class Admin {
	private readonly waiters = new Map<string, (e: Rec) => void>();
	private readonly stream = new AbortController();
	private readonly url: string;
	private readonly secret: string;
	constructor(url: string, secret: string) {
		this.url = url;
		this.secret = secret;
	}

	async request(method: string, path: string, body?: unknown): Promise<void> {
		const res = await fetch(`${this.url}${path}`, {
			method,
			headers: { authorization: `Bearer ${this.secret}`, 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const text = await res.text();
		if (!res.ok) throw new Error(`wfrt ${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
	}

	async open(): Promise<void> {
		const res = await fetch(`${this.url}/_admin/events`, {
			headers: { authorization: `Bearer ${this.secret}` },
			signal: this.stream.signal,
		});
		if (!res.body) throw new Error('no event stream');
		const body = res.body;
		void (async () => {
			const dec = new TextDecoder();
			let buf = '';
			try {
				for await (const chunk of body) {
					buf += dec.decode(chunk, { stream: true });
					for (let nl = buf.indexOf('\n'); nl >= 0; nl = buf.indexOf('\n')) {
						const line = buf.slice(0, nl);
						buf = buf.slice(nl + 1);
						let e: unknown;
						try {
							e = JSON.parse(line);
						} catch {
							continue;
						}
						if (!isRec(e) || typeof e.executionId !== 'string') continue;
						if (e.type !== 'finished' && e.type !== 'waiting') continue;
						const w = this.waiters.get(e.executionId);
						this.waiters.delete(e.executionId);
						w?.(e);
					}
				}
			} catch {
				// Closed.
			}
		})();
	}

	async run(workflowId: string, executionId: string, trigger: unknown, timeoutMs: number): Promise<Rec | undefined> {
		const done = new Promise<Rec | undefined>((resolve) => {
			this.waiters.set(executionId, resolve);
			setTimeout(() => {
				if (this.waiters.delete(executionId)) resolve(undefined);
			}, timeoutMs).unref();
		});
		await this.request('POST', '/_admin/executions', { workflowId, executionId, trigger, trace: false });
		const end = await done;
		if (!end || end.type === 'waiting') {
			await this.request('DELETE', `/_admin/executions/${executionId}`).catch(() => {});
		}
		return end;
	}

	close(): void {
		this.stream.abort();
	}
}

// ---- process CPU from ps ----

function cpuOf(pids: number[]): number {
	if (pids.length === 0) return 0;
	let out = '';
	try {
		out = execFileSync('ps', ['-o', 'cputime=', '-p', pids.join(',')], { encoding: 'utf8' });
	} catch {
		return 0;
	}
	let total = 0;
	for (const t of out.trim().split('\n')) {
		const [hms, frac = '0'] = t.trim().split('.');
		total += hms.split(':').reduce((a, x) => a * 60 + Number(x), 0) + Number(`0.${frac}`);
	}
	return total;
}

function processTable(): Array<{ pid: number; ppid: number; cmd: string }> {
	const out = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' });
	return out
		.trim()
		.split('\n')
		.map((l) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l))
		.filter((m): m is RegExpExecArray => m !== null)
		.map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), cmd: m[3] }));
}

/** The `wfrt` process and the host's process tree that this script started. */
function enginePids(work: string): { wfrt: number[]; host: number[] } {
	const table = processTable();
	const mine = new Set<number>([process.pid]);
	for (let grew = true; grew; ) {
		grew = false;
		for (const r of table) {
			if (mine.has(r.ppid) && !mine.has(r.pid)) {
				mine.add(r.pid);
				grew = true;
			}
		}
	}
	const wfrt = table.filter((r) => mine.has(r.pid) && r.cmd.includes('wfrt serve') && r.cmd.includes(work)).map((r) => r.pid);
	const host = table.filter((r) => mine.has(r.pid) && (r.cmd.includes('workflow-fallback-host') || r.cmd.includes('step-worker.js'))).map((r) => r.pid);
	return { wfrt, host };
}

// ---- bundle helpers, as the engine-test adapter does them ----

function credentialsFor(slots: Record<string, { id: string | null; type: string }>, bundle: Rec): CredentialsFile {
	const file: CredentialsFile = {};
	const creds = Array.isArray(bundle.credentials) ? bundle.credentials.filter(isRec) : [];
	for (const [slot, { id, type }] of Object.entries(slots)) {
		const c = creds.find((x) => x.key === id) ?? creds.find((x) => x.type === type);
		if (!c || typeof c.type !== 'string' || !isRec(c.data)) continue;
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

function triggerValue(wf: Rec, run: Rec): unknown {
	const trigger = String(run.trigger);
	const nodes = Array.isArray(wf.nodes) ? wf.nodes.filter(isRec) : [];
	const type = String(nodes.find((n) => n.name === trigger)?.type ?? '');
	const pin = isRec(run.pinData) ? run.pinData[trigger] : undefined;
	const pinned = Array.isArray(pin) && isRec(pin[0]) ? pin[0].json : undefined;
	if (pinned) return type === 'n8n-nodes-base.webhook' ? pinned : { body: pinned };
	if (/scheduleTrigger$|\.cron$|\.interval$/.test(type)) return { scheduledAt: Date.now() };
	return { body: {}, headers: {}, query: {} };
}

async function refreshTokens(env: NodeJS.ProcessEnv, file: string): Promise<CredentialsFile> {
	const script = join(import.meta.dirname, '../../../packages/@n8n/workflow-lang/scripts/gym/oauth-refresh.ts');
	const child = spawn(process.execPath, [script, file], { env, stdio: 'ignore' });
	await new Promise<void>((resolve) => child.on('exit', () => resolve()));
	const doc: unknown = JSON.parse(readFileSync(file, 'utf8'));
	const out: CredentialsFile = {};
	if (isRec(doc)) {
		for (const [slot, e] of Object.entries(doc)) {
			if (isRec(e) && typeof e.type === 'string' && isRec(e.data)) {
				out[slot] = { type: e.type, data: e.data, ...(isRec(e.inject) ? { inject: e.inject } : {}) };
			}
		}
	}
	return out;
}

/** Node runs of the reference run (expected.json). */
function nodeRuns(expected: Rec): number {
	let n = 0;
	for (const node of Object.values(isRec(expected.nodes) ? expected.nodes : {})) {
		if (isRec(node) && typeof node.runs === 'number') n += node.runs;
	}
	return n;
}

// ---- main ----

async function main() {
	const lib = (await import(pathToFileURL(join(BED, 'harness', 'lib.mjs')).href)) as Lib;
	const exact = readFileSync(REPLAY, 'utf8')
		.trim()
		.split('\n')
		.map((l) => JSON.parse(l) as Rec)
		.filter((r) => r.match === 'exact')
		.map((r) => String(r.id))
		.sort();
	const step = Math.max(1, Math.floor(exact.length / SAMPLE));
	const only = arg('only', '');
	const ids = only ? only.split(',') : exact.filter((_, i) => i % step === 0).slice(0, SAMPLE);
	const bundlesDir = join(SET, 'bundles');

	const work = mkdtempSync('/tmp/wfrt-warm-');
	const gymEnv: NodeJS.ProcessEnv = {
		GYM_ADDR,
		GYM_HOSTS: ['postgres.sim', 'mysql.sim', ...(await gymHosts(GYM_ADMIN))].join(','),
		GYM_DNS: process.env.GYM_DNS ?? '127.0.0.1:47053',
		GYM_PORT_MAP: process.env.GYM_PORT_MAP ?? '443=47443,5432=56432,3306=53306',
		WF_FALLBACK_CODE_ALLOW_MODULES: '*',
		WF_FALLBACK_CODE_TIMEOUT_MS: '300000',
		...(PROFILE ? { WF_FALLBACK_STEP_PROFILE: PROFILE } : {}),
	};
	const engine = await startEngine(work, gymEnv, join(BED, 'harness', 'ca', 'ca.pem'));
	const admin = new Admin(engine.wfrtAdmin, engine.wfrtSecret);
	await admin.open();
	const pids = enginePids(work);
	console.log(`engine: wfrt ${pids.wfrt.join(',')}, host ${pids.host.join(',')}; ${ids.length} bundles, code ${CODE}`);

	const results: Rec[] = [];
	let seq = 1;
	for (const id of ids) {
		const dir = readdirMatch(bundlesDir, id);
		if (!dir) continue;
		const bundle = lib.readBundle(join(bundlesDir, dir));
		const meta = bundle.meta as Rec;
		const resources = isRec(bundle.resources) ? bundle.resources : {};
		const run = bundle.run as Rec;
		const wf = bundle.workflow as Rec;
		const expected = bundle.expected as Rec;
		if (Array.isArray(resources.dataTables) && resources.dataTables.length > 0) {
			results.push({ id, skipped: 'data tables' });
			continue;
		}
		const workflowId = `warm-${seq}`;
		try {
			await lib.snapshotPut(String(meta.tenant), bundle.snapshot as Buffer);
			const converted = convertWorkflow(wf, {
				name: String(meta.name ?? meta.id),
				resolveWorkflow: (wid: string) => (wid === 'GYM_STUB_SUBWORKFLOW' && isRec(resources.subworkflow) ? resources.subworkflow : undefined),
				scheduleItem: 'v1',
				trigger: String(run.trigger),
				pollTrigger: !(isRec(run.pinData) && run.trigger !== undefined && String(run.trigger) in run.pinData),
				codeNodes: CODE,
			});
			if (!converted.ok) throw new Error('convert failed');
			const compiled = compile(converted.source, { fileName: '/workflow.ts' });
			if (!compiled.ok || !compiled.module) throw new Error('compile failed');
			const credFile = join(work, `creds-${seq}.json`);
			writeFileSync(credFile, JSON.stringify(credentialsFor(converted.credentials ?? {}, bundle)), { mode: 0o600 });
			const credentials = await refreshTokens(engine.nodeEnv, credFile);
			rmSync(credFile, { force: true });
			await admin.request('PUT', `/_admin/workflows/${workflowId}`, {
				versionId: 'v1',
				module: Buffer.from(compiled.module).toString('base64'),
				active: false,
				webhookPrefix: '/webhook',
				credentials,
			});
			const trigger = triggerValue(wf, run);
			const timeoutMs = (typeof run.timeoutS === 'number' ? run.timeoutS : 60) * 1000;
			// First run: it must end as the reference did.
			const first = await admin.run(workflowId, String(seq++), trigger, timeoutMs);
			const want = expected.status === 'success' ? 'ok' : 'error';
			const got = first?.type === 'finished' && first.status === 'ok' ? 'ok' : 'error';
			if (got !== want) {
				results.push({ id, skipped: `first run ${String(first?.status ?? first?.type ?? 'timeout')}` });
				continue;
			}
			// Warm runs.
			const w0 = cpuOf(pids.wfrt);
			const h0 = cpuOf(enginePids(work).host);
			const t0 = Date.now();
			let done = 0;
			let failed = 0;
			const worker = async () => {
				while (done < RUNS && Date.now() - t0 < SECONDS * 1000) {
					done++;
					const end = await admin.run(workflowId, String(seq++), trigger, timeoutMs);
					const ok = end?.type === 'finished' && end.status === 'ok';
					if ((ok ? 'ok' : 'error') !== want) failed++;
				}
			};
			await Promise.all(Array.from({ length: CONC }, worker));
			const t1 = Date.now();
			const wall = (t1 - t0) / 1000;
			const w1 = cpuOf(pids.wfrt);
			const h1 = cpuOf(enginePids(work).host);
			const n = nodeRuns(expected);
			const r = {
				id,
				runs: done,
				failed,
				nodeRuns: n,
				wfrtUs: ((w1 - w0) * 1e6) / done,
				hostUs: ((h1 - h0) * 1e6) / done,
				wall,
				...(PROFILE ? { window: [t0, t1] } : {}),
			};
			results.push(r);
			console.log(`${id}: ${done} runs (${failed} off), wfrt ${r.wfrtUs.toFixed(0)} µs, host ${r.hostUs.toFixed(0)} µs, ${n} node runs`);
		} catch (error) {
			results.push({ id, skipped: String(error instanceof Error ? error.message : error).slice(0, 200) });
		} finally {
			await admin.request('DELETE', `/_admin/workflows/${workflowId}`).catch(() => {});
			await lib.gym('delete_tenant', { tenant: String(meta.tenant) }).catch(() => {});
		}
		writeFileSync(OUT, JSON.stringify({ code: CODE, runs: RUNS, seconds: SECONDS, conc: CONC, results }, null, 1));
	}
	admin.close();
	await stopAll();
	rmSync(work, { recursive: true, force: true });
}

function readdirMatch(dir: string, id: string): string | undefined {
	const out = execFileSync('ls', [dir], { encoding: 'utf8' }).split('\n');
	return out.find((d) => d === id || d.endsWith(`-${id}`) || d.startsWith(`${id}`));
}

await main();
