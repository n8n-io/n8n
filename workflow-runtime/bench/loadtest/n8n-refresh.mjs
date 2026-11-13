// Gives the n8n engines the same OAuth2 help as the compiled engine: after
// the driver restores gym tenants, it refreshes each OAuth2 credential of
// the restored workflows against the gym and writes the new token into
// n8n (PATCH /rest/credentials/:id). Engine v2 in 2.42.2 cannot refresh
// tokens itself; v1 can, and gets this too so the three engines start each
// step with the same valid tokens.
//
//   node n8n-refresh.mjs --url http://127.0.0.1:5678 --manifest manifest-v1.json --pool pool.jsonl [--port 18279]
//   POST /refresh with a JSON list of keys
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pool, readBundle } from './lib/bundle.mjs';
import { N8n } from './lib/n8n.mjs';
import { refreshOAuth } from './lib/oauth.mjs';
import { keyOf, readPool } from './lib/poolfile.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const LT = process.env.LT || path.join(process.env.HOME, 'wfrt-loadtest');
const CA = path.join(LT, 'data', 'engine-test', 'harness', 'ca', 'ca.pem');
const manifest = JSON.parse(fs.readFileSync(arg('manifest', 'manifest.json'), 'utf8'));
const rows = new Map(readPool(arg('pool', 'pool.jsonl')).map((r) => [keyOf(r.id), r]));
const n8n = new N8n(arg('url', 'http://127.0.0.1:5678'));
await n8n.login();

async function refreshKey(key) {
	const e = manifest.entries[key];
	if (!e?.credentials?.length) return 0;
	const b = readBundle(rows.get(key).dir);
	let n = 0;
	for (const c of e.credentials) {
		const bc = b.credentials.find((x) => x.key === c.key);
		const doc = { [c.key]: { type: bc.type, data: structuredClone(bc.data) } };
		const report = await refreshOAuth(doc, CA);
		if (report[c.key] !== 'ok') continue;
		const r = await n8n.call('PATCH', `/rest/credentials/${c.id}`, { name: c.name, type: bc.type, data: doc[c.key].data });
		if (r.ok) n++;
	}
	return n;
}

http
	.createServer((req, res) => {
		if (req.method !== 'POST' || req.url !== '/refresh') return void res.writeHead(404).end();
		let text = '';
		req.on('data', (d) => (text += d));
		req.on('end', async () => {
			const t = Date.now();
			const keys = JSON.parse(text || '[]').filter((k) => manifest.entries[k]?.credentials?.length);
			const counts = await pool(keys, 8, async (k) => refreshKey(k).catch(() => 0));
			res.writeHead(200, { 'content-type': 'application/json' }).end(
				JSON.stringify({ keys: keys.length, credentials: counts.reduce((a, b) => a + b, 0), seconds: (Date.now() - t) / 1000 }),
			);
		});
	})
	.listen(Number(arg('port', '18279')), '127.0.0.1');
console.log('refresher ready');
