#!/usr/bin/env node
/**
 * Compares two builds in a result file of `run.mjs`.
 *
 * Usage: node report.mjs <file.jsonl> <baseLabel> <newLabel>
 *
 * Environment:
 *   TOP  number of slower and faster cases to print (default 15)
 *   ALL  print one table row for each case
 */

import { readFileSync } from 'node:fs';

const [file, baseLabel, newLabel] = process.argv.slice(2);
if (!file || !baseLabel || !newLabel) {
	console.error('Usage: node report.mjs <file.jsonl> <baseLabel> <newLabel>');
	process.exit(1);
}

/** A case counts as changed when it moves by more than 10% and by more than 0.02 ms. */
const CHANGE_PCT = 10;
const CHANGE_MS = 0.02;
const MEMORY_KEYS = ['guestInitKB', 'guestKB', 'hostAllocKB'];
const top = Number(process.env.TOP ?? 15);

function formatMs(ms) {
	if (ms >= 100) {
		return ms.toFixed(0);
	}
	return ms >= 10 ? ms.toFixed(1) : ms >= 1 ? ms.toFixed(2) : ms.toFixed(3);
}

/** One entry for each case, with the measure of the base build and of the new build. */
function readCases() {
	const byName = new Map();
	for (const line of readFileSync(file, 'utf8').trim().split('\n')) {
		const measure = JSON.parse(line);
		const name = `${measure.shape} ${measure.expr}`;
		const entry = byName.get(name) ?? { name };
		if (measure.variant === baseLabel) {
			entry.base = measure;
		} else if (measure.variant === newLabel) {
			entry.next = measure;
		}
		byName.set(name, entry);
	}
	return [...byName.values()];
}

const sum = (cases, side, key) => cases.reduce((total, c) => total + (c[side][key] ?? 0), 0);
const pct = (c) => (c.next.med / c.base.med - 1) * 100;
const pctOfSums = (cases, key) =>
	((sum(cases, 'next', key) / sum(cases, 'base', key) - 1) * 100).toFixed(1);
const isSlower = (c) => pct(c) > CHANGE_PCT && c.next.med - c.base.med > CHANGE_MS;
const isFaster = (c) => pct(c) < -CHANGE_PCT && c.base.med - c.next.med > CHANGE_MS;

function printChanged(title, cases) {
	console.log(`${title} (${cases.length})`);
	for (const c of cases.slice(0, top)) {
		const spread = `spread ${formatMs(c.base.medMax ?? c.base.med)} / ${formatMs(c.next.medMax ?? c.next.med)}`;
		console.log(
			`   ${c.name} | ${formatMs(c.base.med)} -> ${formatMs(c.next.med)} ms | ${pct(c).toFixed(0)}% | ${spread}`,
		);
	}
}

function printTable(cases) {
	console.log('| case | base ms | new ms | diff | same result | guest KB | host alloc KB |');
	console.log('| -- | -- | -- | -- | -- | -- | -- |');
	for (const c of cases) {
		const sign = pct(c) >= 0 ? '+' : '';
		const same = c.base.hash === c.next.hash ? 'yes' : 'NO';
		console.log(
			`| ${c.name} | ${formatMs(c.base.med)} | ${formatMs(c.next.med)} | ${sign}${pct(c).toFixed(0)}% | ${same} | ${c.base.guestKB}/${c.next.guestKB} | ${c.base.hostAllocKB}/${c.next.hostAllocKB} |`,
		);
	}
}

const all = readCases();
const ok = all.filter((c) => c.base?.ok && c.next?.ok);
if (ok.length === 0) {
	console.error(`No case has a result for both "${baseLabel}" and "${newLabel}".`);
	process.exit(1);
}

const geometricMean = Math.exp(
	ok.reduce((total, c) => total + Math.log(c.next.med / c.base.med), 0) / ok.length,
);
console.log(`${baseLabel} -> ${newLabel}: ${all.length} cases, ${ok.length} ok on both`);
console.log(
	`sum of medians: ${formatMs(sum(ok, 'base', 'med'))} -> ${formatMs(sum(ok, 'next', 'med'))} ms (${pctOfSums(ok, 'med')}%), geometric mean ratio ${geometricMean.toFixed(3)}`,
);
const differing = ok.filter((c) => c.base.hash !== c.next.hash);
console.log(`results that differ: ${differing.length}`);
for (const c of differing) {
	console.log(`   ${c.name}`);
}
for (const key of MEMORY_KEYS) {
	console.log(
		`${key}: ${sum(ok, 'base', key)} -> ${sum(ok, 'next', key)} (${pctOfSums(ok, key)}%)`,
	);
}

if (process.env.ALL) {
	printTable(ok);
} else {
	printChanged(
		'SLOWER',
		ok.filter(isSlower).sort((a, b) => pct(b) - pct(a)),
	);
	printChanged(
		'FASTER',
		ok.filter(isFaster).sort((a, b) => pct(a) - pct(b)),
	);
}

for (const c of all.filter((entry) => !ok.includes(entry))) {
	const state = (measure) => (measure?.ok ? 'ok' : (measure?.error ?? 'no result'));
	console.log(`FAILED ${c.name} | ${baseLabel}: ${state(c.base)} | ${newLabel}: ${state(c.next)}`);
}
