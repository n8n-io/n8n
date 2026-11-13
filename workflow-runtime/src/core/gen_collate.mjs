// Generates collate_tables.zig and testdata/collate_cases.txt: the CLDR root
// collation, which ICU (and so V8) uses for String.prototype.localeCompare
// without a locale, with "en" and with the default options.
//
// The tables come from two files of the CLDR release that the ICU of Node.js
// is built on (CLDR 48, UCA 17). The script checks their SHA-256:
//   https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/uca/allkeys_CLDR.txt
//   https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/uca/FractionalUCA.txt
// allkeys_CLDR.txt gives the collation elements of each code point and
// contraction. FractionalUCA.txt gives the radical-stroke order of the Han
// ideographs, which CLDR root uses in place of the code point order of the
// UCA implicit weights. The test cases are comparisons of random strings by
// the Node.js that runs the script.
//
// Run from workflow-runtime: node src/core/gen_collate.mjs <dir with the two files>
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2];
if (!dir) throw new Error('usage: node src/core/gen_collate.mjs <dir>');
const want = {
	'allkeys_CLDR.txt': 'f6f8961f6c51373bdc00b09fb61cc8c07bec4122bc4b8bcb50ff71c4b0901ab5',
	'FractionalUCA.txt': '591153cea3a1c33d69cf6ebefd3a7cd667bfb86a59ad2b5597b88c666bd6d521',
};
const read = (name) => {
	const text = readFileSync(join(dir, name));
	const hash = createHash('sha256').update(text).digest('hex');
	if (hash !== want[name]) throw new Error(`${name}: SHA-256 ${hash}, want ${want[name]}`);
	return text.toString('utf8');
};
if (process.versions.icu !== '78.3') console.warn(`warning: Node.js ICU ${process.versions.icu}, the tables are for 78.3`);

// Han in radical-stroke order.
const hanRank = new Map();
let rank = 0;
for (const line of read('FractionalUCA.txt').split('\n')) {
	const m = /^\[radical [^=]+=[^:]*:(.*)\]$/u.exec(line);
	if (!m) continue;
	const cps = [...m[1]].map((c) => c.codePointAt(0));
	for (let k = 0; k < cps.length; k++) {
		if (cps[k + 1] === 0x2d && k + 2 < cps.length) {
			for (let c = cps[k]; c <= cps[k + 2]; c++) if (!hanRank.has(c)) hanRank.set(c, rank++);
			k += 2;
		} else if (!hanRank.has(cps[k])) hanRank.set(cps[k], rank++);
	}
}
const hanCE = (cp) => {
	const r = hanRank.get(cp);
	return r === undefined ? null : [[0xfb40 + (r >> 15), 0x20, 2], [(r & 0x7fff) | 0x8000, 0, 0]];
};

// Collation elements; an implicit Han weight in code point order becomes the radical-stroke one.
const singles = new Map();
const contractions = new Map();
for (const line of read('allkeys_CLDR.txt').split('\n')) {
	const m = /^([0-9A-F ]+);\s*((?:\[[.*][0-9A-F.]+\])+)/.exec(line);
	if (!m) continue;
	const cps = m[1].trim().split(/\s+/).map((h) => parseInt(h, 16));
	const raw = [...m[2].matchAll(/\[[.*]([0-9A-F]+)\.([0-9A-F]+)\.([0-9A-F]+)\]/g)].map((x) => [
		parseInt(x[1], 16),
		parseInt(x[2], 16),
		parseInt(x[3], 16),
	]);
	const ces = [];
	for (let k = 0; k < raw.length; k++) {
		const [p, s, t] = raw[k];
		if (p >= 0xfb40 && p < 0xfbc0 && k + 1 < raw.length && raw[k + 1][0] >= 0x8000) {
			const cp = ((p - (p < 0xfb80 ? 0xfb40 : 0xfb80)) << 15) | (raw[k + 1][0] & 0x7fff);
			const han = hanCE(cp);
			if (han) {
				ces.push([han[0][0], s, t], han[1]);
				k++;
				continue;
			}
		}
		ces.push(raw[k]);
	}
	if (cps.length > 3) throw new Error('contraction longer than 3');
	(cps.length === 1 ? singles : contractions).set(cps.length === 1 ? cps[0] : cps.join(' '), ces);
}

