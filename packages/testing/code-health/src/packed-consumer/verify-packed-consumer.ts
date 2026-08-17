import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { resolveCatalogDep } from './catalog-versions.js';
import {
	collectConsumerSpecifiers,
	isInternalSourceSpecifier,
	resolveTargetFile,
	type SpecifierUse,
} from './consumer-specifiers.js';
import { collectExportEntries, resolveSpecifier, type ExportEntry } from './exports-map.js';
import { buildFixture } from './fixture.js';
import { findGrandfathered } from './grandfathered.js';
import type { WorkspacePkg } from '../utils/pack-workspace.js';
import { closureOf, loadWorkspace, packClosure } from '../utils/pack-workspace.js';
import { parseCatalog } from '../utils/workspace-parser.js';

const DEFAULT_TARGET = '@n8n/design-system';

/**
 * The toolchain the generated consumer compiles with. Versions are not written here — each one is
 * resolved from the target package's own manifest, so the fixture tracks the catalog instead of
 * drifting from it. A name missing from the target's manifest is an error, not a default.
 */
const TOOLCHAIN = ['vue', 'vue-router', 'vue-tsc', 'typescript', 'vite', '@vitejs/plugin-vue'];

/** Sass is what compiles the SCSS passthrough; the target declares it as a plain devDependency. */
const OPTIONAL_TOOLCHAIN = ['sass'];

interface Failure {
	phase: string;
	detail: string;
}

function heading(text: string): void {
	console.log(`\n=== ${text} ===`);
}

/**
 * Read the packed manifest. A tarball whose `package.json` will not parse is itself the finding,
 * so this throws with the path rather than returning a shape the caller would read as "no exports".
 */
function readPackedManifest(packageRoot: string): {
	exports?: unknown;
	peerDependencies?: Record<string, string>;
} {
	const file = join(packageRoot, 'package.json');
	const raw = readFileSync(file, 'utf-8');
	try {
		return JSON.parse(raw) as { exports?: unknown; peerDependencies?: Record<string, string> };
	} catch (cause) {
		throw new Error(`Packed manifest ${file} is not valid JSON`, { cause });
	}
}

/** Extract a packed tarball and return the path of its `package/` root. */
function extractTarball(tarball: string, destDir: string): string {
	mkdirSync(destDir, { recursive: true });
	execFileSync('tar', ['-xzf', tarball, '-C', destDir], { stdio: ['ignore', 'ignore', 'inherit'] });
	const root = join(destDir, 'package');
	if (!existsSync(root)) throw new Error(`Tarball ${tarball} has no package/ root`);
	return root;
}

/**
 * Assert every specifier the monorepo writes for this package resolves through the published
 * `exports` map to a file that is actually in the tarball.
 *
 * This is the check that does not need a hand-written list, and the one that would have caught the
 * original rot: inside the workspace every specifier resolves through a build-time alias to `src`,
 * so a specifier missing from `exports` is invisible until the first consumer outside the
 * workspace tries it.
 */
