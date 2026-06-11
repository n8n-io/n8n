#!/usr/bin/env node
// @ts-check

/**
 * Aggregate downloaded shard artifacts into (1) a unified coverage report lcov
 * and (2) the per-spec impact map, using the property-tested janitor
 * `merge-coverage`. Replaces brittle inline `find`/`cp` bash in the workflows —
 * the janitor CLI path lives here, in one place, instead of per-YAML-string.
 *
 *   node aggregate-coverage.mjs --shards=<dir> --out=<dir> [--unit-shards=<dir>]
 *
 * --unit-shards: directory of downloaded unit + integration + frontend lcov
 *   artifacts. Jest and vitest write absolute SF: paths in CI
 *   (/home/runner/work/n8n/n8n/packages/cli/src/foo.ts); they are normalised
 *   to repo-root-relative before merging with the E2E lcovs so MCR sees the
 *   same key across all three suites.
 */

import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
	readdirSync,
	statSync,
	rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JANITOR_CLI = path.resolve(__dirname, '..', '..', 'janitor', 'dist', 'cli.js');
// scripts/ → playwright/ → testing/ → packages/ → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..') + path.sep;

const arg = (name, fallback) =>
	process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const SHARDS = arg('shards', '/tmp/shards');
const UNIT_SHARDS = arg('unit-shards', null);
const OUT = arg('out', './coverage');

/** Recursively collect files under `dir` matching `predicate(filename)`. */
function findFiles(dir, predicate, acc = []) {
	if (!existsSync(dir)) return acc;
	for (const entry of readdirSync(dir)) {
		const p = path.join(dir, entry);
		if (statSync(p).isDirectory()) findFiles(p, predicate, acc);
		else if (predicate(entry, p)) acc.push(p);
	}
	return acc;
}

/**
 * Rewrite absolute SF: paths to repo-root-relative. Jest and vitest write
 * absolute paths in CI; E2E lcovs are already repo-root-relative so the
 * regex is a no-op for them. Merging everything through the same transform
 * means MCR sees identical keys across all three suites.
 */
function normalizeLcov(content) {
	return content.replace(/^SF:(.+)$/gm, (line, p) =>
		p.startsWith(REPO_ROOT) ? `SF:${p.slice(REPO_ROOT.length)}` : line,
	);
}

/** Stage files into a fresh temp dir with unique names, normalising SF: paths. */
function stage(label, files) {
	const dir = path.join('/tmp', `agg-${label}`);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	files.forEach((f, i) => {
		writeFileSync(path.join(dir, `${label}-${i}.lcov`), normalizeLcov(readFileSync(f, 'utf8')));
	});
	return dir;
}

function merge(inputsDir, outLcov, outMap) {
	execFileSync(
		'node',
		[
			JANITOR_CLI,
			'merge-coverage',
			`--inputs-dir=${inputsDir}`,
			`--out-lcov=${outLcov}`,
			`--out-map=${outMap}`,
		],
		{ stdio: 'inherit' },
	);
}

mkdirSync(OUT, { recursive: true });

const shardLcovs = findFiles(SHARDS, (name) => name === 'lcov.info');
const unitLcovs = UNIT_SHARDS ? findFiles(UNIT_SHARDS, (name) => name === 'lcov.info') : [];
const allReportLcovs = [...shardLcovs, ...unitLcovs];

// 1. Combined report → lcov.info (all layers: E2E + unit + integration + frontend).
//    Uploaded to Codecov as a single `nightly-full` flag — one authoritative number
//    rather than per-layer flags that require an approximated union at query time.
console.log(
	`Report: ${shardLcovs.length} E2E shard lcov(s), ${unitLcovs.length} unit/integration/frontend lcov(s)`,
);
if (allReportLcovs.length) {
	merge(stage('report', allReportLcovs), path.join(OUT, 'lcov.info'), '/tmp/agg-report-map.json');
} else {
	console.warn('  ⚠ no lcovs found — skipping report');
}

// 2. Impact map: per-spec E2E lcovs (TN-tagged) → spec-keyed map for PR selection.
//    Unit/integration lcovs are not TN-tagged per test so they stay out of the
//    impact map for now — cross-layer per-test attribution is Phase 3 (DEVP-293).
const specLcovs = findFiles(
	SHARDS,
	(name, p) => name.endsWith('.lcov') && p.includes(`${path.sep}by-spec${path.sep}`),
);
console.log(`Impact map: ${specLcovs.length} per-spec lcov(s)`);
if (specLcovs.length) {
	merge(stage('spec', specLcovs), '/tmp/agg-spec-fe.lcov', path.join(OUT, 'impact-map.json'));
} else {
	console.warn('  ⚠ no per-spec lcovs found — impact map not built');
}
