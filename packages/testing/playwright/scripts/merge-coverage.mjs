#!/usr/bin/env node
/**
 * Aggregate-side merge for shard-side compaction.
 *
 * Each shard resolves its own raw V8 to a small per-shard lcov; this merges
 * them into one unified lcov + an impact map. The merge retains only the unique
 * per-file (line/function -> summed hits) surface, so peak memory is bounded by
 * the codebase, NOT by shard count or container count — that's what makes it
 * memory-flat where MCR's all-raw-in-memory generate() OOMs on the full suite.
 *
 *   node merge-coverage.mjs <out-lcov> <out-map.json> <shard1.info> [shard2.info ...]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [outLcov, outMap, ...inputs] = process.argv.slice(2);
if (!outLcov || !outMap || inputs.length === 0) {
	console.error('usage: merge-coverage.mjs <out.info> <out-map.json> <shard.info>...');
	process.exit(1);
}

// file -> { fns: Map(name -> {line, hits}), lines: Map(lineNo -> hits) }
const files = new Map();
// `${file}#${fnLine}` -> Set(specId) — the bidirectional impact map. specId is
// the per-shard lcov's TN: (test name) when present, else the shard file.
const funcToSpecs = new Map();

function getFile(sf) {
	let f = files.get(sf);
	if (!f) files.set(sf, (f = { fns: new Map(), lines: new Map() }));
	return f;
}

function mergeLcov(text, fallbackSpec) {
	let sf = null;
	let spec = fallbackSpec;
	const fnLine = new Map();
	for (const raw of text.split('\n')) {
		if (raw.startsWith('TN:')) {
			const tn = raw.slice(3).trim();
			if (tn) spec = tn;
		} else if (raw.startsWith('SF:')) {
			sf = raw.slice(3);
			fnLine.clear();
			getFile(sf);
		} else if (raw.startsWith('FN:')) {
			const [line, ...name] = raw.slice(3).split(',');
			fnLine.set(name.join(','), Number(line));
		} else if (raw.startsWith('FNDA:')) {
			const [hits, ...name] = raw.slice(5).split(',');
			const n = name.join(',');
			const line = fnLine.get(n) ?? 0;
			const f = getFile(sf).fns;
			const cur = f.get(n) ?? { line, hits: 0 };
			cur.hits += Number(hits);
			f.set(n, cur);
			if (Number(hits) > 0) {
				const k = `${sf}#${line}`;
				let specs = funcToSpecs.get(k);
				if (!specs) funcToSpecs.set(k, (specs = new Set()));
				specs.add(spec);
			}
		} else if (raw.startsWith('DA:')) {
			const [line, hits] = raw.slice(3).split(',');
			const m = getFile(sf).lines;
			m.set(Number(line), (m.get(Number(line)) ?? 0) + Number(hits));
		}
	}
}

// ---- merge all shard lcovs -------------------------------------------------
let peakAfterEach = 0;
for (const path of inputs) {
	mergeLcov(readFileSync(path, 'utf8'), path);
	peakAfterEach = Math.max(peakAfterEach, process.memoryUsage().heapUsed);
}

// ---- emit unified lcov -----------------------------------------------------
const out = [];
let totFiles = 0;
let totFns = 0;
let totLines = 0;
for (const [sf, { fns, lines }] of files) {
	totFiles++;
	out.push('TN:');
	out.push(`SF:${sf}`);
	for (const [name, { line }] of fns) out.push(`FN:${line},${name}`);
	let fnh = 0;
	for (const [name, { hits }] of fns) {
		out.push(`FNDA:${hits},${name}`);
		if (hits > 0) fnh++;
	}
	out.push(`FNF:${fns.size}`);
	out.push(`FNH:${fnh}`);
	let lh = 0;
	for (const [line, hits] of [...lines.entries()].sort((a, b) => a[0] - b[0])) {
		out.push(`DA:${line},${hits}`);
		if (hits > 0) lh++;
	}
	out.push(`LF:${lines.size}`);
	out.push(`LH:${lh}`);
	out.push('end_of_record');
	totFns += fns.size;
	totLines += lines.size;
}
writeFileSync(outLcov, out.join('\n') + '\n');

// ---- emit impact map (file/function -> specs) ------------------------------
const map = {};
for (const [key, specs] of funcToSpecs) {
	const [file, line] = key.split('#');
	(map[file] ??= {})[line] = [...specs];
}
writeFileSync(outMap, JSON.stringify(map));

console.log(`merged ${inputs.length} shard lcov(s)`);
console.log(`  files: ${totFiles}  functions: ${totFns}  lines: ${totLines}`);
console.log(`  impact map entries (file,fn): ${funcToSpecs.size}`);
console.log(`  peak heap during merge: ${(peakAfterEach / 1e6).toFixed(1)} MB`);
console.log(`  -> ${outLcov}\n  -> ${outMap}`);