function verifySpecifiersResolve(
	uses: SpecifierUse[],
	pkgName: string,
	packageRoot: string,
	entries: ExportEntry[],
): Failure[] {
	const failures: Failure[] = [];
	const internal: string[] = [];
	const quarantined: string[] = [];

	for (const use of uses) {
		if (isInternalSourceSpecifier(pkgName, use.specifier)) {
			internal.push(use.specifier);
			continue;
		}
		const match = resolveSpecifier(pkgName, use.specifier, entries);
		const known = findGrandfathered(use.specifier);
		if (!match) {
			if (known) {
				quarantined.push(`${known.specifier} (${use.file})\n        ${known.reason}`);
				continue;
			}
			failures.push({
				phase: 'specifiers',
				detail: `${use.specifier} — no matching key in the exports map (${use.file})`,
			});
			continue;
		}
		// A grandfathered specifier that now resolves means the underlying work landed. Failing here
		// is what stops the exception list outliving its reason and quietly excusing a future
		// regression on the same subpath.
		if (known) {
			failures.push({
				phase: 'specifiers',
				detail:
					`${use.specifier} resolves through \`exports\` now, so its grandfathered entry is ` +
					'stale — delete it from `grandfathered.ts`',
			});
			continue;
		}
		const missing = match.targets.filter((t) => resolveTargetFile(packageRoot, t.target) === null);
		if (missing.length > 0) {
			failures.push({
				phase: 'specifiers',
				detail: `${use.specifier} — exports maps it to ${missing
					.map((t) => `${t.condition}: ${t.target}`)
					.join(', ')}, absent from the tarball (${use.file})`,
			});
			continue;
		}
		console.log(`  ok  ${use.specifier} -> ${match.entry.subpath}`);
	}

	// Printed unconditionally, and not as a warning that scrolls past: an exception nobody can see
	// in the output is how this check shipped green over two real violations in the first place.
	if (quarantined.length > 0) {
		console.log(`\n  ${quarantined.length} grandfathered specifier(s) — NOT enforced:`);
		for (const entry of quarantined) console.log(`    - ${entry}`);
	}

	console.log(
		`\n  ${uses.length - internal.length - quarantined.length} published specifier(s) enforced; ` +
			`${quarantined.length} grandfathered; ` +
			`${internal.length} alias-only \`${pkgName}/src…\` specifier(s) skipped ` +
			'(deliberately outside `exports` — `files` ships `dist`).',
	);
	return failures;
}

/** Assert every non-wildcard `exports` target is a file in the tarball. */
function verifyExportTargets(packageRoot: string, entries: ExportEntry[]): Failure[] {
	const failures: Failure[] = [];
	for (const entry of entries) {
		if (entry.isWildcard) continue;
		if (entry.targets.length === 0) {
			failures.push({
				phase: 'exports',
				detail: `${entry.subpath} — no import/types/default condition, so nothing can load it`,
			});
			continue;
		}
		for (const target of entry.targets) {
			if (resolveTargetFile(packageRoot, target.target) === null) {
				failures.push({
					phase: 'exports',
					detail: `${entry.subpath} (${target.condition}) -> ${target.target} is not in the tarball`,
				});
			}
		}
	}
	return failures;
}

/**
 * Hold every peer the packed manifest declares to the exact range the generated consumer installs.
 *
 * Both ranges come from the same catalog entry — the target declares `vue` under
 * `peerDependencies` and under `devDependencies` — so equality is the invariant, and a change to
 * one without the other is the defect. npm's own peer resolution does not cover this: it accepts
 * any version inside the range, and says nothing at all about a peer the manifest stopped
 * declaring, which is the regression that would silently push the framework into the bundle.
 */
function verifyPeerRanges(packageRoot: string, toolchain: Record<string, string>): Failure[] {
	const peers = readPackedManifest(packageRoot).peerDependencies ?? {};
	if (Object.keys(peers).length === 0) {
		return [
			{
				phase: 'peers',
				detail:
					'the packed manifest declares no peerDependencies — a Vue component library that ' +
					'bundles no framework must declare the framework it needs',
			},
		];
	}

	const failures: Failure[] = [];
	for (const [name, range] of Object.entries(peers)) {
		const installedRange = toolchain[name];
		if (installedRange === undefined) {
			failures.push({
				phase: 'peers',
				detail: `${name}@${range} is a declared peer, but the consumer installs no ${name}`,
			});
			continue;
		}
		if (installedRange !== range) {
			failures.push({
				phase: 'peers',
				detail: `${name}: peerDependencies says ${range}, the consumer installs ${installedRange}`,
			});
			continue;
		}
		console.log(`  ok  ${name}@${range}`);
	}
	return failures;
}

