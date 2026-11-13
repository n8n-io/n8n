/**
 * Static data with several `wfrt` processes (spec 9.7, "One owner per
 * workflow"): 4 processes, one workflow that counts its runs in static data
 * (`src/shell/testdata/static-data.ts`), and N requests.
 *
 *   node bench/cloud/synth/static-owner-test.ts [--runs 400] [--shared]
 *
 * Default (owner routing): only the owner process loads the workflow, and
 * the requests go to its port. The count must end at N, and the other
 * processes must have no static data for it and answer 404.
 *
 * `--shared` (Linux): the old layout, all 4 processes load the workflow and
 * share one port (SO_REUSEPORT). It shows the fault: the count splits over
 * the processes. It exits 0 when the split is seen.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const RUNS = Number(argv.includes('--runs') ? argv[argv.indexOf('--runs') + 1] : '400');
const SHARED = argv.includes('--shared');
const PROCS = 4;
const BASE = 28500;
const runtime = join(import.meta.dirname, '..', '..', '..');
const WFRT = join(runtime, 'zig-out', 'bin', 'wfrt');
const module = readFileSync(join(runtime, 'src', 'shell', 'testdata', 'static-data.wfm'));
const work = mkdtempSync('/tmp/wfrt-owner-');
const secret = randomBytes(24).toString('hex');
const auth = { authorization: `Bearer ${secret}`, 'content-type': 'application/json' };
const procs: ChildProcess[] = [];

const webPort = (k: number) => (SHARED ? BASE : BASE + k);
const admin = (k: number) => `http://127.0.0.1:${BASE + 100 + k}`;

async function waitUp(k: number): Promise<void> {
	for (let i = 0; i < 100; i++) {
		try {
			if ((await fetch(`${admin(k)}/_admin/workflows`, { headers: auth })).ok) return;
		} catch {
			// Not up yet.
		}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`wfrt ${k} did not start`);
}

async function main(): Promise<number> {
	for (let k = 0; k < PROCS; k++) {
		mkdirSync(join(work, `log-${k}`));
		const args = ['serve', '--profile', 'embedded', '--port', String(webPort(k)), '--shards', '1'];
		args.push('--admin-port', String(BASE + 100 + k), '--admin-secret-env', 'WFRT_ADMIN_SECRET', '--log-dir', join(work, `log-${k}`));
		procs.push(spawn(WFRT, args, { env: { ...process.env, WFRT_ADMIN_SECRET: secret }, stdio: 'ignore' }));
	}
	for (let k = 0; k < PROCS; k++) await waitUp(k);

	// The owner: one process, by a hash of the workflow id, as n8n would pick it.
	const id = 'counter';
	const owner = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PROCS;
	const body = JSON.stringify({ versionId: 'v1', module: module.toString('base64'), active: true, webhookPrefix: '/webhook' });
	for (let k = 0; k < PROCS; k++) {
		if (!SHARED && k !== owner) continue;
		const res = await fetch(`${admin(k)}/_admin/workflows/${id}`, { method: 'PUT', headers: auth, body });
		if (!res.ok) throw new Error(`load on ${k}: ${res.status} ${await res.text()}`);
	}

	// New connections each time, so SO_REUSEPORT can spread them in --shared.
	let failed = 0;
	for (let i = 0; i < RUNS; i++) {
		const res = await fetch(`http://127.0.0.1:${webPort(owner)}/webhook/sd`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', connection: 'close' },
			body: '{}',
		});
		if (!res.ok) failed++;
		await res.arrayBuffer();
	}

	const counts: number[] = [];
	for (let k = 0; k < PROCS; k++) {
		const doc = (await (await fetch(`${admin(k)}/_admin/workflows/${id}/static-data`, { headers: auth })).json()) as {
			global?: { count?: number };
		};
		counts.push(doc.global?.count ?? 0);
	}
	console.log(`${SHARED ? 'shared port' : `owner ${owner}`}: ${RUNS} runs, ${failed} failed, count by process ${JSON.stringify(counts)}`);
	if (SHARED) {
		const split = counts.filter((c) => c > 0).length > 1;
		console.log(split ? 'the count splits over the processes (the fault this test guards against)' : 'no split seen');
		return split ? 0 : 1;
	}
	const misrouted = await fetch(`http://127.0.0.1:${webPort((owner + 1) % PROCS)}/webhook/sd`, { method: 'POST', body: '{}' });
	const ok = failed === 0 && counts[owner] === RUNS && counts.every((c, k) => k === owner || c === 0) && misrouted.status === 404;
	console.log(`a request to another process: ${misrouted.status}`);
	console.log(ok ? 'PASS' : 'FAIL');
	return ok ? 0 : 1;
}

let code = 1;
try {
	code = await main();
} catch (error) {
	console.error(error);
} finally {
	for (const p of procs) p.kill('SIGTERM');
	await new Promise((r) => setTimeout(r, 300));
	rmSync(work, { recursive: true, force: true });
}
process.exit(code);
