import { execFileSync } from 'node:child_process';
import {
	appendFileSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { analyze, collectCopies } from './collect-copies.js';
import {
	describeFailureCount,
	explainDuplicates,
	formatCopyLines,
	formatCuratedReport,
	formatRemediation,
	formatStepSummary,
} from './explain-duplicates.js';
import { isPeerRuleExempt, PUBLISHED_SECTIONS } from './libs.js';
import type { PackageJsonInfo } from '../utils/package-json-scanner.js';
import {
	findPackageJsonFiles,
	parsePackageJson,
	relativeDir,
} from '../utils/package-json-scanner.js';

// Repo-relative paths whose change can shift dependency resolution repo-wide (the catalog, the
// root manifest, or the single-instance tooling itself) — a scoped diff would otherwise miss them.
const ROOT_TRIGGERS = ['pnpm-workspace.yaml', 'package.json', 'packages/testing/code-health/'];

const CLOSURE_SECTIONS = new Set<string>(PUBLISHED_SECTIONS);

/** True when a changed file can shift dependency resolution repo-wide, forcing a full check. */
export function filesTriggerFullRun(files: string[]): boolean {
	return files.some((f) => ROOT_TRIGGERS.some((t) => f === t || f.startsWith(t)));
}

/**
 * Surface a finding in the Actions UI: `error` when the run blocks, `warning` when it is advisory.
 * An advisory run exits 0, and nobody opens the log of a green check — without the annotation the
 * finding is indistinguishable from silence.
 */
function annotate(message: string, level: 'warning' | 'error'): void {
	if (process.env.GITHUB_ACTIONS) console.log(`::${level}::${message}`);
}

/**
 * Fold a noisy section away — collapsed in Actions, a plain header locally. The npm-install log and
 * the non-curated duplicate list are ~600 lines between them, and burying the verdict in them is
 * what makes a finding read as "there was an error".
 */
function groupStart(title: string): void {
	console.log(process.env.GITHUB_ACTIONS ? `::group::${title}` : `\n--- ${title}`);
}

function groupEnd(): void {
	if (process.env.GITHUB_ACTIONS) console.log('::endgroup::');
}

/** Put the findings where they are seen without opening the log at all. */
function writeStepSummary(markdown: string): void {
	const file = process.env.GITHUB_STEP_SUMMARY;
	if (!file) return;
	try {
		appendFileSync(file, markdown);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.log(`Could not write the job summary: ${reason}`);
	}
}

function seconds(startedAt: number): string {
	return `${Math.round((Date.now() - startedAt) / 1000)}s`;
}

/**
 * The scratch install is the one network-bound step, and a registry blip must not read as a
 * dependency finding. Retries only the install; a persistent failure still throws.
 */
async function installWithRetry(scratch: string, attempts = 3): Promise<void> {
	for (let attempt = 1; ; attempt++) {
		try {
			execFileSync(
				'npm',
				['install', '--no-audit', '--no-fund', '--ignore-scripts', '--no-package-lock'],
				{ cwd: scratch, stdio: ['ignore', 'inherit', 'inherit'] },
			);
			return;
		} catch (error) {
			if (attempt >= attempts) throw error;
			console.error(`npm install failed (attempt ${attempt}/${attempts}); retrying...`);
			await setTimeout(attempt * 5_000);
		}
	}
}

/** Workspace packages the peer model exempts — the repo paths `isPeerRuleExempt` needs live here. */
function exemptPackages(byName: Map<string, WorkspacePkg>): Set<string> {
	const names = [...byName].filter(([name, { relDir }]) => isPeerRuleExempt(name, relDir));
	return new Set(names.map(([name]) => name));
}

interface WorkspacePkg {
	dir: string;
	relDir: string;
	info: PackageJsonInfo;
}

/** Every non-private workspace package: name -> { dir, relDir, info }. */
async function loadWorkspace(rootDir: string): Promise<Map<string, WorkspacePkg>> {
	const byName = new Map<string, WorkspacePkg>();
	for (const file of await findPackageJsonFiles(rootDir)) {
		const info = parsePackageJson(file);
		if (info.private) continue;
		byName.set(info.packageName, { dir: dirname(file), relDir: relativeDir(rootDir, file), info });
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
		out = execFileSync('git', ['diff', '--name-only', baseRef, 'HEAD'], {
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
		console.log(`Changed publishable packages (${targets.length}): ${targets.join(', ')}`);
		return targets;
	}
	return args.filter((a) => !a.startsWith('--'));
}

/**
 * Reproduce the `npm install` graph for the targeted publishable packages and run the closure
 * verifier against it. Local pnpm dev and the `pnpm deploy` closure both apply root
 * `pnpm.overrides`, which hide duplication; those don't travel in published tarballs, so
 * `npm install` can resolve a second copy. Packs with `pnpm pack` (resolving `catalog:`/
 * `workspace:` like publishing does), installs into a scratch dir with npm, then verifies.
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

	// An enforcing-mode finding is the only reason to keep the tree. A report-only run exits 0 so
	// nothing downstream reads it, and a throw (pack failure, registry outage) leaves nothing worth
	// inspecting — either way, keeping it just leaks a full node_modules into tmpdir per run.
	let keepScratch = false;
	try {
		const packStartedAt = Date.now();
		console.log(`Packing ${toPack.length} workspace package(s) (targets: ${targets.length})...`);
		const tarballByName: Record<string, string> = {};
		for (const name of toPack) {
			const entry = byName.get(name);
			if (!entry) continue;
			const before = new Set(readdirSync(tarballs));
			execFileSync('pnpm', ['pack', '--pack-destination', tarballs], {
				cwd: entry.dir,
				stdio: ['ignore', 'ignore', 'inherit'],
			});
			const produced = readdirSync(tarballs).find((f) => !before.has(f) && f.endsWith('.tgz'));
			if (!produced) throw new Error(`pnpm pack produced no tarball for ${name}`);
			tarballByName[name] = join(tarballs, produced);
		}

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

		console.log(`Packed in ${seconds(packStartedAt)}. Installing into scratch dir with npm...`);
		const installStartedAt = Date.now();
		// npm prints hundreds of ERESOLVE warnings here; they matter only when the install itself
		// fails, so they are folded away rather than dropped. Actions cannot un-collapse a group
		// after the fact, so a failure points back at it instead.
		groupStart('npm install output');
		try {
			await installWithRetry(scratch);
		} catch (error) {
			groupEnd();
			console.log('npm install failed — its output is in the "npm install output" group above.');
			throw error;
		}
		groupEnd();
		console.log(`Installed in ${seconds(installStartedAt)}.`);

		const found = collectCopies(scratch);
		const { duplicates, failures } = analyze(found);
		const workspaceNames = new Set(byName.keys());
		const curatedDuplicates = duplicates.filter((d) => d.isCurated);
		const attributed = explainDuplicates(scratch, curatedDuplicates, workspaceNames);
		const explained = attributed.filter((dup) => failures.some((f) => f.name === dup.name));

		const nonCurated = duplicates.filter((d) => !d.isCurated);
		if (nonCurated.length > 0) {
			groupStart(`Other duplicated packages (report-only, NOT enforced — ${nonCurated.length})`);
			for (const d of nonCurated) {
				console.log(
					`  ${d.name}: ${d.copies.length} copies (${d.copies.map((c) => `v${c.version}`).join(', ')})`,
				);
			}
			groupEnd();
		}

		const attributedCopies = new Map(attributed.map((dup) => [dup.name, dup.copies]));
		console.log(
			`\nCurated single-instance libraries — npm-install closure of ${targets.length} target(s):\n`,
		);
		// Unattributed copies fall back to raw paths rather than rendering a "N copies" header with
		// nothing under it.
		for (const line of formatCuratedReport(found, duplicates, (dup) => {
			const copies = attributedCopies.get(dup.name);
			return copies
				? formatCopyLines(copies)
				: dup.copies.map((c) => `      v${c.version}  ${c.realPath}`);
		})) {
			console.log(line);
		}

		if (failures.length > 0) {
			keepScratch = !reportOnly;
			const scratchHint = keepScratch ? scratch : undefined;
			const remediationOptions = { exemptPackages: exemptPackages(byName), scratch: scratchHint };
			console.log('\nHow to fix\n');
			for (const line of formatRemediation(explained, remediationOptions)) console.log(line);
			writeStepSummary(formatStepSummary(explained, { reportOnly, ...remediationOptions }));
			for (const f of failures) {
				annotate(
					`${f.name}: ${f.copies.length} copies in the npm-install graph (${f.copies.map((c) => `v${c.version}`).join(', ')})`,
					reportOnly ? 'warning' : 'error',
				);
			}
			// stdout, not stderr: the two streams interleave in the Actions log, which is how the
			// verdict ended up printed in the middle of the duplicate list.
			console.log(
				`\n${reportOnly ? 'REPORT' : 'FAIL'}: ${describeFailureCount(failures.length)}: ${failures.map((f) => f.name).join(', ')}${reportOnly ? ' (advisory — this job does not block yet)' : ''}`,
			);
			return reportOnly ? 0 : 1;
		}
		console.log('\nOK: no curated duplicates in the npm-install graph.');
		return 0;
	} finally {
		// The kept tree is already pointed at from the remediation block, which is the only path
		// that keeps one.
		if (!keepScratch) rmSync(work, { recursive: true, force: true });
	}
}
