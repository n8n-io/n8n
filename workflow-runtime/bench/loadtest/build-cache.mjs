// Converts and compiles the load-test workflows of a key set into the
// module cache that compiled.mjs reads, and records the convert and compile
// time of each. It starts no engine.
//
//   node26 build-cache.mjs --pool pool.jsonl --keys keys.txt [--code native|host]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readBundle } from './lib/bundle.mjs';
import { keyOf, readPool } from './lib/poolfile.mjs';
import { wrap } from './lib/transform.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const LT = process.env.LT || path.join(process.env.HOME, 'wfrt-loadtest');
const SRC = path.join(LT, 'src');
const CODE = arg('code', 'native') === 'host' ? 'host' : 'native';
const KEYS = arg('keys', '');
const imp = (p) => import(pathToFileURL(path.join(SRC, p)).href);
const { convertWorkflow } = await imp('packages/@n8n/workflow-lang/src/convert/index.ts');
const { compile } = await imp('packages/@n8n/workflow-lang/src/compiler/index.ts');
const CACHE = path.join(LT, 'engine', 'compiled-cache', CODE);
fs.mkdirSync(CACHE, { recursive: true });
const rows = readPool(arg('pool', path.join(LT, 'data', 'pool.jsonl')), KEYS ? new Set(fs.readFileSync(KEYS, 'utf8').split('\n').filter(Boolean)) : undefined);
const failed = {};
let built = 0;
for (const row of rows) {
	const key = keyOf(row.id);
	const file = path.join(CACHE, `${key}.json`);
	if (fs.existsSync(file)) continue;
	try {
		const b = readBundle(row.dir);
		const w = wrap(b, key, row.items);
		let text = JSON.stringify(w.workflow);
		for (const dt of b.resources.dataTables ?? []) text = text.replaceAll(dt.key, `${key}-${dt.key}`.replace(/[^A-Za-z0-9_-]/g, '_'));
		const c0 = performance.now();
		const converted = convertWorkflow(JSON.parse(text), {
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
		if (!compiled.ok || !compiled.module) throw new Error(`compile: ${compiled.diagnostics?.[0]?.message ?? 'failed'}`);
		fs.writeFileSync(
			file,
			JSON.stringify({
				module: Buffer.from(compiled.module).toString('base64'),
				slots: converted.credentials ?? {},
				fallbackNodes: converted.fallbackNodes ?? [],
				convertMs: c1 - c0,
				compileMs: c2 - c1,
			}),
		);
		built++;
	} catch (e) {
		failed[key] = String(e.message).slice(0, 200);
	}
}
fs.writeFileSync(path.join(CACHE, '..', `failed-${CODE}-${path.basename(KEYS || 'all')}.json`), JSON.stringify(failed, null, 1));
console.log(`built ${built}, failed ${Object.keys(failed).length}`);
