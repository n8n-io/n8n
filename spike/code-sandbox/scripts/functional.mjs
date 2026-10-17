#!/usr/bin/env node
/**
 * Functional pass (SPIKE-SPEC-opus.md, section 12, step 2): runs W1-W6 and W9
 * once each against a running n8n and checks the responses. W10 needs a manual
 * run in the editor.
 *
 *   node spike/code-sandbox/scripts/functional.mjs [--base http://127.0.0.1:5678]
 */
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
	options: { base: { type: 'string', default: process.env.N8N_URL ?? 'http://127.0.0.1:5678' } },
});

async function call(path, query = '') {
	const t0 = performance.now();
	const res = await fetch(`${args.base}/webhook/${path}${query ? `?${query}` : ''}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: '{"hello":"world"}',
	});
	const text = await res.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		body = text;
	}
	return { status: res.status, body, ms: Math.round(performance.now() - t0) };
}

const checks = [
	['W1', () => call('spike-w1'), (r) => r.body?.[0]?.body?.hello === 'world'],
	['W2', () => call('spike-w2'), (r) => r.body?.[0]?.step1 === true && r.body?.[0]?.step5 === true],
	['W3', () => call('spike-w3'), (r) => Array.isArray(r.body) && r.body.length === 100 && r.body.every((i) => i.seen)],
	['W4', () => call('spike-w4'), (r) => r.body?.[0]?.total === 10_000],
	['W5 1mb', () => call('spike-w5', 'size=1mb'), (r) => r.body?.[0]?.bytes === 1_048_576 && !String(r.body?.[0]?.id).startsWith('sandbox-out:')],
	['W6 ten', () => call('spike-w6', 'mode=ten'), (r) => typeof r.body?.[0]?.ms === 'number'],
	['W6 ssrf', () => call('spike-w6', 'mode=ssrf'), (r) => r.body?.[0]?.blocked === true],
	['W9', () => call('spike-w9'), (r) => Array.isArray(r.body) && r.body.length === 20 && r.body.every((i) => i.sub)],
];
if (process.env.CHECK_PROXY === 'true') {
	checks.push(['W6 proxy', () => call('spike-w6', 'mode=proxy'), (r) => r.body?.[0]?.viaProxy === true]);
}
if (process.env.CHECK_BIG === 'true') {
	checks.push(['W5 100mb', () => call('spike-w5', 'size=100mb'), (r) => r.body?.[0]?.bytes === 104_857_600]);
	checks.push(['W5 1gb', () => call('spike-w5', 'size=1gb'), (r) => r.body?.[0]?.bytes === 1_073_741_824]);
}

let failed = 0;
for (const [name, run, ok] of checks) {
	const r = await run().catch((e) => ({ status: 0, body: String(e), ms: 0 }));
	const pass = r.status === 200 && ok(r);
	if (!pass) failed++;
	console.log(`${pass ? 'PASS' : 'FAIL'} ${name} (${r.ms} ms)${pass ? '' : ` ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`}`);
}
process.exit(failed ? 1 : 0);