// Code points of the siniform scripts that take their own implicit base when assigned.
const siniform = [
	[0x17000, 0x187ff, 0xfb00, 0x17000],
	[0x18d00, 0x18d7f, 0xfb00, 0x17000],
	[0x18800, 0x18aff, 0xfb01, 0x18800],
	[0x18d80, 0x18dff, 0xfb01, 0x18800],
	[0x1b170, 0x1b2ff, 0xfb02, 0x1b170],
	[0x18b00, 0x18cff, 0xfb03, 0x18b00],
];
const siniformRuns = [];
for (const [lo, hi, base, first] of siniform) {
	let start = -1;
	for (let cp = lo; cp <= hi + 1; cp++) {
		const assigned = cp <= hi && !/\p{Cn}/u.test(String.fromCodePoint(cp));
		if (assigned && start < 0) start = cp;
		if (!assigned && start >= 0) {
			siniformRuns.push([start, cp - 1, base, first]);
			start = -1;
		}
	}
}
siniformRuns.sort((a, b) => a[0] - b[0]);

// The Zig source.
const pool = [];
const ceWord = ([p, s, t]) => {
	if (p > 0xffff || s > 0x1ff || t > 0x1f) throw new Error(`weight out of range ${p} ${s} ${t}`);
	return ((p << 14) | (s << 5) | t) >>> 0;
};
const place = (ces) => {
	const start = pool.length;
	pool.push(...ces.map(ceWord));
	if (start >= 1 << 20 || ces.length > 255) throw new Error('pool too large');
	return { start, len: ces.length };
};
const hex = (n) => `0x${n.toString(16)}`;
const singleRecs = [...singles.entries()]
	.sort((a, b) => a[0] - b[0])
	.map(([cp, ces]) => {
		const { start, len } = place(ces);
		return BigInt(cp) * 2n ** 32n + BigInt(start) * 256n + BigInt(len);
	});
const contractionRecs = [...contractions.entries()]
	.map(([key, ces]) => {
		const c = key.split(' ').map(Number);
		const k = (BigInt(c[0]) << 42n) | (BigInt(c[1]) << 21n) | BigInt(c[2] ?? 0);
		const { start, len } = place(ces);
		return [k, start * 256 + len];
	})
	.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
