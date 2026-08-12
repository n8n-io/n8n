#!/usr/bin/env node
// Catastrophic-regression gate for canvas performance e2e benchmarks.
//
// Reads the Playwright JSON reporter output (test-results.json) and checks each
// canvas-* metric against a small, fixed set of thresholds defined here. Exits
// non-zero on any breach so the nightly job fails loudly. Trend / soft
// regressions are intentionally NOT gated here — those flow through the QA
// metrics webhook + PR comment, which tolerates the 15-30% wall-clock noise
// that browser benchmarks always have.
//
// Tier tolerance: only metrics that were actually emitted are gated. A tier
// that didn't run at all (e.g. CI restricts canvas perf to the S tier, so M/L
// emit nothing) has its sentinels reported as "skipped" rather than failing.
// A metric missing while its tier DID run is still a hard failure, so genuine
// metric-emission regressions can't slip through.

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SENTINELS = [
	{ metric: 'canvas-cold-load-M-ms', max: 30_000, note: '>30s = M-tier cold load is unusable' },
	{ metric: 'canvas-cold-load-L-ms', max: 60_000, note: '>60s = L-tier cold load is unusable' },
	{
		metric: 'canvas-pan-frame-p95-M-ms',
		max: 100,
		note: '>100ms p95 frame = panning is visibly broken',
	},
	{
		metric: 'canvas-pan-frame-p95-L-ms',
		max: 120,
		note: '>120ms p95 frame = L-tier panning is visibly broken',
	},
	{
		metric: 'canvas-server-heap-L-mb',
		max: 800,
		note: '>800MB server heap on L = backend leak suspected',
	},
	{
		metric: 'canvas-browser-heap-L-mb',
		max: 600,
		note: '>600MB browser heap on L = canvas leak suspected',
	},
	// Re-render counts are near-deterministic (driven by graph structure, not
	// wall-clock), so this gate is far tighter than the timing/heap ones above:
	// ~2x the observed S-tier baseline (~3.5k). Gated at S because that's the
	// tier with a measured baseline and the one that always runs; a value this
	// high means a reactivity loop / runaway re-render, not normal variance.
	// Add M/L equivalents once those tiers have a baseline.
	{
		metric: 'canvas-rerender-exec-heavy-S',
		max: 7_000,
		note: '>7k re-renders on a 30-node heavy execution = reactivity thrash / runaway re-render',
	},
];

function findResultsPath() {
	const explicit = process.argv[2];
	if (explicit) return resolve(explicit);
	const candidates = [
		'test-results.json',
		'packages/testing/playwright/test-results.json',
		'playwright/test-results.json',
	];
	for (const candidate of candidates) {
		const path = resolve(candidate);
		if (existsSync(path)) return path;
	}
	throw new Error(
		`test-results.json not found. Looked in: ${candidates.join(', ')}. Pass an explicit path as argv[1].`,
	);
}

function decodeAttachmentBody(attachment) {
	if (typeof attachment.body === 'string') {
		try {
			return Buffer.from(attachment.body, 'base64').toString('utf8');
		} catch {
			return attachment.body;
		}
	}
	if (attachment.path && existsSync(attachment.path)) {
		return readFileSync(attachment.path, 'utf8');
	}
	return null;
}

function* walkSuites(root) {
	const stack = [root];
	while (stack.length) {
		const current = stack.pop();
		if (!current) continue;
		if (Array.isArray(current.suites)) stack.push(...current.suites);
		if (Array.isArray(current.specs)) {
			for (const spec of current.specs) yield spec;
		}
	}
}

function extractMetrics(results) {
	const metrics = new Map();
	for (const spec of walkSuites(results)) {
		if (!Array.isArray(spec.tests)) continue;
		for (const test of spec.tests) {
			if (!Array.isArray(test.results)) continue;
			for (const result of test.results) {
				if (!Array.isArray(result.attachments)) continue;
				for (const attachment of result.attachments) {
					if (typeof attachment.name !== 'string' || !attachment.name.startsWith('metric:')) {
						continue;
					}
					const metricName = attachment.name.slice('metric:'.length);
					const body = decodeAttachmentBody(attachment);
					if (!body) continue;
					try {
						const parsed = JSON.parse(body);
						if (typeof parsed.value === 'number') {
							metrics.set(metricName, parsed.value);
						}
					} catch {
						// Skip unparseable bodies — they'll surface elsewhere.
					}
				}
			}
		}
	}
	return metrics;
}

