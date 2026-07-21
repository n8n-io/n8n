#!/usr/bin/env node

/**
 * Guards the dependency SHAPE of single-instance-sensitive libraries.
 *
 * A curated lib (except the pin-only ones, e.g. reflect-metadata) composed across
 * package boundaries must be a **peerDependency** in every non-host, non-frontend
 * workspace package that uses it — never a plain `dependency`. In the pnpm monorepo
 * the catalog forces one instance so `dependencies` looks fine locally, but on
 * `npm install n8n` a plain dependency lets npm install a second nested copy, which
 * breaks cross-package schema composition / `instanceof` and crashes at boot. This
 * exact regression shipped in 2.28.0 (#32386 moved zod peer→dependencies).
 *
 * Report-first rollout (no breaking changes on master): moving a published package's
 * curated lib from `dependencies` to `peerDependencies` is breaking for external
 * consumers, so the already-on-the-old-shape packages are recorded in a baseline and
 * only REPORTED. A package NOT in the baseline that declares a curated lib in
 * `dependencies` (a regression, or a fresh violation) HARD-FAILS. Packages already on
 * the peer model are absent from the baseline, so moving one back to `dependencies`
 * fails immediately — preserving the original guard. The baseline shrinks to empty as
 * the peer migration lands (on 3.x).
 *
 *   node scripts/check-single-instance-peers.mjs          # lint
 *   node scripts/check-single-instance-peers.mjs --write  # regenerate the baseline
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	CURATED_LIBS,
	PIN_ONLY_LIBS,
	HOST_PACKAGES,
	FRONTEND_PATH_PREFIXES,
} from './single-instance-libs.mjs';
import { loadWorkspaceManifests } from './workspace-manifests.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_FILE = join(root, 'scripts', 'single-instance-peers-baseline.json');

/** Curated libs subject to the peer rule (pin-only libs are exempt). */
const PEER_LIBS = CURATED_LIBS.filter((l) => !PIN_ONLY_LIBS.includes(l));

/**
 * Pure core: given a package's name, its relative dir and its manifest, return the
 * curated libs it declares in `dependencies` that ought to be peers (violations).
 */
export function violationsFor(name, relDir, pkg) {
	if (HOST_PACKAGES.includes(name)) return [];
	if (FRONTEND_PATH_PREFIXES.some((prefix) => relDir.startsWith(prefix))) return [];
	const deps = pkg.dependencies ?? {};
	return PEER_LIBS.filter((lib) => Object.hasOwn(deps, lib));
}

function collectViolations() {
	const found = {}; // pkgName -> sorted lib[]
	for (const { dir, pkg } of loadWorkspaceManifests(join(root, 'packages'))) {
		const name = pkg.name;
		if (!name) continue;
		const relDir = relative(root, dir);
		const libs = violationsFor(name, relDir, pkg);
		if (libs.length > 0) found[name] = libs.sort();
	}
	return found;
}

function loadBaseline() {
	if (!existsSync(BASELINE_FILE)) return {};
	return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
}

/** Pure core: split current violations into baselined (report) and new (fail). */
export function diffBaseline(current, baseline) {
	const reported = [];
	const failures = [];
	for (const [name, libs] of Object.entries(current)) {
		const allowed = new Set(baseline[name] ?? []);
		for (const lib of libs) {
			(allowed.has(lib) ? reported : failures).push({ name, lib });
		}
	}
	return { reported, failures };
}

function writeBaseline(current) {
	const sorted = Object.fromEntries(
		Object.keys(current)
			.sort()
			.map((k) => [k, current[k]]),
	);
	writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, '\t')}\n`);
	console.log(
		`Wrote baseline with ${Object.keys(sorted).length} package(s) to ${relative(root, BASELINE_FILE)}`,
	);
}

function main() {
	if (process.argv.includes('--write')) {
		writeBaseline(collectViolations());
		return;
	}

	const current = collectViolations();
	const { reported, failures } = diffBaseline(current, loadBaseline());

	if (reported.length > 0) {
		console.log('');
		console.log(
			`Known single-instance libs still declared as "dependencies" (report-only, migrate to peerDependencies on 3.x):`,
		);
		for (const { name, lib } of reported) console.log(`  - ${name}: ${lib}`);
	}

	if (failures.length > 0) {
		console.error('');
		console.error('ERROR: single-instance libraries must be peerDependencies, not dependencies.');
		console.error('');
		console.error(
			'A plain dependency lets `npm install` create a second physical copy, which breaks',
		);
		console.error(
			'cross-package composition / instanceof and crashes at boot (regressed in 2.28.0).',
		);
		console.error('');
		for (const { name, lib } of failures) {
			console.error(
				`  - ${name}: "${lib}" is in "dependencies"; move it to "peerDependencies" (+ devDependencies via catalog:).`,
			);
		}
		console.error('');
		console.error(
			'If this is an intentional, already-tracked case, it must be in the baseline; run --write only when adding a NEW sanctioned exception (not to silence a regression).',
		);
		console.error('');
		process.exit(1);
	}

	console.log('');
	console.log(
		`OK: no un-baselined single-instance dependency-shape violations (${reported.length} tracked).`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
