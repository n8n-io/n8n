import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { analyze } from './collect-copies.js';
import { copiesFromLockfile } from './lock-graph.js';
import type { PackageJsonInfo } from '../utils/package-json-scanner.js';
import {
	findPackageJsonFiles,
	parsePackageJson,
	relativeDir,
} from '../utils/package-json-scanner.js';

// Repo-relative paths whose change can shift dependency resolution repo-wide (the catalog, the
// root manifest, or the single-instance tooling itself) — a scoped diff would otherwise miss them.
const ROOT_TRIGGERS = ['pnpm-workspace.yaml', 'package.json', 'packages/testing/code-health/'];

// Sections that follow the publish graph — devDependencies don't ship, so they're not packed.
const CLOSURE_SECTIONS = new Set(['dependencies', 'peerDependencies', 'optionalDependencies']);

/** True when a changed file can shift dependency resolution repo-wide, forcing a full check. */
export function filesTriggerFullRun(files: string[]): boolean {
	return files.some((f) => ROOT_TRIGGERS.some((t) => f === t || f.startsWith(t)));
}

/**
 * Surface a finding in the Actions UI. Report-only runs exit 0, and nobody opens the log of a
 * green check — without an annotation the finding is indistinguishable from silence.
 */
function annotate(message: string): void {
	if (process.env.GITHUB_ACTIONS) console.log(`::warning::${message}`);
}

/**
 * Resolve the scratch project's dependency graph and write it to `package-lock.json`.
 *
 * `--package-lock-only` reports the tree npm *would* install without fetching a single tarball.
 * The lockfile records the path of every copy, which is all this check reads — so the ~2500
 * downloads and unpacks that dominated the step buy nothing.
 *
 * This is the one network-bound step, and a registry blip must not read as a dependency finding.
 * Retries only the resolve; a persistent failure still throws.
 */
async function resolveGraphWithRetry(scratch: string, attempts = 3): Promise<void> {
	for (let attempt = 1; ; attempt++) {
		try {
			execFileSync(
				'npm',
				[
					'install',
					'--package-lock-only',
					'--no-audit',
					'--no-fund',
					// Nothing is unpacked, so no script can run — kept so that stays true if a future
					// npm resolves `file:` dependencies by preparing them.
					'--ignore-scripts',
					// Third-party deprecation notices run to ~2000 lines and bury the report this step
					// exists to print. Errors still come through.
					'--loglevel=error',
				],
				{ cwd: scratch, stdio: ['ignore', 'inherit', 'inherit'] },
			);
			return;
		} catch (error) {
			if (attempt >= attempts) throw error;
			console.error(`npm resolve failed (attempt ${attempt}/${attempts}); retrying...`);
			await setTimeout(attempt * 5_000);
		}
	}
}

/** One entry of `pnpm pack --json`. */
interface Packed {
	name: string;
	filename: string;
}

interface WorkspacePkg {
	relDir: string;
	info: PackageJsonInfo;
}

/** Every non-private workspace package: name -> { dir, relDir, info }. */
async function loadWorkspace(rootDir: string): Promise<Map<string, WorkspacePkg>> {
	const byName = new Map<string, WorkspacePkg>();
	for (const file of await findPackageJsonFiles(rootDir)) {
		const info = parsePackageJson(file);
		if (info.private) continue;
		byName.set(info.packageName, { relDir: relativeDir(rootDir, file), info });
	}
	return byName;
}

/** Package dirs as forward-slash, trailing-slash prefixes (matches git's path output on any OS). */
function packageDirPrefixes(byName: Map<string, WorkspacePkg>): Array<[string, string]> {
	return [...byName.entries()].map(([name, { relDir }]) => [name, `${relDir}/`]);
}

/**
 * Pure core: map changed file paths to the owning workspace package by longest matching dir
 * prefix. `dirs` is `[name, 'rel/dir/']` pairs; `files` are git's forward-slash paths.
 */
export function matchChangedFiles(files: string[], dirs: Array<[string, string]>): string[] {
	const hit = new Set<string>();
	for (const file of files) {
		let best: { name: string; prefix: string } | null = null;
		for (const [name, prefix] of dirs) {
			if (file.startsWith(prefix) && (!best || prefix.length > best.prefix.length)) {
				best = { name, prefix };
			}
		}
		if (best) hit.add(best.name);
	}
	return [...hit];
}

