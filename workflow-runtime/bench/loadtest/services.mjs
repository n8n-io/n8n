// The backend of `ctx.service` calls (spec 9.9) for the compiled engine of
// the load test. It is the same backend as the engine-test adapter
// (workflow-lang scripts/gym/engine-test.ts `serviceBackend`): the
// `dataTable` and `deduplication` calls run on the fallback host's file
// stores, the stores that the v1 nodes in the host use. compiled.mjs starts
// it as a unit on the engine CPUs, so its CPU counts as engine CPU.
//
//   node26 services.mjs --admin http://127.0.0.1:18180[,http://...] --tables <dir> [--fanout 18380]
//
// wfrt serves its event stream to one client only (a second gets 409). So
// this process reads it and serves each shard's lines again on
// 127.0.0.1:<fanout + shard index>, to any number of local readers (the
// diagnostics tools: profile/hangscan.mjs). The manifest lists these URLs.
//
// Environment: WFRT_ADMIN_SECRET (the admin token of every shard),
// WF_FALLBACK_DEDUPLICATION_DIR (the deduplication store of the host).
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const LT = process.env.LT || path.join(process.env.HOME ?? '', 'wfrt-loadtest');
const SRC = path.join(LT, 'src');
const ADMINS = arg('admin', '').split(',').filter(Boolean);
const TABLES = arg('tables', '');
const SECRET = process.env.WFRT_ADMIN_SECRET ?? '';
const FANOUT = Number(arg('fanout', '0'));
const auth = { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' };
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

const imp = (p) => import(pathToFileURL(path.join(SRC, p)).href);
const { runDataTableCall } = await imp('packages/@n8n/workflow-lang/src/services/data-table.ts');
const { runDeduplicationCall } = await imp('packages/@n8n/workflow-lang/src/services/deduplication.ts');
const hostDist = 'packages/@n8n/workflow-fallback-host/dist';
const { FileDeduplicator } = await imp(`${hostDist}/deduplication.js`);
const { fileDataTableProvider } = await imp(`${hostDist}/data-table.js`);

const store = new FileDeduplicator();
const dedup = {
	checkProcessedAndRecord: (...a) => store.checkProcessedAndRecord(...a),
	removeProcessed: (...a) => store.removeProcessed(...a),
	clearAllProcessedItems: (...a) => store.clearAllProcessedItems(...a),
	getProcessedDataCount: (...a) => store.getProcessedDataCount(...a),
};
const provider = fileDataTableProvider(TABLES);
const tables = {
	getDataTableAggregateProxy: async () => Object(await provider.getDataTableAggregateProxy()),
	getDataTableProxy: async (id) => Object(await provider.getDataTableProxy(undefined, undefined, id)),
};

async function answerFor(event) {
	const call = { service: event.service, op: typeof event.op === 'string' ? event.op : '', args: isRecord(event.args) ? event.args : {} };
	if (event.service === 'deduplication') return await runDeduplicationCall(dedup, call, typeof event.workflowId === 'string' ? event.workflowId : '');
	if (event.service === 'dataTable') return await runDataTableCall(tables, call);
	return { ok: false, error: { message: `Unknown service "${String(event.service)}"` } };
}

const counts = { calls: 0, answered: 0, failedPosts: 0, dropped: 0 };
async function answer(admin, event) {
	counts.calls++;
	const body = JSON.stringify(await answerFor(event));
	try {
		const res = await fetch(`${admin}/_admin/services/${encodeURIComponent(event.callId)}`, { method: 'POST', headers: auth, body });
		if (res.ok) counts.answered++;
		else counts.failedPosts++;
		await res.arrayBuffer();
	} catch {
		// The call has an answer already, or its execution ended.
		counts.failedPosts++;
	}
}

/** The local readers of each shard's events. */
const readers = ADMINS.map(() => new Set());
if (FANOUT) {
	ADMINS.forEach((_, k) => {
		http
			.createServer((req, res) => {
				res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-cache' });
				readers[k].add(res);
				req.on('close', () => readers[k].delete(res));
			})
			.listen(FANOUT + k, '127.0.0.1');
	});
}

/** Follows the event stream of one shard, answers its service calls, and passes every line to the local readers. It reconnects when the stream ends. */
async function follow(admin, k) {
	for (;;) {
		try {
			const res = await fetch(`${admin}/_admin/events`, { headers: auth });
			let buf = '';
			for await (const chunk of res.body) {
				buf += Buffer.from(chunk).toString('utf8');
				for (let nl = buf.indexOf('\n'); nl >= 0; nl = buf.indexOf('\n')) {
					const line = buf.slice(0, nl);
					buf = buf.slice(nl + 1);
					for (const r of readers[k]) r.write(`${line}\n`);
					// Only service and dropped events matter here: skip the parse of the others.
					if (!line.includes('"type":"service"') && !line.includes('"type":"dropped"')) continue;
					let e;
					try {
						e = JSON.parse(line);
					} catch {
						continue;
					}
					if (e.type === 'dropped') counts.dropped += typeof e.count === 'number' ? e.count : 1;
					else if (typeof e.callId === 'string') void answer(admin, e);
				}
			}
		} catch {
			// The shard restarted or the stream broke: connect again.
		}
		await new Promise((r) => setTimeout(r, 200));
	}
}

ADMINS.forEach((admin, k) => void follow(admin, k));
setInterval(() => console.log(`services: ${JSON.stringify(counts)}`), 60_000);
console.log(`services: following ${ADMINS.length} shard(s)`);
