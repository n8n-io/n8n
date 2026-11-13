// Counts how many host (v1) node runs of the reference mix use only
// expressions that n8n's native evaluator accepts. Those steps need no
// expression isolate in the fallback host.
// Usage: node bench/mix/expr-share.mjs <bundles-dir>
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(new URL('../../../packages/workflow/package.json', import.meta.url));
const { isNativelyEvaluable } = require('n8n-workflow');
const bundles = process.argv[2];
const B = 'n8n-nodes-base.';
const notHost = new Set(
	['noOp', 'if', 'filter', 'switch', 'set', 'merge', 'limit', 'sort', 'splitOut', 'aggregate', 'removeDuplicates', 'wait', 'form', 'respondToWebhook', 'stopAndError', 'splitInBatches', 'executeWorkflow', 'code', 'function', 'functionItem', 'httpRequest', 'webhook'].map((t) => B + t),
);

function expressions(value, out) {
	if (typeof value === 'string') {
		if (value.startsWith('=') && value.includes('{{')) out.push(value.slice(1));
	} else if (Array.isArray(value)) for (const v of value) expressions(v, out);
	else if (value && typeof value === 'object') for (const v of Object.values(value)) expressions(v, out);
	return out;
}

let runs = 0;
let noExpr = 0;
let native = 0;
let exprTotal = 0;
let exprNative = 0;
for (const dir of readdirSync(bundles)) {
	let workflow;
	let expected;
	try {
		workflow = JSON.parse(readFileSync(join(bundles, dir, 'workflow.json'), 'utf8'));
		expected = JSON.parse(readFileSync(join(bundles, dir, 'expected.json'), 'utf8'));
	} catch {
		continue;
	}
	for (const node of workflow.nodes ?? []) {
		if (/trigger$/i.test(node.type) || notHost.has(node.type)) continue;
		const r = expected.nodes?.[node.name]?.runs ?? 0;
		if (r === 0) continue;
		const list = expressions(node.parameters ?? {}, []);
		const ok = list.filter((e) => isNativelyEvaluable(e)).length;
		exprTotal += list.length * r;
		exprNative += ok * r;
		runs += r;
		if (list.length === 0) noExpr += r;
		else if (ok === list.length) native += r;
	}
}
const pct = (n) => `${((100 * n) / runs).toFixed(1)}%`;
console.log(`non-native node runs (vendor and host): ${runs}`);
console.log(`  no expressions: ${noExpr} (${pct(noExpr)})`);
console.log(`  all expressions native: ${native} (${pct(native)})`);
console.log(`  at least one expression needs the isolate: ${runs - noExpr - native} (${pct(runs - noExpr - native)})`);
console.log(`expressions: ${exprTotal}, native ${exprNative} (${((100 * exprNative) / exprTotal).toFixed(1)}%)`);
