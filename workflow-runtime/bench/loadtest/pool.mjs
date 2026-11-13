// Builds the workload pool of the load test from bundle sets.
//
//   node pool.mjs --out pool.jsonl --n8n http://127.0.0.1:47700[,url2...] [--conc 8] <bundle roots...>
//
// For each bundle (certified: the reference run succeeded with at least two
// nodes): skip it when the load test cannot run it (lib/transform.mjs
// `exclusion`), then find its trigger items. Pinned data gives them
// directly. A live trigger (schedule, manual, polling app triggers) runs
// once on a reference n8n, alone, from the bundle's tenant snapshot, and its
// output is the item list. The webhook body of the load test is that list.
//
// One JSON line for each bundle: { key, dir, id, tenant, items, nodesRan,
// trigger, triggerType, services } or { dir, excluded }.
import fs from 'node:fs';
import { bundleDirs, gym, pool, readBundle, snapshotPut } from './lib/bundle.mjs';
import { N8n } from './lib/n8n.mjs';
import { exclusion, staticItems } from './lib/transform.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	if (i < 0) return dflt;
	const v = argv[i + 1];
	argv.splice(i, 2);
	return v;
};
const OUT = opt('out', 'pool.jsonl');
const URLS = opt('n8n', 'http://127.0.0.1:47700').split(',');
const CONC = Number(opt('conc', '8'));
const roots = argv;

const clients = URLS.map((u) => new N8n(u));
for (const c of clients) await c.login();
const dirs = bundleDirs(roots);
const seen = new Map();
const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).dir) : []);
const out = fs.createWriteStream(OUT, { flags: 'a' });
let n = 0;
const tally = {};

async function liveItems(b, client) {
	const t = b.run.trigger;
	const node = b.workflow.nodes.find((x) => x.name === t);
	const keys = new Set(Object.values(node.credentials ?? {}).map((r) => r.id));
	const only = { ...b, credentials: b.credentials.filter((c) => keys.has(c.key)) };
	await snapshotPut(b.meta.tenant, b.snapshot());
	try {
		const { workflow: wf } = await client.materialise(only, { name: `[pool] ${b.meta.id}`, nodes: [node], connections: {}, settings: { executionOrder: 'v1', ...(b.workflow.settings ?? {}) } }, b.meta.id);
		const r = await client.importWorkflow(wf);
		const ex = await client.runManual(r.id, t, 120);
		await client.call('DELETE', `/rest/workflows/${r.id}`);
		const run = ex.resultData?.runData?.[t]?.[0];
		const items = run?.data?.main?.[0]?.map((x) => x.json ?? {}) ?? [];
		if (ex.status !== 'success' || items.length === 0) return { error: `trigger run ${ex.status}, ${items.length} items` };
		return { items };
	} finally {
		await gym('delete_tenant', { tenant: b.meta.tenant }).catch(() => {});
	}
}

await pool(dirs, CONC * clients.length, async (dir, i) => {
	if (done.has(dir)) return;
	const b = readBundle(dir);
	let row;
	const exp = b.expected;
	if (!exp || exp.status !== 'success' || (exp.nodes_ran ?? 0) < 2) row = { dir, excluded: 'not certified' };
	else if (seen.has(b.meta.tenant)) row = { dir, excluded: `tenant shared with ${seen.get(b.meta.tenant)}` };
	else {
		seen.set(b.meta.tenant, dir);
		const why = exclusion(b);
		if (why) row = { dir, excluded: why };
		else {
			let items = staticItems(b);
			let error;
			if (!items) {
				try {
					({ items, error } = await liveItems(b, clients[i % clients.length]));
				} catch (e) {
					error = String(e.message).slice(0, 200);
				}
			}
			row = error
				? { dir, excluded: `trigger items: ${error}` }
				: {
						dir,
						id: b.meta.id,
						tenant: b.meta.tenant,
						items,
						nodesRan: exp.nodes_ran,
						trigger: b.run.trigger,
						triggerType: b.meta.trigger_type,
						services: b.meta.gym_services,
					};
		}
	}
	out.write(`${JSON.stringify(row)}\n`);
	const k = row.excluded ? row.excluded.replace(/:.*/, '') : 'ok';
	tally[k] = (tally[k] ?? 0) + 1;
	if (++n % 100 === 0) console.log(n, JSON.stringify(tally));
});
out.end();
console.log('done', JSON.stringify(tally));
