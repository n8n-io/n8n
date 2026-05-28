#!/usr/bin/env node
// Catastrophic-regression gate for canvas performance e2e benchmarks.
//
// Reads the Playwright JSON reporter output (test-results.json) and checks each
// canvas-* metric against a small, fixed set of thresholds defined here. Exits
// non-zero on any breach so the nightly job fails loudly. Trend / soft
// regressions are intentionally NOT gated here — those flow through the QA
// metrics webhook + PR comment, which tolerates the 15-30% wall-clock noise
// that browser benchmarks always have.

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

	const breaches = [];
	const checks = [];
	for (const sentinel of SENTINELS) {
		const observed = metrics.get(sentinel.metric);
		if (observed === undefined) {
			// A missing sentinel metric means either the test didn't run, didn't
			// emit it, or the JSON reporter dropped it. Treating that as "skip"
			// would let metric-emission regressions produce false-green nightlies
			// — fail instead so the gap surfaces immediately.
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
		const observed = check.observed === null ? 'missing' : check.observed.toFixed(2);
		const status = check.status === 'pass' ? 'ok' : check.status === 'missing' ? 'MISSING' : 'FAIL';
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
	console.log(`\n[sentinel] All ${checks.length} sentinels passed.`);
}

main();
