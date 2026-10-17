#!/usr/bin/env node
/**
 * Triggers a workload through its webhook and prints the client-side latency.
 *
 *   node run-workload.mjs --path spike-w1 [--runs 200] [--warmup 20] [--concurrency 1]
 *                         [--duration 300] [--query size=1mb] [--paths p1,p2,...]
 *                         [--label w1-execution] [--out results.jsonl]
 *
 * --duration (seconds) runs a time-based load test instead of a fixed count.
 * --paths picks a random path per request (W14).
 * Each request is one execution. The server-side timings are in the n8n
 * timing records (N8N_CODE_SANDBOX_TIMINGS_PATH).
 */
import { appendFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
	options: {
		base: { type: 'string', default: process.env.N8N_URL ?? 'http://127.0.0.1:5678' },
		path: { type: 'string' },
		paths: { type: 'string' },
		runs: { type: 'string', default: '200' },
		warmup: { type: 'string', default: '20' },
		concurrency: { type: 'string', default: '1' },
		duration: { type: 'string' },
		query: { type: 'string', default: '' },
		label: { type: 'string', default: '' },
		out: { type: 'string' },
		verbose: { type: 'boolean', default: false },
	},
});

const paths = args.paths ? args.paths.split(',') : [args.path];
if (!paths[0]) throw new Error('--path or --paths is required');
const concurrency = Number(args.concurrency);
const label = args.label || paths[0];

async function once() {
	const path = paths[Math.floor(Math.random() * paths.length)];
	const url = `${args.base}/webhook/${path}${args.query ? `?${args.query}` : ''}`;
	const t0 = performance.now();
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: '{"hello":"world"}',
	});
	const text = await res.text();
	const ms = performance.now() - t0;
	if (args.verbose) console.log(res.status, text.slice(0, 500));
	return { ok: res.ok, status: res.status, ms, body: text };
}

function pct(sorted, p) {
	if (!sorted.length) return NaN;
	return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function runCount(n) {
	const results = [];
	let next = 0;
	await Promise.all(
		Array.from({ length: concurrency }, async () => {
			while (next < n) {
				next++;
				results.push(await once().catch((e) => ({ ok: false, status: 0, ms: 0, body: String(e) })));
			}
		}),
	);
	return results;
}

async function runDuration(seconds) {
	const results = [];
	const end = Date.now() + seconds * 1000;
	await Promise.all(
		Array.from({ length: concurrency }, async () => {
			while (Date.now() < end) {
				results.push(await once().catch((e) => ({ ok: false, status: 0, ms: 0, body: String(e) })));
			}
		}),
	);
	return results;
}

const warmup = Number(args.warmup);
if (warmup > 0) await runCount(warmup);
const started = Date.now();
const results = args.duration ? await runDuration(Number(args.duration)) : await runCount(Number(args.runs));
const elapsed = (Date.now() - started) / 1000;

const failed = results.filter((r) => !r.ok);
const sorted = results.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
const summary = {
	label,
	runs: results.length,
	failed: failed.length,
	throughput: Math.round((results.length / elapsed) * 10) / 10,
	p50: Math.round(pct(sorted, 50)),
	p95: Math.round(pct(sorted, 95)),
	p99: Math.round(pct(sorted, 99)),
	max: Math.round(sorted.at(-1) ?? NaN),
};
console.log(JSON.stringify(summary));
if (failed.length) console.log('first failure:', failed[0].status, failed[0].body.slice(0, 1000));
if (args.out) appendFileSync(args.out, JSON.stringify({ type: 'client_summary', ts: Date.now(), ...summary }) + '\n');
