// Classifies each pool workflow by how much of it runs natively in `wfrt`,
// from its converted form (the compiled-module cache: the converter's list of
// fallback-host nodes):
//   A  fully native: no node in the host (Code compiled natively counts as native)
//   B  native except Code: only Code nodes in the host
//   C  one non-Code node in the host (Code nodes in the host may come with it)
//   D  two or more non-Code nodes in the host
//   E  an AI cluster (a node with an ai_languageModel input: agents, chains), whatever else
//
//   node classify.mjs [--code native] > classes.json   ({ key: { cls, host, hostTypes } })
import fs from 'node:fs';
import path from 'node:path';
import { readBundle } from '../lib/bundle.mjs';
import { keyOf, readPool } from '../lib/poolfile.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const LT = process.env.LT || path.join(process.env.HOME, 'wfrt-loadtest');
const CACHE = path.join(LT, 'engine', 'compiled-cache', arg('code', 'native'));
const CODE = /\.(code|function|functionItem)$/;
const out = {};
const counts = {};
for (const r of readPool(arg('pool', path.join(LT, 'data', 'pool.jsonl')))) {
	const key = keyOf(r.id);
	const file = path.join(CACHE, `${key}.json`);
	if (!fs.existsSync(file)) {
		out[key] = { cls: 'X' };
		counts.X = (counts.X ?? 0) + 1;
		continue;
	}
	const unit = JSON.parse(fs.readFileSync(file, 'utf8'));
	const wf = readBundle(r.dir).workflow;
	const typeOf = new Map(wf.nodes.map((n) => [n.name, n.type]));
	const roots = new Set();
	for (const outs of Object.values(wf.connections ?? {}))
		for (const list of outs.ai_languageModel ?? []) for (const c of list ?? []) if (c?.node && !wf.nodes.find((n) => n.name === c.node)?.disabled) roots.add(c.node);
	const host = unit.fallbackNodes ?? [];
	const hostTypes = host.map((n) => (typeOf.get(n) ?? 'unknown').replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-langchain\./, 'lc.'));
	const nonCode = host.filter((n) => !CODE.test(typeOf.get(n) ?? ''));
	const cls = roots.size > 0 ? 'E' : host.length === 0 ? 'A' : nonCode.length === 0 ? 'B' : nonCode.length === 1 ? 'C' : 'D';
	out[key] = { cls, host: host.length, nonCodeHost: nonCode.length, hostTypes };
	counts[cls] = (counts[cls] ?? 0) + 1;
}
process.stdout.write(JSON.stringify(out));
console.error(JSON.stringify(counts));
