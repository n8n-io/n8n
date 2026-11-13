// Blends CPU per node run, by class, with the node mix of real workflows.
//   node bench/mix/mix.mjs <bundles-dir> <results.csv> [--code-as-glue N]
// <bundles-dir> holds one folder per workflow with an expected.json (the
// reference run of n8n v1). <results.csv> is the output of measure.sh.
// Prints the mix, the cost of each class (median and range over the
// repeats), and workflows/s and node runs/s for one core.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const [bundles, csvPath] = args;
// A Code node compiled to native code costs this many glue nodes (an
// assumption: Code nodes do more per item than Set or IF).
const codeAsGlue = args.includes('--code-as-glue') ? Number(args[args.indexOf('--code-as-glue') + 1]) : 3;
// What-if: the host CPU of one v1 node, in µs, instead of the measured cost.
const v1What = args.includes('--v1-host-us') ? Number(args[args.indexOf('--v1-host-us') + 1]) : 1000;
// Share of host node runs with an expression outside n8n's native subset
// (bench/mix/expr-share.mjs). Those steps use the expression isolate.
const isolateShare = args.includes('--isolate-share') ? Number(args[args.indexOf('--isolate-share') + 1]) : 0.13;
const here = dirname(fileURLToPath(import.meta.url));

// The node types that the compiled library runs natively.
const generated = readFileSync(
	join(here, '..', '..', '..', 'packages', '@n8n', 'workflow-lang', 'src', 'generated', 'sources.generated.ts'),
	'utf8',
);
const indexText = generated.slice(generated.indexOf('export const NODE_INDEX'));
const library = new Set([...indexText.matchAll(/^\t"([^"]+)": "nodes\//gm)].map((m) => m[1]));
const B = 'n8n-nodes-base.';
// The converter's native lowerings (src/convert/registry.ts), without Code.
const glue = new Set(
	['noOp', 'if', 'filter', 'switch', 'set', 'merge', 'limit', 'sort', 'splitOut', 'aggregate', 'removeDuplicates', 'wait', 'form', 'respondToWebhook', 'stopAndError', 'splitInBatches', 'executeWorkflow'].map((t) => B + t),
);
const code = new Set(['code', 'function', 'functionItem'].map((t) => B + t));

function classOf(type) {
	if (/trigger$/i.test(type) || type === `${B}webhook`) return 'trigger';
	if (code.has(type)) return 'code';
	if (glue.has(type)) return 'glue';
	if (type === `${B}httpRequest`) return 'http';
	if (library.has(type)) return 'vendor';
	return 'host';
}

// ---- the mix ------------------------------------------------------------------

let workflows = 0;
let runs = 0;
let itemSum = 0;
let itemRuns = 0;
const byClass = {};
const byType = {};
for (const dir of readdirSync(bundles)) {
	let expected;
	try {
		expected = JSON.parse(readFileSync(join(bundles, dir, 'expected.json'), 'utf8'));
	} catch {
		continue;
	}
	workflows++;
	for (const node of Object.values(expected.nodes ?? {})) {
		const r = node.runs ?? 0;
		if (r === 0) continue;
		runs += r;
		byClass[classOf(node.type)] = (byClass[classOf(node.type)] ?? 0) + r;
		byType[node.type] = (byType[node.type] ?? 0) + r;
		// `outputs` gives the item count of each output.
		const items = (node.outputs ?? []).reduce((a, b) => a + b, 0);
		if ((node.outputs ?? []).length > 0) {
			itemSum += items;
			itemRuns += 1;
		}
	}
}
// Items over all node runs (a node with no output counts as 0 items).
const itemsPerNode = itemSum / runs;
void itemRuns;

// ---- the costs --------------------------------------------------------------

const rows = readFileSync(csvPath, 'utf8')
	.trim()
	.split('\n')
	.slice(1)
	.map((l) => l.split(','))
	.map(([w, rep, ok, wcpu, hcpu, load1]) => ({ w, rep: +rep, ok: +ok, wfrt: +wcpu, host: +hcpu, load1: +load1 }));
const reps = Math.max(...rows.map((r) => r.rep));
// CPU microseconds per execution of one workload in one repeat.
const per = (w, rep, field) => {
	const r = rows.find((x) => x.w === w && x.rep === rep);
	if (!r || r.ok === 0) return Number.NaN;
	return (r[field] / r.ok) * 1e6;
};
const stat = (f) => {
	const xs = [];
	for (let rep = 1; rep <= reps; rep++) xs.push(f(rep));
	const s = xs.filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
	return { med: s[Math.floor(s.length / 2)], min: s[0], max: s[s.length - 1], n: s.length };
};
const diff = (wl, base, n, field) => (rep) => (per(wl, rep, field) - per(base, rep, field)) / n;

const cost = {
	exec: {
		none: stat((r) => per('w2-none', r, 'wfrt')),
		batched: stat((r) => per('w2-batched', r, 'wfrt')),
		sync: stat((r) => per('w2-sync', r, 'wfrt')),
		compiled: stat((r) => per('glue-k1-n0', r, 'wfrt')),
	},
	glue1: stat(diff('glue-k1-n40', 'glue-k1-n0', 40, 'wfrt')),
	glue2: stat(diff('glue-k2-n40', 'glue-k2-n0', 40, 'wfrt')),
	http: stat(diff('http-n8', 'http-n0', 8, 'wfrt')),
	https: stat(diff('https-n8', 'http-n0', 8, 'wfrt')),
	slack: stat(diff('slack-n8', 'http-n0', 8, 'wfrt')),
	codeWfrt: stat(diff('code-n8', 'http-n0', 8, 'wfrt')),
	codeHost: stat((r) => per('code-n8', r, 'host') / 8),
	v1Wfrt: stat(diff('v1set-n8', 'http-n0', 8, 'wfrt')),
	v1Host: stat((r) => per('v1set-n8', r, 'host') / 8),
	v1xWfrt: stat(diff('v1setx-n8', 'http-n0', 8, 'wfrt')),
	v1xHost: stat((r) => per('v1setx-n8', r, 'host') / 8),
};
// A host node run: the native-subset cost, and the isolate cost for the
// share that needs it, when the CSV has the v1setx workload.
const hasX = cost.v1xHost.n > 0;
const mixV1 = (a, b) => (hasX ? (1 - isolateShare) * a.med + isolateShare * b.med : a.med);
const v1WfrtMix = mixV1(cost.v1Wfrt, cost.v1xWfrt);
const v1HostMix = mixV1(cost.v1Host, cost.v1xHost);
// Glue at the mix's items per node, between the 1-item and 2-item costs.
const glueAt = (k) => cost.glue1.med + (k - 1) * (cost.glue2.med - cost.glue1.med);
const g = glueAt(itemsPerNode);

// ---- the blend ----------------------------------------------------------------

const perWf = (c) => (byClass[c] ?? 0) / workflows;
const n = {
	trigger: perWf('trigger'),
	glue: perWf('glue'),
	code: perWf('code'),
	http: perWf('http'),
	vendor: perWf('vendor'),
	host: perWf('host'),
};
const nodesPerWf = runs / workflows;
// CPU microseconds per workflow. The trigger node is the per-execution
// cost (webhook in, respond out, batched durability).
function blend(form, v1Host = v1HostMix) {
	let wfrt = cost.exec.compiled.med + n.glue * g + n.http * cost.https.med + n.vendor * cost.slack.med + n.host * v1WfrtMix;
	let host = n.host * v1Host;
	if (form === 'native-code') {
		wfrt += n.code * codeAsGlue * g;
	} else {
		wfrt += n.code * cost.codeWfrt.med;
		host += n.code * cost.codeHost.med;
	}
	return { wfrt, host, total: form === 'wfrt' ? wfrt : wfrt + host };
}

const f = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(1));
const range = (s) => `${f(s.med)} (${f(s.min)}–${f(s.max)}, n=${s.n})`;
console.log(`Mix: ${workflows} workflows, ${runs} node runs, ${nodesPerWf.toFixed(2)} per workflow, ${itemsPerNode.toFixed(2)} items per node run`);
console.log('Node runs per workflow by class:', Object.fromEntries(Object.entries(n).map(([k, v]) => [k, +v.toFixed(3)])));
const top = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log('Top types:', top.map(([t, c]) => `${t.replace(B, '')} ${c}`).join(', '));
console.log('\nCPU µs (median, range over repeats):');
console.log(`  execution, webhook + respond: none ${range(cost.exec.none)}, batched ${range(cost.exec.batched)}, sync ${range(cost.exec.sync)}; compiled workflow (batched) ${range(cost.exec.compiled)}`);
console.log(`  glue node: 1 item ${range(cost.glue1)}, 2 items ${range(cost.glue2)}; at ${itemsPerNode.toFixed(2)} items ${f(g)}`);
console.log(`  http call: plain ${range(cost.http)}, TLS ${range(cost.https)}; Slack library node (TLS) ${range(cost.slack)}`);
console.log(`  Code step: wfrt ${range(cost.codeWfrt)} + host ${range(cost.codeHost)}`);
console.log(`  v1 node in host: wfrt ${range(cost.v1Wfrt)} + host ${range(cost.v1Host)}`);
if (hasX) {
	console.log(`  v1 node in host, expression needs the isolate: wfrt ${range(cost.v1xWfrt)} + host ${range(cost.v1xHost)}`);
	console.log(`  host node run at ${(isolateShare * 100).toFixed(0)}% isolate share: wfrt ${f(v1WfrtMix)} + host ${f(v1HostMix)}`);
}
console.log('\nPer workflow and per core:');
for (const [form, label] of [
	['wfrt', 'wfrt alone (host CPU not counted)'],
	['both', 'wfrt + host'],
	['native-code', `every Code node native (= ${codeAsGlue} glue nodes)`],
]) {
	const b = blend(form);
	console.log(`  ${label}: ${f(b.total)} µs/workflow (wfrt ${f(b.wfrt)}, host ${form === 'wfrt' ? '–' : f(b.host)}) → ${Math.round(1e6 / b.total)} workflows/s, ${Math.round((1e6 / b.total) * nodesPerWf)} node runs/s`);
}
console.log(`\nWhat-if, a v1 node costs ${v1What} µs of host CPU:`);
for (const [form, label] of [
	['both', 'wfrt + host'],
	['native-code', 'every Code node native'],
]) {
	const b = blend(form, v1What);
	console.log(`  ${label}: ${f(b.total)} µs/workflow → ${Math.round(1e6 / b.total)} workflows/s, ${Math.round((1e6 / b.total) * nodesPerWf)} node runs/s`);
}
