// Generates and compiles the workloads that measure CPU per node run, by
// class (docs/poc-report.md, "CPU per node run"):
//   glue-k<K>-n<N>   N native glue nodes (Set, IF, Filter, Switch, Merge in
//                    turn) on K items, written as the converter writes them
//   http-n<N>        N plain-HTTP calls to the local stub
//   https-n<N>       N HTTPS calls to a vendor host (gym rules send it to the
//                    TLS stub)
//   slack-n<N>       N Slack library nodes (chat.postMessage) over HTTPS
//   code-n<N>        N small Code steps in the fallback host
//   v1set-n<N>       N v1 Set nodes in the fallback host (native-subset expression)
//   v1setx-n<N>      the same with an expression that needs the expression isolate
// Each workflow is a POST webhook that answers with its result, so the base
// cost of trigger and respond is the n0 workload of the same family.
//   node bench/mix/workloads.mjs <out-dir> <stub-port>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [outDir, stubPort] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const langDir = join(here, '..', '..', '..', 'packages', '@n8n', 'workflow-lang');
mkdirSync(outDir, { recursive: true });

const head = (path) => `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ id: string; pad: string }>({ path: '${path}', method: 'POST' })],
	credentials: { slack: { type: 'slackApi' } },
	async run(ctx, trigger) {`;

function items(k) {
	const list = [];
	for (let i = 0; i < k; i++) {
		list.push(
			`{ json: { id: trigger.body.id, n: ${i}, amount: ${12.5 * (i + 1)}, status: '${i % 2 ? 'open' : 'closed'}', email: 'user${i}@example.com' } }`,
		);
	}
	return `let items = [${list.join(', ')}];`;
}

// One native glue node of each kind, as the converter lowers them: the
// node's item transform, then ctx.trace (a no-op without tracing).
const glue = [
	(i) =>
		`items = items.map((it) => ({ json: { ...it.json, total: it.json.amount * 1.19, label: \`Order \${it.json.id}-\${it.json.n}\` } }));\n\t\tctx.trace('Set ${i}', items);`,
	(i) =>
		`{ const t = items.filter((it) => it.json.amount > 10 && it.json.status !== 'x'); const f = items.filter((it) => !(it.json.amount > 10 && it.json.status !== 'x')); ctx.trace('IF ${i}', [t, f]); items = t.length > 0 ? t : f; }`,
	(i) =>
		`items = items.filter((it) => typeof it.json.email === 'string' && it.json.email.includes('@'));\n\t\tctx.trace('Filter ${i}', items);`,
	(i) =>
		`{ const o0 = []; const o1 = []; const o2 = []; for (const it of items) { if (it.json.status === 'open') o0.push(it); else if (it.json.status === 'closed') o1.push(it); else o2.push(it); } ctx.trace('Switch ${i}', [o0, o1, o2]); items = [...o0, ...o1, ...o2]; }`,
	(i) =>
		`items = items.map((it, k) => ({ json: { ...it.json, merged: true, pos: k } }));\n\t\tctx.trace('Merge ${i}', items);`,
];

// A typical small Code node, in the wrapper that the converter writes for
// "run once for all items" (src/convert/code-node.ts).
const codeStep = `const __wrap = (j) => {
	if (j !== null && typeof j === 'object' && j.$binary) {
		const { $binary, ...json } = j;
		return { json, binary: $binary };
	}
	return { json: j };
};
items = items.map(__wrap);
const $input = { all: () => items, first: () => items[0], last: () => items[items.length - 1], item: items[0] };
const $json = items[0]?.json;
return await (async () => {
return $input.all().map((i) => ({ json: { ...i.json, total: i.json.amount * 2, tag: String(i.json.id).toUpperCase() } }));
})();
`;

const workloads = {};
for (const k of [1, 2]) {
	for (const n of [0, 40]) {
		const body = [items(k)];
		for (let i = 0; i < n; i++) body.push(glue[i % glue.length](i));
		workloads[`glue-k${k}-n${n}`] = { path: 'g', body };
	}
}
const call = {
	http: (i) =>
		`{ const r = await ctx.http({ name: 'Call ${i}', method: 'POST', url: 'http://127.0.0.1:${stubPort}/api/records', body: { records: items.map((it) => it.json) } }); items = items.map((it) => ({ json: { ...it.json, ok: (r.body as { ok?: boolean }).ok === true } })); }`,
	https: (i) =>
		`{ const r = await ctx.http({ name: 'Call ${i}', method: 'POST', url: 'https://api.example.com/v1/records', body: { records: items.map((it) => it.json) } }); items = items.map((it) => ({ json: { ...it.json, ok: (r.body as { ok?: boolean }).ok === true } })); }`,
	slack: (i) =>
		`{ const out = await ctx.node({ name: 'Slack ${i}', type: 'n8n-nodes-base.slack', typeVersion: 2, parameters: { resource: 'message', operation: 'post', channel: '#orders', text: \`Order \${trigger.body.id} is in\` }, credential: 'slack' }); items = items.map((it) => ({ json: { ...it.json, ts: out.length } })); }`,
	code: (i) =>
		`{ const out = await ctx.code({ name: 'Code ${i}', code: ${JSON.stringify(codeStep)}, items: items.map((it) => it.json) }); items = out.map((j) => ({ json: j as typeof items[number]['json'] })); }`,
	v1set: (i) =>
		`{ const out = await ctx.node({ name: 'Set ${i}', type: 'n8n-nodes-base.set', typeVersion: 3.4, host: 'fallback', parameters: { mode: 'manual', assignments: { assignments: [{ id: 'a${i}', name: 'total', value: '={{ $json.amount * 2 }}', type: 'number' }] }, includeOtherFields: true, options: {} }, items: items.map((it) => it.json) }); items = out.map((j) => ({ json: j as typeof items[number]['json'] })); }`,
	v1setx: (i) =>
		`{ const out = await ctx.node({ name: 'Set ${i}', type: 'n8n-nodes-base.set', typeVersion: 3.4, host: 'fallback', parameters: { mode: 'manual', assignments: { assignments: [{ id: 'a${i}', name: 'total', value: '={{ [1, 2].map((x) => x * $json.amount).reduce((a, b) => a + b, 0) / 1.5 }}', type: 'number' }] }, includeOtherFields: true, options: {} }, items: items.map((it) => it.json) }); items = out.map((j) => ({ json: j as typeof items[number]['json'] })); }`,
};
for (const [family, fn] of Object.entries(call)) {
	for (const n of [0, 8]) {
		if (n === 0 && family !== 'http') continue; // one shared base: http-n0
		const body = [items(1)];
		for (let i = 0; i < n; i++) body.push(fn(i));
		workloads[`${family}-n${n}`] = { path: 'g', body };
	}
}

for (const [name, w] of Object.entries(workloads)) {
	const src = `${head(w.path)}\n\t\t${w.body.join('\n\t\t')}\n\t\treturn { count: items.length, first: items[0] };\n\t},\n});\n`;
	const file = join(outDir, `${name}.ts`);
	writeFileSync(file, src);
	execFileSync('node', [join(langDir, 'src', 'cli.ts'), 'compile', file, '-o', join(outDir, name)], {
		stdio: ['ignore', 'ignore', 'inherit'],
	});
	console.log(name);
}