function runStep(
	phase: string,
	command: string,
	args: string[],
	cwd: string,
	failures: Failure[],
): boolean {
	heading(phase);
	try {
		execFileSync(command, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
		return true;
	} catch {
		failures.push({ phase, detail: `\`${command} ${args.join(' ')}\` exited non-zero` });
		return false;
	}
}

function toolchainDeps(
	target: WorkspacePkg,
	catalog: ReturnType<typeof parseCatalog>,
): {
	deps: Record<string, string>;
	missing: string[];
} {
	const declared: Record<string, string> = {};
	for (const dep of target.info.deps) declared[dep.name] = dep.version;

	const deps: Record<string, string> = {};
	const missing: string[] = [];
	for (const name of TOOLCHAIN) {
		const version = resolveCatalogDep(name, declared, catalog);
		if (version === null) missing.push(name);
		else deps[name] = version;
	}
	for (const name of OPTIONAL_TOOLCHAIN) {
		const version = resolveCatalogDep(name, declared, catalog);
		if (version !== null) deps[name] = version;
	}
	return { deps, missing };
}

/**
 * Build, typecheck and load a minimal consumer against the packed tarball, outside the workspace
 * resolution graph.
 *
 * Every internal package aliases `@n8n/design-system` to `src`, so nothing in this repo has ever
 * exercised the published output. That is why it shipped broken for months without a red build.
 * This reproduces what an external consumer does — `npm install` a tarball, then compile — and
 * fails the job when that stops working.
 */
export async function runVerifyPackedConsumer(args: string[], rootDir: string): Promise<number> {
	const packageArg = args.find((a) => a.startsWith('--package='));
	const pkgName = packageArg ? packageArg.slice('--package='.length) : DEFAULT_TARGET;
	const keep = args.includes('--keep');
	// Local shortcut: the static half needs only the tarball and the git index, so it answers "did I
	// just add an unexported specifier?" in seconds. Both CI callers run the full scope; nothing
	// passes `static`, deliberately — a green check that skipped the compile is worth little.
	const staticOnly = args.includes('--static-only');

	const byName = await loadWorkspace(rootDir);
	const target = byName.get(pkgName);
	if (!target) {
		console.error(`Unknown publishable package "${pkgName}".`);
		return 2;
	}

	const work = mkdtempSync(join(tmpdir(), 'packed-consumer-'));
	// The scratch project must sit outside the workspace, or pnpm/npm would resolve the package
	// through the workspace instead of the tarball and the whole check would verify nothing.
	if (resolve(work).startsWith(`${resolve(rootDir)}/`)) {
		console.error(`Refusing to run: scratch dir ${work} is inside the workspace at ${rootDir}.`);
		return 2;
	}
	for (let dir = work; dir !== dirname(dir); dir = dirname(dir)) {
		if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
			console.error(`Refusing to run: ${dir} makes the scratch dir part of a pnpm workspace.`);
			return 2;
		}
	}

	const failures: Failure[] = [];
	const tarballDir = join(work, 'tarballs');
	const consumerDir = join(work, 'consumer');

	const toPack = closureOf([pkgName], byName);
	heading(`Packing ${toPack.length} workspace package(s)`);
	const tarballByName = packClosure(toPack, byName, tarballDir);
	console.log(toPack.map((n) => `  ${n}`).join('\n'));

	const packageRoot = extractTarball(tarballByName[pkgName], join(work, 'extracted'));
	const entries = collectExportEntries(pkgName, readPackedManifest(packageRoot).exports);
	if (entries.length === 0) {
		console.error(`FAIL: ${pkgName} publishes no usable \`exports\` map.`);
		return 1;
	}

	heading('Export targets present in the tarball');
	failures.push(...verifyExportTargets(packageRoot, entries));
	for (const entry of entries) {
		console.log(
			`  ${entry.isWildcard ? 'wildcard' : 'exact   '}  ${entry.subpath} -> ${entry.targets
				.map((t) => t.target)
				.join(', ')}`,
		);
	}

	heading('Every specifier the monorepo imports resolves through `exports`');
	// Collected once and reused below: the scan reads every tracked source file in the repo.
	const uses = collectConsumerSpecifiers(rootDir, pkgName, target.relDir);
	failures.push(...verifySpecifiersResolve(uses, pkgName, packageRoot, entries));

	// The static phases are cheap and their findings are complete on their own. Installing and
	// compiling on top of a broken exports map only buries them under a compiler error.
	if (failures.length > 0) return report(failures, work, keep);

	if (staticOnly) {
		if (!keep) rmSync(work, { recursive: true, force: true });
		console.log(
			'\nOK: the exports map covers every specifier the monorepo imports. ' +
				'Consumer build, typecheck and load not run (--static-only).',
		);
		return 0;
	}

	const catalog = parseCatalog(rootDir);
	const { deps: toolchain, missing } = toolchainDeps(target, catalog);
	if (missing.length > 0) {
		console.error(
			`\nFAIL: ${pkgName} does not declare ${missing.join(', ')}, so the generated consumer ` +
				'has no pinned toolchain to compile with.',
		);
		return report([{ phase: 'toolchain', detail: `missing: ${missing.join(', ')}` }], work, keep);
	}

	const moduleSpecifiers = entries
		.filter((e) => !e.isWildcard && e.targets.some((t) => t.kind === 'module'))
		.map((e) => e.specifier)
		.filter((s): s is string => s !== undefined);
	const cssSpecifiers = entries
		.filter((e) => !e.isWildcard && e.targets.some((t) => t.kind === 'style'))
		.map((e) => e.specifier)
		.filter((s): s is string => s !== undefined);
	const styleSpecifiers = uses
		.map((u) => u.specifier)
		.filter((s) => !isInternalSourceSpecifier(pkgName, s))
		.filter((s) => {
			const match = resolveSpecifier(pkgName, s, entries);
			return (
				match?.entry.isWildcard === true &&
				match.targets.some((t) =>
					/\.(scss|sass|css)$/.test(resolveTargetFile(packageRoot, t.target) ?? ''),
				)
			);
		});

	heading('Generating the consumer project');
	const files = buildFixture({
		packageName: pkgName,
		tarballDeps: Object.fromEntries(toPack.map((n) => [n, `file:${tarballByName[n]}`])),
		toolchainDeps: toolchain,
		moduleSpecifiers,
		styleSpecifiers,
		cssSpecifiers,
	});
	for (const [relPath, content] of Object.entries(files)) {
		const absolute = join(consumerDir, relPath);
		mkdirSync(dirname(absolute), { recursive: true });
		writeFileSync(absolute, content);
	}
	console.log(`  ${consumerDir}`);
	console.log(
		Object.keys(files)
			.map((f) => `    ${f}`)
			.join('\n'),
	);
	console.log(
		`\n  toolchain: ${Object.entries(toolchain)
			.map(([n, v]) => `${n}@${v}`)
			.join(', ')}`,
	);

	heading('Peer dependencies the tarball declares');
	failures.push(...verifyPeerRanges(packageRoot, toolchain));
	if (failures.length > 0) return report(failures, work, keep);

	// Strict peer resolution on purpose. npm satisfies a conflicting peer by nesting a second copy,
	// which is what makes the package loadable; `--legacy-peer-deps` flattens instead, and a
	// flattened tree fails at link time for reasons that belong to the flag rather than to the
	// tarball. The one stale peer range that blocks a strict install is narrowed in the fixture's
	// `overrides` instead.
	const installed = runStep(
		'npm install (outside the workspace graph)',
		'npm',
		['install', '--no-audit', '--no-fund', '--no-package-lock'],
		consumerDir,
		failures,
	);

	if (installed) {
		// All three, not the first that fails: a reader triaging this wants the whole picture, and
		// the three failure modes are independent — types, bundling, and native loading.
		runStep('Typecheck (vue-tsc)', 'npm', ['run', '--silent', 'typecheck'], consumerDir, failures);
		runStep('Build (vite)', 'npm', ['run', '--silent', 'build'], consumerDir, failures);
		runStep(
			'Load under plain Node',
			'npm',
			['run', '--silent', 'probe:runtime'],
			consumerDir,
			failures,
		);
	}

	return report(failures, work, keep);
}

function report(failures: Failure[], work: string, keep: boolean): number {
	if (failures.length === 0) {
		if (!keep) rmSync(work, { recursive: true, force: true });
		else console.log(`\nScratch kept: ${work}`);
		console.log('\nOK: the packed tarball builds, typechecks and loads in a fresh consumer.');
		return 0;
	}

	console.error(`\nFAIL: ${failures.length} problem(s) with the packed tarball:`);
	for (const failure of failures) console.error(`  [${failure.phase}] ${failure.detail}`);
	console.error(`\nScratch kept for inspection: ${work}`);
	return 1;
}
