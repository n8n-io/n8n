// Where wfrt's CPU per run goes on the n8n integration path: the same
// workflow through a webhook and through the admin API, with and without a
// client on the event stream.
//   node bench/warm/admin-cost.mjs [runs]
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const wfrt = process.env.WFRT ?? join(root, 'zig-out', 'bin', 'wfrt');
const RUNS = Number(process.argv[2] ?? 4000);
const BASE = Number(process.env.BASE_PORT ?? 28900);
const [STUB, PORT, ADMIN] = [BASE, BASE + 1, BASE + 2];
const work = mkdtempSync(join(tmpdir(), 'wfrt-admincost-'));
// A test value only; it is not a real secret.
const SECRET = 'admin-cost-secret-0123456789';
const auth = { authorization: `Bearer ${SECRET}` };
const kids = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cpu(pid) {
	const t = execFileSync('ps', ['-o', 'cputime=', '-p', String(pid)], { encoding: 'utf8' }).trim();
	const [hms, frac = '0'] = t.split('.');
	return hms.split(':').reduce((a, x) => a * 60 + Number(x), 0) + Number(`0.${frac}`);
}

let stream;
async function openStream() {
	stream = new AbortController();
	const res = await fetch(`http://127.0.0.1:${ADMIN}/_admin/events`, { headers: auth, signal: stream.signal }).catch((e) => {
		console.error('stream open failed:', e.cause?.code ?? e.message);
		throw e;
	});
	void (async () => {
		try {
			for await (const _ of res.body) {
				// Drain.
			}
		} catch {}
	})();
}

async function viaWebhook(path) {
	execFileSync(wfrt, ['load', '--port', String(PORT), '--conns', '8', '--seconds', '1', '--path', path, '--body', '64', '--threads', '1']);
	const c0 = cpu(serve.pid);
	const out = execFileSync(wfrt, ['load', '--port', String(PORT), '--conns', '8', '--seconds', '4', '--path', path, '--body', '64', '--threads', '1'], { encoding: 'utf8' });
	const c1 = cpu(serve.pid);
	const ok = Number(/ok=(\d+)/.exec(out)?.[1] ?? 0);
	return ((c1 - c0) * 1e6) / ok;
}

let seq = 1;
let errors = 0;
async function viaAdmin(workflowId) {
	const one = async () => {
		try {
		const res = await fetch(`http://127.0.0.1:${ADMIN}/_admin/executions`, {
			method: 'POST',
			headers: { ...auth, 'content-type': 'application/json' },
			body: JSON.stringify({ workflowId, executionId: String(seq++), trigger: { body: { id: 1 } }, trace: false }),
		});
		await res.text();
		} catch (e) {
			errors++;
			if (errors < 3) console.error('admin POST failed:', e.cause?.code ?? e.message);
		}
	};
	for (let i = 0; i < 200; i++) await one();
	const c0 = cpu(serve.pid);
	let left = RUNS;
	await Promise.all(Array.from({ length: 8 }, async () => {
		while (left-- > 0) await one();
	}));
	await sleep(300);
	const c1 = cpu(serve.pid);
	return ((c1 - c0) * 1e6) / RUNS;
}

let serve;
try {
	kids.push(spawn(wfrt, ['stub', '--port', String(STUB)], { stdio: 'ignore' }));
	execFileSync(process.execPath, [join(root, 'bench', 'mix', 'workloads.mjs'), join(work, 'wl'), String(STUB)], { stdio: 'ignore' });
	serve = spawn(wfrt, ['serve', '--profile', 'embedded', '--port', String(PORT), '--admin-port', String(ADMIN), '--admin-secret-env', 'WFRT_COST_SECRET', '--log-dir', work, '--shards', '1'], {
		env: { ...process.env, WFRT_COST_SECRET: SECRET },
		stdio: ['ignore', 'ignore', 'inherit'],
	});
	kids.push(serve);
	for (let i = 0; i < 100; i++) {
		try {
			await fetch(`http://127.0.0.1:${ADMIN}/_admin/workflows`, { headers: auth });
			break;
		} catch {
			await sleep(100);
		}
	}
	const rows = [];
	for (const name of ['glue-k1-n0', 'http-n8']) {
		const module = readFileSync(join(work, 'wl', name, `${name}.wfm`)).toString('base64');
		const res = await fetch(`http://127.0.0.1:${ADMIN}/_admin/workflows/${name}`, {
			method: 'PUT',
			headers: { ...auth, 'content-type': 'application/json' },
			body: JSON.stringify({ versionId: 'v1', module, active: true, webhookPrefix: '' }),
		});
		if (!res.ok) throw new Error(`PUT ${name}: ${res.status} ${await res.text()}`);
		const row = { name };
		console.error('webhook'); row.webhookNoStream = await viaWebhook('/g');
		console.error('admin'); row.adminNoStream = await viaAdmin(name);
		console.error('stream');
		await openStream();
		row.webhookStream = await viaWebhook('/g');
		row.adminStream = await viaAdmin(name);
		stream.abort();
		await fetch(`http://127.0.0.1:${ADMIN}/_admin/workflows/${name}`, { method: 'DELETE', headers: auth });
		rows.push(row);
		console.log(`${name}: µs per run — webhook ${row.webhookNoStream.toFixed(1)}, webhook+stream ${row.webhookStream.toFixed(1)}, admin ${row.adminNoStream.toFixed(1)}, admin+stream ${row.adminStream.toFixed(1)}`);
	}
} finally {
	for (const k of kids) k.kill('SIGTERM');
	rmSync(work, { recursive: true, force: true });
}
