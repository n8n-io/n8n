#!/usr/bin/env node
/**
 * Counts how many packages downgrade each rule, so the shared layers are built
 * from the tree rather than from an impression of it.
 *
 * A rule that most packages switch off is not a standard; it is a rule the repo
 * has already stopped enforcing, one config at a time. Those belong in the
 * shared layer as `off`, where the decision is visible and reversible. The rest
 * stay on, and the packages that cannot pass them keep a local, marked `off`.
 *
 * `--threshold N` (default 10) is the count at which a rule moves into `base`.
 * `--layer <name>` restricts the report to one layer.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readConfigBlocks } from './config-blocks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const layers = JSON.parse(readFileSync(join(here, 'layers.json'), 'utf8'));

const arg = (name, fallback) => {
	const i = process.argv.indexOf(name);
	return i === -1 ? fallback : process.argv[i + 1];
};
const threshold = Number(arg('--threshold', 10));
const onlyLayer = arg('--layer', undefined);

const layerOf = new Map();
for (const [layer, pkgs] of Object.entries(layers)) {
	if (layer.startsWith('_')) continue;
	for (const pkg of pkgs) layerOf.set(pkg, layer);
}

/** rule -> { down:Set<pkg>, on:Set<pkg>, wide:Set<pkg>, scoped:Set<pkg>, opts:Set<pkg> } */
const stats = new Map();
const get = (id) => {
	if (!stats.has(id)) {
		stats.set(id, {
			down: new Set(),
			on: new Set(),
			wide: new Set(),
			scoped: new Set(),
			opts: new Set(),
		});
	}
	return stats.get(id);
};

for (const [pkg, layer] of layerOf) {
	if (layer === 'exempt') continue;
	if (onlyLayer && layer !== onlyLayer) continue;
	for (const block of readConfigBlocks(join(root, pkg, 'eslint.config.mjs'))) {
		for (const rule of block.rules) {
			const s = get(rule.id);
			(rule.severity === 'error' ? s.on : s.down).add(pkg);
			(block.scoped ? s.scoped : s.wide).add(pkg);
			if (rule.hasOptions) s.opts.add(pkg);
		}
	}
}

const rows = [...stats.entries()]
	.map(([id, s]) => ({
		id,
		down: s.down.size,
		on: s.on.size,
		wide: [...s.wide].filter((p) => s.down.has(p)).length,
		opts: s.opts.size,
		layers: new Set([...s.down].map((p) => layerOf.get(p))),
	}))
	.filter((r) => r.down > 0)
	.sort((a, b) => b.down - a.down || a.id.localeCompare(b.id));

const w = (s, n) => String(s).padEnd(n);
console.log(`threshold: a rule downgraded in >= ${threshold} packages moves into base as "off"\n`);
console.log(w('down', 6), w('on', 4), w('wide', 6), w('opts', 6), w('layers', 26), 'rule');
for (const r of rows) {
	const verdict = r.down >= threshold ? '  <= BASE OFF' : '';
	console.log(
		w(r.down, 6),
		w(r.on, 4),
		w(r.wide, 6),
		w(r.opts, 6),
		w([...r.layers].sort().join(','), 26),
		r.id + verdict,
	);
}

const cut = rows.filter((r) => r.down >= threshold);
console.log(`\n${cut.length} rule(s) at or above the threshold:`);
for (const r of cut) console.log(`  ${r.id}  (down ${r.down}, still on in ${r.on})`);
console.log(
	`\n${rows.length - cut.length} rule(s) below it stay on and become local debt where downgraded.`,
);

// rules that ONLY ever appear downgraded, anywhere: candidates for deletion
const neverOn = rows.filter((r) => r.on === 0 && r.down >= 2);
if (neverOn.length) {
	console.log(`\nnever enabled in any package (${neverOn.length}):`);
	for (const r of neverOn) console.log(`  ${r.id} (down ${r.down})`);
}
