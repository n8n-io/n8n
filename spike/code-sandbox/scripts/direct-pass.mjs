#!/usr/bin/env node
/**
 * Direct Task API pass (results section 4), without n8n. Each sample is one
 * JSON line in <out>/<step>.jsonl.
 *
 *   node direct-pass.mjs creates     --out DIR [--seq 200] [--burst10 20] [--burst50 4]
 *   node direct-pass.mjs procstart   --out DIR [--tasks 200]
 *   node direct-pass.mjs idle        --out DIR [--per 5] [--wait 30]
 *   node direct-pass.mjs claims      --out DIR --pool-size 8 [--seq 200]
 *   node direct-pass.mjs claim-burst --out DIR --pool-size 8 [--rounds 13]
 *
 * creates, procstart and idle need an API without pools. claims and
 * claim-burst need a pool of `poolOptions` (below) with --pool-size sandboxes.
 *
 * SANDBOX_URL (default http://127.0.0.1:8080), SANDBOX_ADMIN_KEY (default test).
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import * as http from 'node:http';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		out: { type: 'string' },
		seq: { type: 'string' },
		burst10: { type: 'string', default: '20' },
		burst50: { type: 'string', default: '4' },
		tasks: { type: 'string', default: '200' },
		per: { type: 'string', default: '5' },
		wait: { type: 'string', default: '30' },
		'pool-size': { type: 'string', default: '8' },
		rounds: { type: 'string', default: '13' },
	},
});
const step = positionals[0];
if (!step || !args.out) throw new Error('usage: direct-pass.mjs <step> --out DIR');
mkdirSync(args.out, { recursive: true });
const BASE = (process.env.SANDBOX_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
const KEY = process.env.SANDBOX_ADMIN_KEY ?? 'test';
const agent = new http.Agent({ keepAlive: true, maxSockets: 128 });
const outFile = join(args.out, `${step}.jsonl`);
const record = (r) => appendFileSync(outFile, JSON.stringify({ step, ts: Date.now(), ...r }) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The create options of the `shared` option in `execution` mode. The pool uses the same. */
export const poolOptions = {
	runtime: 'n8n-js',
	slots: 2,
	taskMemoryMb: 512,
	spareWorkers: true,
	reuseWorkers: true,
};

function request(method, path, headers = {}, body) {
	return new Promise((resolve, reject) => {
		const req = http.request(
			BASE + path,
			{ method, agent, headers: { 'X-Api-Key': KEY, ...headers } },
			resolve,
		);
		req.on('error', reject);
		req.end(body);
	});
}

async function readAll(res) {
	const chunks = [];
	for await (const c of res) chunks.push(c);
	return Buffer.concat(chunks).toString();
}

async function json(method, path, body) {
	const payload = body === undefined ? undefined : JSON.stringify(body);
	const res = await request(
		method,
		path,
		payload
			? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
			: {},
		payload,
	);
	const text = await readAll(res);
	if (res.statusCode >= 300) throw new Error(`${method} ${path}: ${res.statusCode} ${text}`);
	return text ? JSON.parse(text) : undefined;
}

async function create(opts) {
	const t0 = performance.now();
	const sb = await json('POST', '/v1/code/sandboxes', { ...opts, labels: { bench: `direct-${step}` } });
	return { sb, ms: performance.now() - t0 };
}

async function del(id) {
	const t0 = performance.now();
	await json('DELETE', `/v1/code/sandboxes/${id}`);
	return performance.now() - t0;
}

let seq = 0;
async function runTask(id, code) {
	const taskId = `d_${process.pid}_${seq++}`;
	const boundary = '----dp' + randomBytes(8).toString('hex');
	const spec = JSON.stringify({ taskId, timeoutMs: 60000, inlineResultMaxBytes: 1048576 });
	const task = JSON.stringify({
		taskId,
		settings: { code, nodeMode: 'runCode', workflowMode: 'manual', continueOnFail: false },
		data: null,
		binaries: [],
	});
	const body =
		`--${boundary}\r\nContent-Disposition: form-data; name="spec"\r\nContent-Type: application/json\r\n\r\n${spec}\r\n` +
		`--${boundary}\r\nContent-Disposition: form-data; name="input"; filename="task.json"\r\nContent-Type: application/octet-stream\r\n\r\n${task}\r\n` +
		`--${boundary}--\r\n`;
	const t0 = performance.now();
	const res = await request(
		'POST',
		`/v1/code/sandboxes/${id}/tasks`,
		{
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
			'Content-Length': Buffer.byteLength(body),
		},
		body,
	);
	if (res.statusCode !== 200) throw new Error(`task: ${res.statusCode} ${await readAll(res)}`);
	const lines = (await readAll(res)).trim().split('\n').map((l) => JSON.parse(l));
	const ms = performance.now() - t0;
	const terminal = lines.at(-1);
	json('DELETE', `/v1/code/sandboxes/${id}/tasks/${taskId}`).catch(() => {});
	if (terminal?.type !== 'done') throw new Error(`task failed: ${JSON.stringify(terminal)}`);
	return { ms, timings: terminal.timings };
}

