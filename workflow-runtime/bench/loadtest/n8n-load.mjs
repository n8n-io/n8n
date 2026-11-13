// Loads the pool into a running n8n 2.42.2 (v1, or v2 with --v2): for each
// entry, its credentials, sub-workflow and data tables, and the load-test
// workflow (lib/transform.mjs), published so its production webhook is live.
//
//   node n8n-load.mjs --url http://127.0.0.1:5678 --pool pool.jsonl --out manifest.json [--v2] [--conc 8]
//
// With --v2 each workflow gets `settings.engineType: 'v2'`, which routes its
// webhook executions to the engine-v2 module.
import fs from 'node:fs';
import { pool, readBundle } from './lib/bundle.mjs';
import { N8n } from './lib/n8n.mjs';
import { keyOf, readPool } from './lib/poolfile.mjs';
import { wrap } from './lib/transform.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const URL_ = arg('url', 'http://127.0.0.1:5678');
const OUT = arg('out', 'manifest.json');
const V2 = argv.includes('--v2');
const CONC = Number(arg('conc', '8'));
const KEYS = arg('keys', '');
const rows = readPool(arg('pool', 'pool.jsonl'), KEYS ? new Set(fs.readFileSync(KEYS, 'utf8').split('\n').filter(Boolean)) : undefined);
const port = Number(new URL(URL_).port);
const n8n = new N8n(URL_);
await n8n.login();
const entries = {};
const failed = {};
const t0 = Date.now();
let done = 0;
await pool(rows, CONC, async (row) => {
	const key = keyOf(row.id);
	try {
		const b = readBundle(row.dir);
		const w = wrap(b, key, row.items);
		const { workflow: wf, credentials: made } = await n8n.materialise(b, w.workflow, key);
		await n8n.importWorkflow(wf, { activate: true, settings: V2 ? { engineType: 'v2' } : {} });
		const oauth = b.credentials.filter((c) => c.data?.oauthTokenData?.refresh_token).map((c) => c.key);
		const credentials = made.filter((c) => oauth.includes(c.key));
		entries[key] = { port, path: `/webhook/${w.path}`, ...(credentials.length ? { credentials } : {}) };
	} catch (e) {
		failed[key] = String(e.message).slice(0, 300);
	}
	if (++done % 200 === 0) console.log(`${done}/${rows.length}`);
});
const manifest = { engine: V2 ? 'v2' : 'v1', loaded: Object.keys(entries).length, failed, loadSeconds: (Date.now() - t0) / 1000, entries };
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1));
console.log(`ready: ${manifest.loaded} loaded, ${Object.keys(failed).length} failed in ${manifest.loadSeconds} s`);
