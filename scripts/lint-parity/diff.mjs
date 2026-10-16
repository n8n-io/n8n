#!/usr/bin/env node
/**
 * Compares two `snapshot.mjs` outputs and fails on any effective-config change
 * that is not declared in an `--expected` file.
 *
 * The expected file is the point of the tool: a consolidation PR always changes
 * something, so the reviewer reads a short list of intended changes instead of
 * trusting that 300 files still lint the same way.
 *
 * Expected entries match on `pkg` (prefix), optional `file` (substring),
 * optional `rule`, and carry a `reason` that shows up in the summary.
 */
import { readFileSync } from 'node:fs';

const [beforeFile, afterFile] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const expectedIndex = process.argv.indexOf('--expected');
if (!beforeFile || !afterFile) {
	console.error('usage: diff.mjs <before.json> <after.json> [--expected <file.json>]');
	process.exit(2);
}

const before = JSON.parse(readFileSync(beforeFile, 'utf8'));
const after = JSON.parse(readFileSync(afterFile, 'utf8'));
const expected =
	expectedIndex === -1 ? [] : JSON.parse(readFileSync(process.argv[expectedIndex + 1], 'utf8'));

const stable = (v) =>
	JSON.stringify(v, (_, x) =>
		x && typeof x === 'object' && !Array.isArray(x)
			? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
			: x,
	);

const diffs = [];
const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

for (const key of keys) {
	const [pkg, file] = key.split('|');
	const b = before[key];
	const a = after[key];

	if (b?.error || a?.error) {
		diffs.push({
			pkg, file, key: '(unresolved)',
			before: b?.error ? 'error' : 'ok',
			after: a?.error ? 'error' : 'ok',
		});
		continue;
	}
	if (!b || !a) {
		diffs.push({
			pkg,
			file,
			key: '(sample)',
			before: b ? 'present' : 'absent',
			after: a ? 'present' : 'absent',
		});
		continue;
	}
	// a file dropping out of linting is never acceptable silently
	if (Boolean(b.ignored) !== Boolean(a.ignored)) {
		diffs.push({
			pkg,
			file,
			key: '(linted)',
			before: b.ignored ? 'ignored' : 'linted',
			after: a.ignored ? 'ignored' : 'linted',
		});
		continue;
	}
	if (b.ignored) continue;

	for (const rule of [...new Set([...Object.keys(b.rules), ...Object.keys(a.rules)])].sort()) {
		const bv = b.rules[rule] ?? [0];
		const av = a.rules[rule] ?? [0];
		if (stable(bv) !== stable(av)) {
			const show = (v) =>
				v[0] === 0 ? 'off' : v.length > 1 ? `error ${stable(v.slice(1))}` : 'error';
			diffs.push({ pkg, file, key: rule, before: show(bv), after: show(av) });
		}
	}
	for (const field of ['plugins', 'settings', 'languageOptions']) {
		if (stable(b[field]) !== stable(a[field])) {
			diffs.push({
				pkg,
				file,
				key: `(${field})`,
				before: stable(b[field]),
				after: stable(a[field]),
			});
		}
	}
}

const matches = (d, e) =>
	d.pkg.startsWith(e.pkg) &&
	(e.file === undefined || d.file.includes(e.file)) &&
	(e.rule === undefined || d.key === e.rule) &&
	(e.key === undefined || d.key === e.key) &&
	// `error` in an expected entry also matches `error [options]`
	(e.before === undefined || d.before === e.before || d.before.startsWith(`${e.before} `)) &&
	(e.after === undefined || d.after === e.after || d.after.startsWith(`${e.after} `));

const unexpected = [];
const accounted = new Map();
for (const d of diffs) {
	const hit = expected.find((e) => matches(d, e));
	if (hit) accounted.set(hit.reason, (accounted.get(hit.reason) ?? 0) + 1);
	else unexpected.push(d);
}

for (const [reason, count] of [...accounted].sort((x, y) => y[1] - x[1])) {
	console.log(`expected  ${String(count).padStart(5)}  ${reason}`);
}

if (unexpected.length === 0) {
	console.log(`\nOK: ${diffs.length} difference(s), all expected.`);
	process.exit(0);
}

console.log(`\nUNEXPECTED (${unexpected.length}):`);
const w = (s, n) => String(s).slice(0, n).padEnd(n);
console.log(w('package', 38), w('file', 38), w('key', 44), w('before', 22), 'after');
for (const d of unexpected.slice(0, 60)) {
	console.log(
		w(d.pkg, 38),
		w(d.file, 38),
		w(d.key, 44),
		w(d.before, 22),
		String(d.after).slice(0, 40),
	);
}
if (unexpected.length > 60) console.log(`... and ${unexpected.length - 60} more`);
process.exit(1);