const hanByCp = [...hanRank.entries()].sort((a, b) => a[0] - b[0]);
const hanRuns = [];
for (const [cp, r] of hanByCp) {
	const last = hanRuns[hanRuns.length - 1];
	if (last && last.cp + last.len === cp && last.rank + last.len === r && last.len < 0xffff) last.len++;
	else hanRuns.push({ cp, len: 1, rank: r });
}
const rows = (list, per) => {
	const out = [];
	for (let i = 0; i < list.length; i += per) out.push(`${list.slice(i, i + per).join(', ')},`);
	return out;
};
const lines = [
	'//! Generated by gen_collate.mjs from CLDR 48 (allkeys_CLDR.txt, FractionalUCA.txt). Do not edit.',
	`//! ${singles.size} code points, ${contractions.size} contractions, ${pool.length} collation elements,`,
	`//! ${hanRank.size} Han ideographs in radical-stroke order (${hanRuns.length} runs).`,
	'',
	'/// A collation element: primary << 14 | secondary << 5 | tertiary.',
	'pub const CE = u32;',
	'',
	'/// Code point << 32 | pool start << 8 | element count, sorted by code point.',
	'pub const singles = [_]u64{',
	...rows(singleRecs.map((x) => `0x${x.toString(16)}`), 6),
	'};',
	'',
	'/// Contraction keys: first << 42 | second << 21 | third (0 when there are two), sorted.',
	'pub const contraction_keys = [_]u64{',
	...rows(contractionRecs.map((x) => `0x${x[0].toString(16)}`), 6),
	'};',
	'',
	'/// Pool start << 8 | element count of each contraction key.',
	'pub const contraction_values = [_]u32{',
	...rows(contractionRecs.map((x) => hex(x[1])), 10),
	'};',
	'',
	'pub const pool = [_]CE{',
	...rows(pool.map(hex), 10),
	'};',
	'',
	'/// Runs of Han ideographs: first code point << 33 | count << 17 | radical-stroke rank of the first.',
	'pub const han_runs = [_]u64{',
	...rows(hanRuns.map((h) => `0x${((BigInt(h.cp) << 33n) | (BigInt(h.len) << 17n) | BigInt(h.rank)).toString(16)}`), 6),
	'};',
	'',
	'/// Assigned code points of siniform scripts: first, last, implicit base, first code point of the script.',
	'pub const Siniform = struct { lo: u21, hi: u21, base: u16, first: u21 };',
	'pub const siniform = [_]Siniform{',
	...siniformRuns.map(([lo, hi, base, first]) => `.{ .lo = ${hex(lo)}, .hi = ${hex(hi)}, .base = ${hex(base)}, .first = ${hex(first)} },`),
	'};',
	'',
];
const out = join(here, 'collate_tables.zig');
writeFileSync(out, lines.join('\n'));
execFileSync('zig', ['fmt', out]);

// Test cases: comparisons by V8 of random strings over the repertoire that the tables cover.
let seed = 20261112;
const rnd = (k) => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) % k;
};
const keys = [...singles.keys()].map((cp) => String.fromCodePoint(cp));
const contractionTexts = [...contractions.keys()].map((k) => String.fromCodePoint(...k.split(' ').map(Number)));
const common = [...'aAbBeéEÉzZ0123456789 -_.,:;!?()[]{}@#$%&*+/\\\'"àäöüßæøåñçÇ日本中文한국어가ไทยабвгαβγ'];
const marks = [...'̴़ְً่̧̣̀́̂̈ͅ'];
const pick = () => {
	const r = rnd(12);
	if (r < 4) return common[rnd(common.length)];
	if (r < 7) return keys[rnd(keys.length)];
	if (r < 8) return contractionTexts[rnd(contractionTexts.length)];
	if (r < 9) return marks[rnd(marks.length)];
	if (r < 10) {
		const cp = 0x4e00 + rnd(0x5200);
		return String.fromCodePoint(cp);
	}
	let cp = rnd(0x40000);
	if (cp >= 0xd800 && cp <= 0xdfff) cp = 0x41;
	return String.fromCodePoint(cp);
};
const text = () => Array.from({ length: rnd(7) }, pick).join('');
const cases = [];
for (let t = 0; t < 20000; t++) {
	const a = text();
	const mode = rnd(4);
	const b =
		mode === 0
			? a.normalize(rnd(2) ? 'NFC' : 'NFD')
			: mode === 1
				? text()
				: a.slice(0, rnd(a.length + 1)) + pick() + a.slice(rnd(a.length + 1));
	// Cuts inside a surrogate pair make lone surrogates, which the case file cannot hold.
	if (/[\uD800-\uDFFF]/.test(a.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')) || /[\uD800-\uDFFF]/.test(b.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''))) continue;
	const h = (s) => [...s].map((c) => c.codePointAt(0).toString(16)).join(' ');
	cases.push(`${h(a)}\t${h(b)}\t${Math.sign(a.localeCompare(b))}`);
}
writeFileSync(join(here, 'testdata', 'collate_cases.txt'), `${cases.join('\n')}\n`);
console.log(`${singles.size} singles, ${contractions.size} contractions, ${pool.length} elements, ${hanRuns.length} Han runs, ${cases.length} cases`);
