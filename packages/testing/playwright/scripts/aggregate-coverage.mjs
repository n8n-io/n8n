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
 *   artifacts, nested per-artifact as `<artifact>/<pkg>/coverage/lcov.info`.
 *   Jest and vitest write package-RELATIVE SF paths (`src/foo.ts`); we qualify
 *   them to repo-root-relative `packages/<pkg>/src/...` (pkg derived from the
 *   artifact dir) so they MERGE with the already-qualified E2E lcovs instead of
 *   colliding under bare `src/...` keys (every package has a `src/index.ts`).
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
 * Rewrite absolute SF: paths to repo-root-relative. E2E lcovs are already
 * repo-root-relative (or absolute under REPO_ROOT), so this is a no-op / strip.
 */
function normalizeLcov(content) {
	return content.replace(/^SF:(.+)$/gm, (line, p) =>
		p.startsWith(REPO_ROOT) ? `SF:${p.slice(REPO_ROOT.length)}` : line,
	);
}

/**
 * Derive a `packages/<pkg>/` prefix from a unit lcov's path under the artifacts
 * root, where artifacts nest as `<artifact>/<pkg>/coverage/lcov.info`.
 */
function unitPrefix(file, root) {
	const segs = path.relative(root, file).split(path.sep);
	segs.shift(); // drop the per-artifact dir (unit-coverage / frontend-coverage / …)
	const cov = segs.indexOf('coverage');
	const pkg = cov > 0 ? segs.slice(0, cov).join('/') : '';
	// No package segment means the artifact layout isn't <artifact>/<pkg>/coverage/…
	// — warn loudly rather than qualify with a garbled prefix or silently collide.
	if (!pkg) console.warn(`  ⚠ can't derive package from ${file} — SF paths left unqualified`);
	return pkg ? `packages/${pkg}/` : '';
}

/** Qualify package-relative SF paths (`src/…`) to `packages/<pkg>/src/…`. */
function qualifyLcov(content, prefix) {
	if (!prefix) return content;
	return content.replace(/^SF:(.+)$/gm, (line, p) =>
		p.startsWith('packages/') || p.startsWith('/') ? line : `SF:${prefix}${p}`,
	);
}

/** Stage `{ file, transform }` entries into a fresh temp dir, applying each
 *  transform to its file's SF: paths. One dir → one merge call. */
function stage(label, entries) {
	const dir = path.join('/tmp', `agg-${label}`);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	entries.forEach(({ file, transform }, i) =>
		writeFileSync(path.join(dir, `${label}-${i}.lcov`), transform(readFileSync(file, 'utf8'))),
	);
	return dir;
}

/** E2E lcovs keep their (already-qualified) paths; unit lcovs get package-qualified. */
const normalizeEntry = (file) => ({ file, transform: normalizeLcov });
const qualifyEntry = (file) => ({
	file,
	transform: (c) => qualifyLcov(c, unitPrefix(file, UNIT_SHARDS)),
});

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

// node_modules holds bundled-dependency lcovs (e.g. cli/node_modules/n8n-core);
// they'd double-count and mis-qualify, so keep only first-party package lcovs.
const firstParty = (name, p) =>
	name === 'lcov.info' && !p.includes(`${path.sep}node_modules${path.sep}`);
const shardLcovs = findFiles(SHARDS, firstParty);
const unitLcovs = UNIT_SHARDS ? findFiles(UNIT_SHARDS, firstParty) : [];

// 1. Combined report → lcov.info (all layers: E2E + unit + integration + frontend).
//    Uploaded to Codecov as a single `nightly-full` flag — one authoritative number
//    rather than per-layer flags that require an approximated union at query time.
console.log(
	`Report: ${shardLcovs.length} E2E shard lcov(s), ${unitLcovs.length} unit/integration/frontend lcov(s)`,
);
if (shardLcovs.length || unitLcovs.length) {
	const entries = [...shardLcovs.map(normalizeEntry), ...unitLcovs.map(qualifyEntry)];
	merge(stage('report', entries), path.join(OUT, 'lcov.info'), '/tmp/agg-report-map.json');
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
	merge(
		stage('spec', specLcovs.map(normalizeEntry)),
		'/tmp/agg-spec-fe.lcov',
		path.join(OUT, 'impact-map.json'),
	);
} else {
	console.warn('  ⚠ no per-spec lcovs found — impact map not built');
}