/** Map changed files (vs a git ref) to the publishable workspace packages they belong to. */
function changedPackages(
	baseRef: string,
	byName: Map<string, WorkspacePkg>,
	rootDir: string,
): string[] {
	if (!baseRef || /^0+$/.test(baseRef)) {
		console.error('No base commit (first push / force-push); skipping scoped check.');
		return [];
	}
	if (baseRef.startsWith('-')) {
		console.error(`Refusing suspicious --changed ref "${baseRef}".`);
		return [];
	}
	let out: string;
	try {
		// `--no-renames`: a moved file has to count against both the old and the new package, and
		// rename detection would also read blob contents — which the CI checkout deliberately
		// leaves on the server.
		out = execFileSync('git', ['diff', '--name-only', '--no-renames', baseRef, 'HEAD'], {
			cwd: rootDir,
			encoding: 'utf8',
		});
	} catch {
		console.error(`Could not diff against "${baseRef}"; skipping scoped check.`);
		return [];
	}
	const files = out.split('\n').filter(Boolean);
	if (filesTriggerFullRun(files)) {
		console.error('Catalog/tooling change detected; verifying all publishable packages.');
		return [...byName.keys()];
	}
	return matchChangedFiles(files, packageDirPrefixes(byName));
}

/** BFS the workspace-internal dependency closure of the given target names. */
export function closureOf(targets: string[], byName: Map<string, WorkspacePkg>): string[] {
	const seen = new Set<string>();
	const queue = [...targets];
	while (queue.length > 0) {
		const name = queue.shift();
		if (name === undefined || seen.has(name)) continue;
		const entry = byName.get(name);
		if (!entry) continue;
		seen.add(name);
		for (const dep of entry.info.deps) {
			if (CLOSURE_SECTIONS.has(dep.section) && byName.has(dep.name) && !seen.has(dep.name)) {
				queue.push(dep.name);
			}
		}
	}
	return [...seen];
}

/** Targets to verify: `null` means "nothing to do", `[]` means the args were unusable. */
export function resolveTargets(
	args: string[],
	byName: Map<string, WorkspacePkg>,
	rootDir: string,
): string[] | null {
	const changedArg = args.find((a) => a.startsWith('--changed='));
	if (args.includes('--all')) return [...byName.keys()];
	if (changedArg) {
		const targets = changedPackages(changedArg.slice('--changed='.length), byName, rootDir);
		if (targets.length === 0) {
			console.log('No changed publishable packages; nothing to verify.');
			return null;
		}
		console.log(`Changed publishable packages: ${targets.join(', ')}`);
		return targets;
	}
	return args.filter((a) => !a.startsWith('--'));
}

/**
 * Pack the named packages in one recursive pnpm run, and return name -> tarball path.
 *
 * One invocation rather than one per package: packing these tarballs is quick, so ~50 pnpm startups
 * dominate the step. `--json` reports the tarball each project produced, which also removes the
 * need to diff the destination directory — that mis-attributes a tarball whose name is already
 * present, and reads as "pack produced nothing".
 *
 * Scripts are off. The only `prepack` hook among publishable packages rebuilds `dist`, and this
 * check reads package.json out of the installed graph, so nothing here needs compiling.
 */
function packWorkspacePackages(
	names: string[],
	destination: string,
	rootDir: string,
): Record<string, string> {
	let stdout: string;
	try {
		stdout = execFileSync(
			'pnpm',
			[
				'pack',
				'--recursive',
				...names.flatMap((name) => ['--filter', name]),
				'--config.ignore-scripts=true',
				'--pack-destination',
				destination,
				'--json',
			],
			{
				cwd: rootDir,
				encoding: 'utf8',
				// The report lists every packed file, so it runs to several MB. The default 1MB cap
				// would kill pnpm mid-pack.
				maxBuffer: 256 * 1024 * 1024,
				stdio: ['ignore', 'pipe', 'inherit'],
			},
		);
	} catch (error) {
		// `--json` puts the failure on stdout, which is captured rather than inherited — print it or
		// the throw reads as a bare "Command failed" with the cause nowhere in the log.
		const captured = (error as { stdout?: string }).stdout;
		if (captured) console.error(captured);
		throw error;
	}
	// pnpm reports a bare object for a single project and an array for several.
	let packed: Packed | Packed[];
	try {
		packed = JSON.parse(stdout) as Packed | Packed[];
	} catch {
		throw new Error(`Could not read the pnpm pack report: ${stdout.slice(0, 500)}`);
	}
	const tarballByName = Object.fromEntries(
		[packed].flat().map(({ name, filename }) => [name, filename]),
	);
	const missing = names.filter((name) => !tarballByName[name]);
	if (missing.length > 0) {
		throw new Error(`pnpm pack produced no tarball for: ${missing.join(', ')}`);
	}
	return tarballByName;
}

