#!/usr/bin/env node
/**
 * Prototype: turn an MCR lcov into a function<->source<->spec impact map, then
 * resolve a git diff to the E2E spec(s) that exercise the changed code.
 *
 * The canary report came from ONE spec (if-node.spec.ts), so all its coverage
 * is attributable to that spec. In production each per-test lcov carries its
 * own spec id; here we pass it in. Keyed on FUNCTION coverage (not lines) so
 * module-load-only execution doesn't over-select.
 *
 *   node impact-map.mjs <lcov> <spec-id> <diff-file>
 */
import { readFileSync } from 'node:fs';

const [lcovPath, specId, diffPath] = process.argv.slice(2);

// ---- 1. Parse lcov -> per-file covered functions ----------------------------
function parseLcov(text) {
	const files = new Map(); // sf -> [{ name, line, hits }]
	let sf = null;
	const fnLine = new Map(); // name -> line (within current file)
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

// ---- 2. Build the map (this report == one spec) -----------------------------
// fileToSpecs: source -> Set(spec)   |   funcToSpecs: `${source}#${line}` -> Set(spec)
function buildMap(files, spec) {
	const fileToSpecs = new Map();
	const funcToSpecs = new Map();
	const fileFns = new Map(); // source -> [{name,line}] covered, sorted by line
	for (const [sf, fns] of files) {
		const covered = fns.filter((f) => f.hits > 0);
		if (!covered.length) continue;
		fileToSpecs.set(sf, new Set([spec]));
		fileFns.set(
			sf,
			covered.map((f) => ({ name: f.name, line: f.line })).sort((a, b) => a.line - b.line),
		);
		for (const f of covered) {
			const k = `${sf}#${f.line}`;
			(funcToSpecs.get(k) ?? funcToSpecs.set(k, new Set()).get(k)).add(spec);
		}
	}
	return { fileToSpecs, funcToSpecs, fileFns };
}

// ---- 3. Parse a unified git diff -> changed files + changed new-side lines ---
function parseDiff(text) {
	const changed = new Map(); // path -> Set(lineNumber)
	let path = null;
	let newLine = 0;
	for (const raw of text.split('\n')) {
		if (raw.startsWith('+++ ')) {
			path = raw.slice(4).replace(/^b\//, '').trim();
			if (!changed.has(path)) changed.set(path, new Set());
		} else if (raw.startsWith('@@')) {
			const m = raw.match(/\+(\d+)/);
			newLine = m ? Number(m[1]) : 0;
		} else if (path) {
			if (raw.startsWith('+') && !raw.startsWith('+++')) {
				changed.get(path).add(newLine);
				newLine++;
			} else if (!raw.startsWith('-')) {
				newLine++; // context line advances the new-side counter
			}
		}
	}
	return changed;
}

// A function is "touched" if a changed line falls in [fnLine, nextFnLine).
function touchedFns(fileFns, changedLines) {
	if (!fileFns) return [];
	const out = [];
	for (let i = 0; i < fileFns.length; i++) {
		const start = fileFns[i].line;
		const end = i + 1 < fileFns.length ? fileFns[i + 1].line : Infinity;
		if ([...changedLines].some((l) => l >= start && l < end)) out.push(fileFns[i]);
	}
	return out;
}

// ---- run --------------------------------------------------------------------
const map = buildMap(parseLcov(readFileSync(lcovPath, 'utf8')), specId);
const diff = parseDiff(readFileSync(diffPath, 'utf8'));

console.log(`\nDiff touches ${diff.size} file(s):`);
const selected = new Set();
for (const [file, lines] of diff) {
	const fileSpecs = map.fileToSpecs.get(file);
	if (!fileSpecs) {
		console.log(`  ✗ ${file} — no coverage entry → can't scope (default: run broad)`);
		continue;
	}
	const fns = touchedFns(map.fileFns.get(file), lines);
	const fnSpecs = new Set();
	for (const f of fns)
		for (const s of map.funcToSpecs.get(`${file}#${f.line}`) ?? []) fnSpecs.add(s);
	const specs = fns.length ? fnSpecs : fileSpecs; // function-precise when we can pin the function
	for (const s of specs) selected.add(s);
	console.log(
		`  ✓ ${file}\n      changed lines: ${[...lines].slice(0, 8).join(', ')}${lines.size > 8 ? '…' : ''}` +
			`\n      touched covered fns: ${fns.length ? fns.map((f) => `${f.name}@${f.line}`).join(', ') : '(none pinned → file-level)'}` +
			`\n      → specs: ${[...specs].join(', ')}`,
	);
}
console.log(
	`\n=> E2E specs to run: ${selected.size ? [...selected].join(', ') : '(none — skip E2E)'}\n`,
);
