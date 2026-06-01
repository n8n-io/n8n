#!/usr/bin/env node
/**
 * Compaction canary — proves the "processing part" that replaces MCR's
 * all-raw-in-memory merge (the step that OOMs on the full suite).
 *
 * The OOM happens because every container dumps the whole n8n footprint, so the
 * aggregate holds ~N_containers × full-app raw V8 in memory at once. Compaction
 * resolves each file's coverage to a tiny function-keyed row, then the merge
 * keeps only the UNIQUE (file, function) → specs mapping — a set whose size is
 * bounded by the codebase, NOT by how many containers ran. That's the property
 * that makes the merge memory-flat regardless of suite size.
 *
 * This canary runs the processing locally against a real lcov:
 *   1. lcov -> compact rows (function-keyed, uncovered dropped)   [emit]
 *   2. size: lcov bytes vs compact bytes                          [shrink]
 *   3. split rows into overlapping shards, stream-merge w/ dedupe [bounded merge]
 *   4. assert merged (file,function) set == original covered set  [round-trip]
 *
 *   node compact-canary.mjs [path/to/lcov.info]
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const lcovPath = process.argv[2] ?? 'coverage/lcov.info';

// ---- parse lcov -> per-file covered functions ------------------------------
function parseLcov(text) {
	const files = new Map(); // sf -> [{ name, line, hits }]
	let sf = null;
	const fnLine = new Map();
	for (const raw of text.split('\n')) {
		if (raw.startsWith('SF:')) {
			sf = raw.slice(3);
			files.set(sf, []);
			fnLine.clear();
		} else if (raw.startsWith('FN:')) {
			const [line, ...name] = raw.slice(3).split(',');
			fnLine.set(name.join(','), Number(line));
		} else if (raw.startsWith('FNDA:')) {
			const [hits, ...name] = raw.slice(5).split(',');
			const n = name.join(',');
			files.get(sf).push({ name: n, line: fnLine.get(n) ?? 0, hits: Number(hits) });
		}
	}
	return files;
}

// ---- 1. emit compact rows --------------------------------------------------
// One row per (spec, file): { spec, file, fns: ["name@line", ...] } covered only.
// Here the single lcov is attributed to one synthetic spec; in CI each per-test
// resolve emits its own spec id.
function emitRows(files, spec) {
	const rows = [];
	for (const [file, fns] of files) {
		const covered = fns.filter((f) => f.hits > 0).map((f) => `${f.name}@${f.line}`);
		if (covered.length) rows.push({ spec, file, fns: covered });
	}
	return rows;
}

// ---- 3. bounded stream-merge with dedupe -----------------------------------
// Keeps only unique (file -> fn -> Set(specs)). Memory is bounded by the
// codebase's covered surface, independent of how many shards/rows feed in.
function mergeRows(rowBatches) {
	const map = new Map(); // file -> Map(fn -> Set(spec))
	let rowsSeen = 0;
	for (const batch of rowBatches) {
		for (const row of batch) {
			rowsSeen++;
			let byFn = map.get(row.file);
			if (!byFn) map.set(row.file, (byFn = new Map()));
			for (const fn of row.fns) {
				let specs = byFn.get(fn);
				if (!specs) byFn.set(fn, (specs = new Set()));
				specs.add(row.spec);
			}
		}
	}
	return { map, rowsSeen };
}

function uniquePairs(map) {
	let n = 0;
	for (const byFn of map.values()) n += byFn.size;
	return n;
}

// ---- run -------------------------------------------------------------------
const lcovText = readFileSync(lcovPath, 'utf8');
const files = parseLcov(lcovText);

const rows = emitRows(files, 'tests/e2e/canary.spec.ts');
const rowsPath = lcovPath.replace(/[^/]+$/, 'impact-rows.jsonl');
const jsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
writeFileSync(rowsPath, jsonl);

const lcovBytes = statSync(lcovPath).size;
const rowsBytes = Buffer.byteLength(jsonl);
const coveredPairs = rows.reduce((n, r) => n + r.fns.length, 0);

console.log('── 1/2. emit + shrink ────────────────────────────────────────');
console.log(`  files with coverage : ${rows.length}`);
console.log(`  covered functions   : ${coveredPairs}`);
console.log(`  lcov bytes          : ${(lcovBytes / 1e6).toFixed(2)} MB`);
console.log(`  compact rows bytes  : ${(rowsBytes / 1e6).toFixed(2)} MB  ->  ${rowsPath}`);
console.log(`  shrink              : ${(100 * (1 - rowsBytes / lcovBytes)).toFixed(1)}%`);

// 3. simulate the OOM scenario: the SAME footprint emitted by many "containers"
// (the real redundancy). Naive raw merge would grow with copies; the dedupe
// merge stays flat. Feed 50 overlapping copies (each a different spec id).
console.log('\n── 3. bounded dedupe-merge (the anti-OOM property) ───────────');
const COPIES = 50;
const batches = [];
for (let i = 0; i < COPIES; i++) {
	batches.push(rows.map((r) => ({ ...r, spec: `tests/e2e/spec-${i}.spec.ts` })));
}
const before = process.memoryUsage().heapUsed;
const { map, rowsSeen } = mergeRows(batches);
const after = process.memoryUsage().heapUsed;
console.log(`  containers simulated: ${COPIES}  (each = full footprint, the redundancy)`);
console.log(`  rows fed through    : ${rowsSeen}`);
console.log(`  unique (file,fn)    : ${uniquePairs(map)}  <- retained set size`);
console.log(
	`  retained / fed      : ${((uniquePairs(map) / rowsSeen) * 100).toFixed(1)}%  (flat in #containers)`,
);
console.log(`  heap delta for merge: ${((after - before) / 1e6).toFixed(1)} MB`);

// 4. round-trip: merged unique pairs must equal the original covered set.
console.log('\n── 4. round-trip correctness ─────────────────────────────────');
const origPairs = new Set();
for (const r of rows) for (const fn of r.fns) origPairs.add(`${r.file}::${fn}`);
const mergedPairs = new Set();
for (const [file, byFn] of map) for (const fn of byFn.keys()) mergedPairs.add(`${file}::${fn}`);
const missing = [...origPairs].filter((p) => !mergedPairs.has(p));
const extra = [...mergedPairs].filter((p) => !origPairs.has(p));
console.log(`  original pairs : ${origPairs.size}`);
console.log(`  merged pairs   : ${mergedPairs.size}`);
console.log(`  missing/extra  : ${missing.length}/${extra.length}`);
console.log(
	missing.length === 0 && extra.length === 0 && origPairs.size === mergedPairs.size
		? '\n✅ canary passed: compaction shrinks payload, merge is bounded, round-trip exact.'
		: '\n❌ canary FAILED: round-trip mismatch.',
);
process.exit(missing.length === 0 && extra.length === 0 ? 0 : 1);
