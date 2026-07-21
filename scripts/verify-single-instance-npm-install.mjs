#!/usr/bin/env node

/**
 * Reproduces the `npm install` graph for publishable packages and runs the closure
 * verifier against it.
 *
 * Local pnpm dev and the `pnpm deploy` closure both apply root `pnpm.overrides`,
 * which force a single copy of curated libs and hide duplication. Those overrides do
 * NOT travel in published tarballs, so `npm install n8n` can resolve a second copy —
 * exactly how the historical zod regression broke npm but not Docker. This check
 * packs the workspace packages with `pnpm pack` (which resolves `catalog:`/`workspace:`
 * specifiers the same way publishing does), installs them into a scratch dir with
 * npm (no overrides, no workspace), and verifies no curated library duplicates.
 *
 *   node scripts/verify-single-instance-npm-install.mjs --all
 *   node scripts/verify-single-instance-npm-install.mjs @n8n/permissions @n8n/db
 *
 * With explicit names it runs the fast, scoped check (merge-to-master, changed
 * packages); `--all` runs the full check (release prep).
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { collectCopies, analyze } from './verify-single-instance-deps.mjs';
import { loadWorkspaceManifests } from './workspace-manifests.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every non-private workspace package: name -> { dir, pkg }. */
function loadWorkspace() {
	const byName = new Map();
	for (const { dir, pkg } of loadWorkspaceManifests(join(root, 'packages'))) {
		if (pkg.name && !pkg.private) byName.set(pkg.name, { dir, pkg });
	}
	return byName;
}

/** Map changed files (vs a git ref) to the publishable workspace packages they belong to. */
function changedPackages(baseRef, byName) {
	let out;
	try {
		out = execFileSync('git', ['diff', '--name-only', `${baseRef}`, 'HEAD'], {
			cwd: root,
			encoding: 'utf8',
		});
	} catch {
		console.error(`Could not diff against "${baseRef}"; skipping scoped check.`);
		return [];
	}
	const dirs = [...byName.entries()].map(([name, { dir }]) => [name, `${relative(root, dir)}/`]);
	const hit = new Set();
	for (const file of out.split('\n').filter(Boolean)) {
		let best = null;
		for (const [name, prefix] of dirs) {
			if (file.startsWith(prefix) && (!best || prefix.length > best.prefix.length))
				best = { name, prefix };
		}
		if (best) hit.add(best.name);
	}
	return [...hit];
}

/** BFS the workspace-internal dependency closure of the given target names. */
function closureOf(targets, byName) {
	const seen = new Set();
	const queue = [...targets];
	while (queue.length > 0) {
		const name = queue.shift();
		if (seen.has(name) || !byName.has(name)) continue;
		seen.add(name);
		const { pkg } = byName.get(name);
		for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
			for (const dep of Object.keys(pkg[field] ?? {})) {
				if (byName.has(dep) && !seen.has(dep)) queue.push(dep);
			}
		}
	}
	return [...seen];
}

function main() {
	const args = process.argv.slice(2);
	const byName = loadWorkspace();

	const changedArg = args.find((a) => a.startsWith('--changed='));
	let targets;
	if (args.includes('--all')) {
		targets = [...byName.keys()];
	} else if (changedArg) {
		targets = changedPackages(changedArg.slice('--changed='.length), byName);
		if (targets.length === 0) {
			console.log('No changed publishable packages; nothing to verify.');
			return;
		}
		console.log(`Changed publishable packages: ${targets.join(', ')}`);
	} else {
		targets = args.filter((a) => !a.startsWith('--'));
	}
	if (targets.length === 0) {
		console.error(
			'Usage: verify-single-instance-npm-install.mjs (--all | --changed=<ref> | <pkgName>...)',
		);
		process.exit(2);
	}
	const unknown = targets.filter((t) => !byName.has(t));
	if (unknown.length > 0) {
		console.error(`Unknown publishable packages: ${unknown.join(', ')}`);
		process.exit(2);
	}

	// Pack the targets plus every workspace package they depend on (their versions
	// aren't on npm yet, so they must resolve to local tarballs via npm `overrides`).
	const toPack = closureOf(targets, byName);
	const work = mkdtempSync(join(tmpdir(), 'n8n-npm-install-verify-'));
	const tarballs = join(work, 'tarballs');
	const scratch = join(work, 'scratch');
	mkdirSync(tarballs, { recursive: true });
	mkdirSync(scratch, { recursive: true });

	console.log(`Packing ${toPack.length} workspace package(s) (targets: ${targets.length})...`);
	const tarballByName = {};
	for (const name of toPack) {
		const before = new Set(readdirSync(tarballs));
		execFileSync('pnpm', ['pack', '--pack-destination', tarballs], {
			cwd: byName.get(name).dir,
			stdio: ['ignore', 'ignore', 'inherit'],
		});
		const produced = readdirSync(tarballs).find((f) => !before.has(f) && f.endsWith('.tgz'));
		if (!produced) throw new Error(`pnpm pack produced no tarball for ${name}`);
		tarballByName[name] = join(tarballs, produced);
	}

	// Scratch project: install targets as file: deps, force ALL packed workspace deps
	// to their local tarballs. Third-party deps resolve from the real npm registry.
	const overrides = Object.fromEntries(toPack.map((n) => [n, `file:${tarballByName[n]}`]));
	const deps = Object.fromEntries(targets.map((n) => [n, `file:${tarballByName[n]}`]));
	writeFileSync(
		join(scratch, 'package.json'),
		JSON.stringify(
			{ name: 'single-instance-scratch', private: true, dependencies: deps, overrides },
			null,
			2,
		),
	);

	console.log('Installing into scratch dir with npm...');
	execFileSync(
		'npm',
		['install', '--no-audit', '--no-fund', '--ignore-scripts', '--no-package-lock'],
		{
			cwd: scratch,
			stdio: ['ignore', 'inherit', 'inherit'],
		},
	);

	const { duplicates, failures } = analyze(collectCopies(scratch));

	console.log(`\nnpm-install closure — scratch: ${relative(root, scratch) || scratch}\n`);
	for (const d of duplicates) {
		const tag = d.isCurated ? (d.allowed ? 'ALLOWED DUP' : 'FAIL') : 'dup (report)';
		console.log(
			`  ${d.name}: ${tag} — ${d.copies.length} copies (${d.copies.map((c) => `v${c.version}`).join(', ')})`,
		);
	}

	if (failures.length === 0) rmSync(work, { recursive: true, force: true });
	else console.log(`\nScratch install kept for inspection: ${scratch}`);

	if (failures.length > 0) {
		console.error(
			`\nFAIL: ${failures.length} curated library duplicate(s) in the npm-install graph.`,
		);
		process.exit(1);
	}
	console.log('\nOK: no curated duplicates in the npm-install graph.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