// Sentinel metric names encode their tier as a standalone S/M/L segment
// (e.g. `canvas-cold-load-L-ms` → 'L', `canvas-dom-nodes-S` → 'S'). Returns
// null when no tier segment is present.
function tierOf(metricName) {
	const match = metricName.match(/-([SML])(?:-|$)/);
	return match ? match[1] : null;
}

// A tier "ran" if it emitted at least one canvas metric. Used to tell an
// intentionally-skipped tier (CI restricts canvas perf to S, so M/L emit
// nothing) apart from a tier that ran but failed to emit a specific metric.
function tiersThatRan(metrics) {
	const tiers = new Set();
	for (const name of metrics.keys()) {
		const tier = tierOf(name);
		if (tier) tiers.add(tier);
	}
	return tiers;
}

function emitSummary(lines) {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;
	if (!summaryPath) return;
	try {
		appendFileSync(summaryPath, `${lines.join('\n')}\n`);
	} catch (error) {
		console.warn(`[sentinel] Could not write GITHUB_STEP_SUMMARY: ${error.message}`);
	}
}

function main() {
	const path = findResultsPath();
	const raw = readFileSync(path, 'utf8');
	const results = JSON.parse(raw);
	const metrics = extractMetrics(results);
	const ranTiers = tiersThatRan(metrics);

	const breaches = [];
	const checks = [];
	for (const sentinel of SENTINELS) {
		const observed = metrics.get(sentinel.metric);
		if (observed === undefined) {
			const tier = tierOf(sentinel.metric);
			// Tolerate a missing metric only when its whole tier was not run (e.g.
			// CI restricts canvas perf to the S tier, so M/L metrics are never
			// emitted). If the tier DID run but this metric is absent, that's a real
			// metric-emission / reporter gap — fail so it surfaces immediately
			// instead of producing a false-green nightly.
			if (tier && !ranTiers.has(tier)) {
				checks.push({ status: 'skipped', sentinel, observed: null });
				continue;
			}
			checks.push({ status: 'missing', sentinel, observed: null });
			breaches.push({ sentinel, observed: null, reason: 'metric not emitted' });
			continue;
		}
		const breached = observed > sentinel.max;
		checks.push({ status: breached ? 'fail' : 'pass', sentinel, observed });
		if (breached) breaches.push({ sentinel, observed, reason: sentinel.note });
	}

	const lines = ['## Canvas perf sentinels', ''];
	lines.push('| Metric | Observed | Threshold | Status |');
	lines.push('| --- | --- | --- | --- |');
	for (const check of checks) {
		const observed =
			check.status === 'skipped'
				? 'skipped (tier not run)'
				: check.observed === null
					? 'missing'
					: check.observed.toFixed(2);
		const status =
			check.status === 'pass'
				? 'ok'
				: check.status === 'skipped'
					? 'skipped'
					: check.status === 'missing'
						? 'MISSING'
						: 'FAIL';
		lines.push(
			`| \`${check.sentinel.metric}\` | ${observed} | ${check.sentinel.max} | ${status} |`,
		);
	}
	if (breaches.length > 0) {
		lines.push('');
		lines.push('### Breaches');
		for (const { sentinel, observed, reason } of breaches) {
			const value = observed === null ? 'missing' : observed;
			lines.push(`- \`${sentinel.metric}\` = ${value} (max ${sentinel.max}) — ${reason}`);
		}
	}
	emitSummary(lines);

	for (const line of lines) console.log(line);

	if (breaches.length > 0) {
		console.error(`\n[sentinel] ${breaches.length} sentinel failure(s) detected.`);
		process.exit(1);
	}
	const skipped = checks.filter((check) => check.status === 'skipped').length;
	const gated = checks.length - skipped;
	console.log(
		`\n[sentinel] All ${gated} gated sentinel(s) passed` +
			(skipped > 0 ? ` (${skipped} skipped — tier not run in this run).` : '.'),
	);
}

main();
