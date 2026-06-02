#!/usr/bin/env node
// @ts-check

/**
 * Aggregate downloaded shard artifacts into (1) a unified coverage report lcov
 * and (2) the per-spec impact map, using the property-tested janitor
 * `merge-coverage`. Replaces brittle inline `find`/`cp` bash in the workflows —
 * the janitor CLI path lives here, in one place, instead of per-YAML-string.
 *
 *   node aggregate-coverage.mjs --shards=<dir> --out=<dir>
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JANITOR_CLI = path.resolve(__dirname, '..', '..', 'janitor', 'dist', 'cli.js');

const arg = (name, fallback) =>
	process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const SHARDS = arg('shards', '/tmp/shards');
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

/** Stage matching files into a fresh temp dir with unique names, return the dir. */
function stage(label, files) {
	const dir = path.join('/tmp', `agg-${label}`);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	files.forEach((f, i) => copyFileSync(f, path.join(dir, `${label}-${i}.lcov`)));
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

// 1. Report: shard-level lcovs (frontend + backend) → unified lcov for Codecov.
const shardLcovs = findFiles(SHARDS, (name) => name === 'lcov.info');
console.log(`Report: ${shardLcovs.length} shard lcov(s)`);
if (shardLcovs.length) {
	merge(stage('report', shardLcovs), path.join(OUT, 'lcov.info'), '/tmp/agg-report-map.json');
} else {
	console.warn('  ⚠ no shard lcov.info found — skipping report');
}

// 2. Impact map: per-spec frontend lcovs (TN-tagged) → spec-keyed map for selection.
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