async function poolCount() {
	const list = await json('GET', '/sandboxes');
	return list.filter((s) => s.pool_key).length;
}

async function waitPool(size, maxMs = 180_000) {
	const t0 = Date.now();
	while (Date.now() - t0 < maxMs) {
		if ((await poolCount()) >= size) return true;
		await sleep(500);
	}
	console.error(`pool did not reach ${size}`);
	return false;
}

async function burst(n, opts, extra) {
	const results = await Promise.allSettled(Array.from({ length: n }, async () => await create(opts)));
	const ids = [];
	for (const r of results) {
		if (r.status === 'fulfilled') {
			ids.push(r.value.sb.id);
			record({ ...extra, burst: n, ok: true, ms: r.value.ms, pooled: r.value.sb.pooled === true });
		} else {
			record({ ...extra, burst: n, ok: false, error: String(r.reason?.message ?? r.reason) });
		}
	}
	await Promise.all(ids.map(async (id) => await del(id).catch(() => {})));
}

switch (step) {
	case 'creates': {
		const n = Number(args.seq ?? 200);
		for (let i = 0; i < n; i++) {
			const { sb, ms } = await create(poolOptions);
			const delMs = await del(sb.id);
			record({ kind: 'seq', ok: true, ms, delMs, timings: sb.timings });
			await sleep(200);
		}
		for (let r = 0; r < Number(args.burst10); r++) {
			await burst(10, poolOptions, { kind: 'burst10', round: r });
			await sleep(2000);
		}
		for (let r = 0; r < Number(args.burst50); r++) {
			await burst(50, poolOptions, { kind: 'burst50', round: r });
			await sleep(5000);
		}
		break;
	}
	case 'procstart': {
		// Without spare processes, each task starts its own process. The daemon
		// hand-off time is the process start until it is ready.
		for (const runtime of ['n8n-js', 'n8n-js-nosnapshot']) {
			const { sb } = await create({ ...poolOptions, runtime, slots: 1, spareWorkers: false, reuseWorkers: false });
			try {
				for (let i = 0; i < Number(args.tasks); i++) {
					const { ms, timings } = await runTask(sb.id, 'return 1');
					record({ runtime, ms, handoff: timings?.handoff, spareHit: timings?.spareHit, run: timings?.run });
				}
			} finally {
				await del(sb.id).catch(() => {});
			}
		}
		break;
	}
	case 'idle': {
		// CPU and memory of a sandbox that runs no task, per mode and option.
		const combos = [];
		for (const [mode, slots] of [
			['node', 1],
			['execution', 2],
			['workflow', 4],
		]) {
			for (const [option, reuseWorkers] of [
				['fresh-spare', false],
				['shared', true],
			]) {
				combos.push({ mode, option, opts: { ...poolOptions, slots, reuseWorkers } });
			}
		}
		const per = Number(args.per);
		const created = [];
		for (const c of combos) {
			for (let i = 0; i < per; i++) {
				const { sb } = await create(c.opts);
				created.push({ ...c, id: sb.id, at: Date.now() });
			}
		}
		const waitMs = Number(args.wait) * 1000;
		for (const c of created) {
			const left = c.at + waitMs - Date.now();
			if (left > 0) await sleep(left);
			const st = await json('GET', `/v1/code/sandboxes/${c.id}`);
			record({
				mode: c.mode,
				option: c.option,
				slots: c.opts.slots,
				waitMs,
				uptimeMs: st.uptimeMs,
				cpuUsageUsec: st.cpuUsageUsec,
				memoryPeakBytes: st.memoryPeakBytes,
				memoryCurrentBytes: st.memoryCurrentBytes,
				workersStarted: st.workersStarted,
			});
			await del(c.id).catch(() => {});
		}
		break;
	}
	case 'claims': {
		const size = Number(args['pool-size']);
		const n = Number(args.seq ?? 200);
		for (let i = 0; i < n; i++) {
			await waitPool(size);
			const { sb, ms } = await create(poolOptions);
			record({ kind: 'claim', ok: true, ms, pooled: sb.pooled === true, claim: sb.timings?.claim });
			await del(sb.id).catch(() => {});
		}
		break;
	}
	case 'claim-burst': {
		const size = Number(args['pool-size']);
		for (let r = 0; r < Number(args.rounds); r++) {
			await waitPool(size);
			await burst(size * 2, poolOptions, { kind: 'claim-burst', round: r, poolSize: size });
		}
		break;
	}
	default:
		throw new Error(`unknown step ${step}`);
}
agent.destroy();
console.log(`${step} done: ${outFile}`);
