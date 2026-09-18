#!/usr/bin/env node
/**
 * Picks the files that `snapshot.mjs` asks ESLint about, and writes them to
 * `samples.json`.
 *
 * The sample list is committed and generated ONCE, from the pre-change tree, so
 * the before/after snapshots are taken over identical inputs. Regenerating it
 * mid-refactor invalidates the comparison.
 *
 * Per package we take one file of each shape that can resolve to a different
 * config (source, unit test, `__tests__`, `.vue`, story, and for the nodes
 * packages a credential and a node), plus one real file for every `files:` glob
 * literal found in the package's own config. That last part is what covers the
 * ratchet blocks — a scoped `off` in cli or editor-ui is invisible otherwise.
 *
 * `samples.json` is formatted by `pnpm format`, so run that after regenerating
 * it or the next person's format run shows up as an unrelated diff.
 *
 * ponytail: globs are read out of the config text with a regex, not by
 * executing the config, so a glob built at runtime from a variable is missed.
 * None exist today; `majority.mjs` walks the real objects and would surface one.
 */
import { globSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const IGNORE = ['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/coverage/**'];

const configs = globSync('packages/**/eslint.config.mjs', { cwd: root, exclude: IGNORE })
	.filter((p) => !p.includes('/template'))
	.sort();

const isFile = (pkgDir, p) => {
	try {
		return statSync(join(root, pkgDir, p)).isFile();
	} catch {
		return false;
	}
};

/** First lintable file matching a glob inside a package, or undefined. */
function pick(pkgDir, pattern) {
	const opts = { cwd: join(root, pkgDir), exclude: IGNORE };
	const hits = globSync(pattern, opts).sort();
	const file = hits.find((p) => LINTABLE.test(p) && isFile(pkgDir, p));
	if (file) return file;
	// `src/foo/**` also matches the directory itself, so look inside it
	for (const hit of hits) {
		if (isFile(pkgDir, hit)) continue;
		const nested = globSync(join(hit, '**/*'), opts)
			.sort()
			.find((p) => LINTABLE.test(p) && isFile(pkgDir, p));
		if (nested) return nested;
	}
	return undefined;
}

const LINTABLE = /\.(?:[cm]?tsx?|vue|[cm]?jsx?)$/;

const TEST_MARKER = /(^|\/)(test|tests|__tests__|__test__)(\/|$)|\.(test|spec|cy)\.[cm]?tsx?$/;

const SHAPES = [
	// a plain source file: the one that matters most
	['src/**/*.ts', (f) => !TEST_MARKER.test(f)],
	['**/*.test.ts', null],
	['**/__tests__/**/*.ts', null],
	['**/*.vue', null],
	['**/*.stories.ts', null],
	// the two nodes packages keep their rules in these trees, not in src/
	['credentials/*.ts', null],
	['nodes/**/*.node.ts', null],
];

const samples = {};

for (const config of configs) {
	const pkgDir = dirname(config);
	const files = new Set();

	for (const [pattern, extra] of SHAPES) {
		const hits = globSync(pattern, { cwd: join(root, pkgDir), exclude: IGNORE })
			.sort()
			.filter((p) => LINTABLE.test(p) && isFile(pkgDir, p));
		const hit = extra ? hits.find(extra) : hits[0];
		if (hit) files.add(hit);
	}

	// one real file per `files:` glob literal in this package's config
	const text = readFileSync(join(root, config), 'utf8');
	for (const block of text.matchAll(/files:\s*\[([^\]]*)\]/g)) {
		for (const literal of block[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
			const glob = (literal[1] ?? literal[2]).replace(/^\.\//, '');
			const hit = pick(pkgDir, glob);
			if (hit) files.add(hit);
		}
	}

	if (files.size === 0) continue;
	samples[pkgDir] = [...files].sort();
}

const out = join(here, 'samples.json');
writeFileSync(out, JSON.stringify(samples, null, '\t') + '\n');
const total = Object.values(samples).reduce((n, f) => n + f.length, 0);
console.log(`${relative(root, out)}: ${Object.keys(samples).length} packages, ${total} files`);
