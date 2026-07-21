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
 * consumers, so packages already on the old shape are recorded in the baseline's
 * `dependencies` and only REPORTED. A package NOT baselined that declares a curated lib
 * in `dependencies` (a regression or fresh violation) HARD-FAILS. The baseline shrinks
 * to empty as the peer migration lands (on 3.x).
 *
 * The baseline also locks in `requiredPeers` — every package that already declares a
 * curated lib as a peerDependency. Dropping one of those peers HARD-FAILS, which is the
 * exact regression the original zod-only check guarded against, now generalized and
 * derived from the tree instead of a hardcoded package list.
 *
 *   node scripts/single-instance/check-single-instance-peers.mjs          # lint
 *   node scripts/single-instance/check-single-instance-peers.mjs --write  # regenerate the baseline
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_FILE = join(
	root,
	'scripts',
	'single-instance',
	'single-instance-peers-baseline.json',
);

/** Curated libs subject to the peer rule (pin-only libs are exempt). */
const PEER_LIBS = CURATED_LIBS.filter((l) => !PIN_ONLY_LIBS.includes(l));

function exempt(name, relDir) {
	return HOST_PACKAGES.includes(name) || FRONTEND_PATH_PREFIXES.some((p) => relDir.startsWith(p));
}

/**
 * Pure core: given a package's name, its relative dir and its manifest, return the
 * curated libs it declares in `dependencies` that ought to be peers (violations).
 */
export function violationsFor(name, relDir, pkg) {
	if (exempt(name, relDir)) return [];
	const deps = pkg.dependencies ?? {};
	return PEER_LIBS.filter((lib) => Object.hasOwn(deps, lib));
}

/** Pure core: the curated libs a package declares as peerDependencies. */
export function peersFor(name, relDir, pkg) {
	if (exempt(name, relDir)) return [];
	const peers = pkg.peerDependencies ?? {};
	return PEER_LIBS.filter((lib) => Object.hasOwn(peers, lib));
}

/**
 * Walk the workspace once, returning per-package curated state:
 * `dependencies` = libs declared as plain deps (should be peers), `requiredPeers` =
 * libs already declared as peers (locked in, so they can't be silently dropped).
 */
function collectState() {
	const dependencies = {};
	const requiredPeers = {};
	for (const { dir, pkg } of loadWorkspaceManifests(join(root, 'packages'))) {
		const name = pkg.name;
		if (!name) continue;
		const relDir = relative(root, dir);
		const deps = violationsFor(name, relDir, pkg);
		const peers = peersFor(name, relDir, pkg);
		if (deps.length > 0) dependencies[name] = deps.sort();
		if (peers.length > 0) requiredPeers[name] = peers.sort();
	}
	return { dependencies, requiredPeers };
}

function loadBaseline() {
	const empty = { dependencies: {}, requiredPeers: {} };
	if (!existsSync(BASELINE_FILE)) return empty;
	return { ...empty, ...JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) };
}

/** Pure core: split current dependency violations into baselined (report) and new (fail). */
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

/** Pure core: peers the baseline locked in that a package no longer declares (regressions). */
export function droppedPeers(currentPeers, requiredPeers) {
	const dropped = [];
	for (const [name, libs] of Object.entries(requiredPeers)) {
		const have = new Set(currentPeers[name] ?? []);
		for (const lib of libs) if (!have.has(lib)) dropped.push({ name, lib });
	}
	return dropped;
}

function sortedByKey(obj) {
	return Object.fromEntries(
		Object.keys(obj)
			.sort()
			.map((k) => [k, obj[k]]),
	);
}

function writeBaseline(state) {
	const out = {
		dependencies: sortedByKey(state.dependencies),
		requiredPeers: sortedByKey(state.requiredPeers),
	};
	writeFileSync(BASELINE_FILE, `${JSON.stringify(out, null, '\t')}\n`);
	console.log(
		`Wrote baseline (${Object.keys(out.dependencies).length} tracked deps, ${Object.keys(out.requiredPeers).length} locked peers) to ${relative(root, BASELINE_FILE)}`,
	);
}

function main() {
	if (process.argv.includes('--write')) {
		writeBaseline(collectState());
		return;
	}

	const state = collectState();
	const baseline = loadBaseline();
	const { reported, failures } = diffBaseline(state.dependencies, baseline.dependencies);
	const dropped = droppedPeers(state.requiredPeers, baseline.requiredPeers);

	if (reported.length > 0) {
		console.log('');
		console.log(
			`Known single-instance libs still declared as "dependencies" (report-only, migrate to peerDependencies on 3.x):`,
		);
		for (const { name, lib } of reported) console.log(`  - ${name}: ${lib}`);
	}

	if (failures.length > 0 || dropped.length > 0) {
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
		for (const { name, lib } of dropped) {
			console.error(
				`  - ${name}: "${lib}" was dropped from "peerDependencies"; it must stay a peer (restore it, keep it in devDependencies via catalog:).`,
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
		`OK: no un-baselined single-instance dependency-shape violations (${reported.length} tracked deps, ${Object.keys(baseline.requiredPeers).length} locked peers).`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