/**
 * Reproduce the `npm install` graph for the targeted publishable packages and run the closure
 * verifier against it. Local pnpm dev and the `pnpm deploy` closure both apply root
 * `pnpm.overrides`, which hide duplication; those don't travel in published tarballs, so
 * `npm install` can resolve a second copy. Packs with `pnpm pack` (resolving `catalog:`/
 * `workspace:` like publishing does), has npm resolve the graph those tarballs produce, then
 * verifies the resolved tree.
 */
export async function runVerifyNpmInstall(args: string[], rootDir: string): Promise<number> {
	const reportOnly = args.includes('--report-only');
	const byName = await loadWorkspace(rootDir);
	const targets = resolveTargets(args, byName, rootDir);
	if (targets === null) return 0;
	if (targets.length === 0) {
		console.error(
			'Usage: verify-npm-install (--all | --changed=<ref> | <pkgName>...) [--report-only]',
		);
		return 2;
	}
	const unknown = targets.filter((t) => !byName.has(t));
	if (unknown.length > 0) {
		console.error(`Unknown publishable packages: ${unknown.join(', ')}`);
		return 2;
	}

	// Pack the targets plus every workspace package they depend on (their versions aren't on npm
	// yet, so they must resolve to local tarballs via npm `overrides`).
	const toPack = closureOf(targets, byName);
	const work = mkdtempSync(join(tmpdir(), 'single-instance-npm-verify-'));
	const tarballs = join(work, 'tarballs');
	const scratch = join(work, 'scratch');
	mkdirSync(tarballs, { recursive: true });
	mkdirSync(scratch, { recursive: true });

	// An enforcing-mode finding is the only reason to keep the resolved lockfile. A report-only run
	// exits 0 so nothing downstream reads it, and a throw (pack failure, registry outage) leaves
	// nothing worth inspecting.
	let keepScratch = false;
	try {
		console.log(`Packing ${toPack.length} workspace package(s) (targets: ${targets.length})...`);
		const tarballByName = packWorkspacePackages(toPack, tarballs, rootDir);

		// Scratch project: install targets as file: deps, force ALL packed workspace deps to their
		// local tarballs. Third-party deps resolve from the real npm registry.
		const fileDep = (n: string): [string, string] => [n, `file:${tarballByName[n]}`];
		const overrides = Object.fromEntries(toPack.map(fileDep));
		const deps = Object.fromEntries(targets.map(fileDep));
		writeFileSync(
			join(scratch, 'package.json'),
			JSON.stringify(
				{ name: 'single-instance-scratch', private: true, dependencies: deps, overrides },
				null,
				2,
			),
		);

		console.log('Resolving the npm-install graph...');
		await resolveGraphWithRetry(scratch);

		const lockfile = join(scratch, 'package-lock.json');
		const { duplicates, failures } = analyze(copiesFromLockfile(readFileSync(lockfile, 'utf8')));

		console.log(`\nnpm-install closure — lockfile: ${lockfile}\n`);
		const curatedTag = reportOnly ? 'CURATED DUP (report)' : 'FAIL';
		for (const d of duplicates) {
			const tag = d.isCurated ? (d.allowed ? 'ALLOWED DUP' : curatedTag) : 'dup (report)';
			console.log(
				`  ${d.name}: ${tag} — ${d.copies.length} copies (${d.copies.map((c) => `v${c.version}`).join(', ')})`,
			);
		}

		if (failures.length > 0) {
			keepScratch = !reportOnly;
			for (const f of failures) {
				annotate(
					`${f.name}: ${f.copies.length} copies in the npm-install graph (${f.copies.map((c) => `v${c.version}`).join(', ')})`,
				);
			}
			console.error(
				`\n${reportOnly ? 'REPORT' : 'FAIL'}: ${failures.length} curated library duplicate(s) in the npm-install graph.`,
			);
			return reportOnly ? 0 : 1;
		}
		console.log('\nOK: no curated duplicates in the npm-install graph.');
		return 0;
	} finally {
		if (keepScratch) console.log(`\nResolved lockfile kept for inspection: ${scratch}`);
		else rmSync(work, { recursive: true, force: true });
	}
}
