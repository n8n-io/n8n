import { readFileSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { Copy, DuplicateGroup } from './collect-copies.js';
import { distinctCopies } from './collect-copies.js';
import { CURATED_LIBS, PEER_LIBS, PUBLISHED_SECTIONS } from './libs.js';

/** A manifest section a copy can be declared in. */
type Section = (typeof PUBLISHED_SECTIONS)[number];

export interface AttributedCopy {
	version: string;
	/** Path within the install tree — the nesting chain itself reads as the cause. */
	path: string;
	/** Nearest enclosing package that declares the lib; `null` when the path does not name one. */
	requiredBy: string | null;
	/** Range `requiredBy` declares, when it declares one directly. */
	range: string | null;
	/**
	 * Section the range came from. Which one decides the fix: a package that already declares the
	 * library as a peer has nothing to move, so the split is a version conflict, not a wrong shape.
	 */
	section: Section | null;
	/** `requiredBy` is a package in this repo, so the fix is a manifest change here. */
	isWorkspace: boolean;
	/** Copy lives in a pnpm virtual store, whose nesting names no requirer. */
	inPnpmStore: boolean;
}

function toPosix(p: string): string {
	return sep === '/' ? p : p.split(sep).join('/');
}

function resolveRealPath(p: string): string {
	try {
		return realpathSync(p);
	} catch {
		return p;
	}
}

/**
 * Split an install-tree-relative copy path into the chain of package names it is nested in,
 * outermost first, with the copy itself last:
 * `node_modules/a/node_modules/zod` -> `['a', 'zod']`.
 */
function packageChain(relPath: string): string[] {
	return toPosix(relPath)
		.replace(/^node_modules\//, '')
		.split('/node_modules/');
}

type Manifest = Record<string, Record<string, string> | undefined>;

function isManifest(value: unknown): value is Manifest {
	return typeof value === 'object' && value !== null;
}

interface Declaration {
	section: Section;
	range: string;
}

function readDeclaration(dir: string, lib: string): Declaration | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
	} catch {
		return null;
	}
	if (!isManifest(parsed)) return null;
	for (const section of PUBLISHED_SECTIONS) {
		const range = parsed[section]?.[lib];
		if (typeof range === 'string' && range) return { section, range };
	}
	return null;
}

/**
 * Explain where a physical copy came from. npm nests a copy inside the package that forced it, so
 * the nearest enclosing package that declares the lib is the one to fix — that attribution is the
 * difference between "zod has 5 copies" and "this dependency pins an incompatible range".
 *
 * Nesting only carries that meaning in an `npm install` tree. A pnpm virtual store nests every
 * package under a `<name>@<version>` store key instead, so the path names no requirer and this
 * reports the copy as unattributed rather than presenting a store directory as one.
 */
export function attributeCopy(
	root: string,
	lib: string,
	copy: Copy,
	workspaceNames: Set<string>,
): AttributedCopy {
	// `collectCopies` records realpaths, so the root has to be resolved too — otherwise a symlinked
	// tmpdir (every macOS `/var` path) makes the install path relative to nothing useful.
	const resolvedRoot = resolveRealPath(root);
	const path = toPosix(relative(resolvedRoot, resolveRealPath(copy.realPath)));
	const chain = packageChain(path);
	const inPnpmStore = path.startsWith('node_modules/.pnpm/');
	const ancestors = inPnpmStore ? [] : chain.slice(0, -1);
	const base = { version: copy.version, path, inPnpmStore };

	let dir = resolvedRoot;
	const ancestorDirs = ancestors.map((name) => (dir = join(dir, 'node_modules', name)));

	// Nearest ancestor first: the innermost declaration is the one that forced this copy.
	for (let i = ancestorDirs.length - 1; i >= 0; i--) {
		const declared = readDeclaration(ancestorDirs[i], lib);
		if (declared) {
			const requiredBy = ancestors[i];
			return {
				...base,
				requiredBy,
				...declared,
				isWorkspace: workspaceNames.has(requiredBy),
			};
		}
	}

	// Nested with no declaring ancestor (npm nesting for a deeper conflict), the hoisted copy, or a
	// tree shape whose nesting names no requirer.
	const nearest = ancestors.at(-1) ?? null;
	return {
		...base,
		requiredBy: nearest,
		range: null,
		section: null,
		isWorkspace: nearest !== null && workspaceNames.has(nearest),
	};
}

export interface ExplainedDuplicate {
	name: string;
	copies: AttributedCopy[];
}

export function explainDuplicates(
	root: string,
	groups: DuplicateGroup[],
	workspaceNames: Set<string>,
): ExplainedDuplicate[] {
	return groups.map((group) => ({
		name: group.name,
		copies: group.copies
			.map((copy) => attributeCopy(root, group.name, copy, workspaceNames))
			// Hoisted copy first — it is the version npm picked, so every nested copy below it reads
			// as "and this package refused that one".
			.sort(
				(a, b) => Number(!isHoisted(a)) - Number(!isHoisted(b)) || a.path.localeCompare(b.path),
			),
	}));
}

function isHoisted(copy: AttributedCopy): boolean {
	return copy.requiredBy === null && !copy.inPnpmStore;
}

/** One-line origin for a copy, e.g. `required by @langchain/community ("~0.1.29")`. */
export function describeOrigin(copy: AttributedCopy): string {
	if (copy.inPnpmStore) return 'in the pnpm virtual store (requirer not derivable from the path)';
	if (copy.requiredBy === null) return 'hoisted at the top level';
	const marker = copy.isWorkspace ? ' [workspace package]' : '';
	return copy.range === null
		? `nested under ${copy.requiredBy} (no direct declaration)${marker}`
		: `required by ${copy.requiredBy} (${copy.section} "${copy.range}")${marker}`;
}

/** One indented block per physical copy: version, what pulled it in, and where it landed. */
export function formatCopyLines(copies: AttributedCopy[]): string[] {
	return copies.flatMap((copy) => [
		`      v${copy.version}  ${describeOrigin(copy)}`,
		`        ${copy.path}`,
	]);
}

/**
 * Per-curated-library verdict, in `CURATED_LIBS` order: the enforced list every run prints,
 * whatever closure it inspected. `renderCopies` is the caller's detail for a failing library — an
 * npm-install run can name the requirer of each copy, a pnpm-shaped closure can only list paths.
 */
export function formatCuratedReport(
	found: Map<string, Copy[]>,
	duplicates: DuplicateGroup[],
	renderCopies: (dup: DuplicateGroup) => string[],
): string[] {
	const byName = new Map(duplicates.map((d) => [d.name, d]));
	return CURATED_LIBS.flatMap((lib) => {
		const dup = byName.get(lib);
		if (!dup) {
			const copies = distinctCopies(found.get(lib) ?? []);
			return [
				`  ${lib}: ${copies.length === 0 ? 'not present' : `OK (1 copy, v${copies[0].version})`}`,
			];
		}
		if (dup.allowed) {
			return [
				`  ${lib}: ALLOWED DUP — ${dup.copies.length} physical copies:`,
				...renderCopies(dup),
				`      allowlisted: ${dup.reason}`,
			];
		}
		return [`  ${lib}: FAIL — ${dup.copies.length} copies, expected 1:`, ...renderCopies(dup)];
	});
}

/** The verdict sentence, shared so both commands phrase a finding identically. */
export function describeFailureCount(count: number): string {
	return count === 1
		? '1 curated library resolves to more than one physical copy'
		: `${count} curated libraries each resolve to more than one physical copy`;
}

const LIBS_FILE = 'packages/testing/code-health/src/single-instance/libs.ts';
const ALLOWLIST_FILE = 'packages/testing/code-health/src/single-instance/collect-copies.ts';

interface Requirer {
	lib: string;
	requiredBy: string;
	range: string | null;
	section: Section | null;
	isWorkspace: boolean;
}

function describeRequirer({ lib, requiredBy, range, section }: Requirer): string {
	return `     - ${lib} <- ${requiredBy}${range === null ? '' : ` (${section} "${range}")`}`;
}

/** Which remediation a requirer needs. One bucket per fix, so every copy is accounted for. */
type Bucket = 'peerMove' | 'peerConflict' | 'workspaceExempt' | 'thirdParty' | 'indirect';

function bucketFor(requirer: Requirer, exemptPackages: Set<string>): Bucket {
	// No declared range means the requirer of record does not ask for the lib itself — something
	// deeper in its own graph does, and none of the manifest fixes below apply to it.
	if (requirer.range === null) return 'indirect';
	if (!requirer.isWorkspace) return 'thirdParty';
	// Already a peer: the shape the peer rule asks for. Nothing to move — the copy exists because
	// the graph resolved a version outside this range, which is a pin problem elsewhere.
	if (requirer.section === 'peerDependencies') return 'peerConflict';
	// A lib the peer rule does not cover (pin-only, e.g. reflect-metadata) or a package it exempts
	// is legitimately allowed its own dependency; only a version split is left to fix.
	return PEER_LIBS.includes(requirer.lib) && !exemptPackages.has(requirer.requiredBy)
		? 'peerMove'
		: 'workspaceExempt';
}

/**
 * Remediation steps, ordered by what the findings actually show. `exemptPackages` are the workspace
 * packages `isPeerRuleExempt` covers — telling their owner to move a curated lib to
 * `peerDependencies` would send them into a change that rule then rejects.
 */
export function formatRemediation(
	explained: ExplainedDuplicate[],
	{ exemptPackages, scratch }: { exemptPackages: Set<string>; scratch?: string },
): string[] {
	// Keyed, not per copy: npm installs the same requirer at several nesting depths, and the fix is
	// one manifest edit however many copies it produced.
	const requirers = new Map<string, Requirer>();
	for (const dup of explained) {
		for (const { requiredBy, range, section, isWorkspace } of dup.copies) {
			if (requiredBy === null) continue;
			requirers.set(`${dup.name}|${requiredBy}|${section}|${range}`, {
				lib: dup.name,
				requiredBy,
				range,
				section,
				isWorkspace,
			});
		}
	}
	const inBucket = (bucket: Bucket): Requirer[] =>
		[...requirers.values()].filter((r) => bucketFor(r, exemptPackages) === bucket);
	const peerMove = inBucket('peerMove');
	const peerConflict = inBucket('peerConflict');
	const workspaceExempt = inBucket('workspaceExempt');
	const thirdParty = inBucket('thirdParty');
	const indirect = inBucket('indirect');

	const lines = [
		'  A curated library must resolve to ONE physical copy per process — a second copy breaks',
		`  instanceof, module singletons and cross-package schema composition (${LIBS_FILE}).`,
		'',
	];
	let step = 0;
	if (peerMove.length > 0) {
		lines.push(
			`  ${++step}. Our own packages declaring the library as a runtime dependency:`,
			...peerMove.map(describeRequirer),
			'     Move it to "peerDependencies" with "catalog:" in that package.json, and keep it in',
			'     devDependencies (also "catalog:") so local builds still resolve it.',
			'',
		);
	}
	if (peerConflict.length > 0) {
		lines.push(
			`  ${++step}. Our own packages that already declare the library as a peer:`,
			...peerConflict.map(describeRequirer),
			'     Nothing to move — this copy exists because something else in the graph resolved a',
			'     version outside that range. Align the "catalog:" pin, or fix the requirer that forced',
			'     the other version (it is listed under one of the other steps).',
			'',
		);
	}
	if (workspaceExempt.length > 0) {
		lines.push(
			`  ${++step}. Our own packages that legitimately own a copy (host package, or a library the`,
			'     peer rule does not cover):',
			...workspaceExempt.map(describeRequirer),
			'     A peer move is not the fix here — align the declared version with "catalog:" so this',
			'     copy and the rest of the graph resolve to the same one.',
			'',
		);
	}
	if (thirdParty.length > 0) {
		lines.push(
			`  ${++step}. Third-party packages pinning an incompatible range:`,
			...thirdParty.map(describeRequirer),
			'     Bump or replace that dependency, or move the catalog version in pnpm-workspace.yaml to a',
			'     version its range accepts. Root "pnpm.overrides" will NOT help: they do not travel in a',
			'     published tarball, which is exactly what this check reproduces.',
			'',
		);
	}
	if (indirect.length > 0) {
		lines.push(
			`  ${++step}. Copies nested under a package that does not declare the library itself:`,
			...indirect.map(describeRequirer),
			"     The requirer is deeper in that package's own dependency graph — find it with",
			'     "npm ls --all <library>" in the install tree before picking a fix.',
			'',
		);
	}
	lines.push(
		`  ${++step}. If the split cannot be removed yet, add an EXPECTED_DUPLICATES entry in`,
		`     ${ALLOWLIST_FILE} documenting why it is tolerated and what removes it.`,
		'',
		'  Reproduce locally (packs + installs the same closure, no CI needed):',
		'     pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-npm-install <pkgName>...',
		'     (or --changed=origin/master to reproduce the scope this job used)',
	);
	if (scratch) {
		lines.push(
			'',
			`  The install tree is kept at ${scratch} — for a full requirer chain, run:`,
			`     npm ls --all --prefix ${scratch} ${explained.map((d) => d.name).join(' ')}`,
		);
	}
	return lines;
}

/**
 * Table cells carry dependency-controlled text (names, semver ranges, paths). In GFM a `|` ends the
 * cell even inside a code span — and `||` ranges are common on curated libs — so a raw range would
 * shift every following column. Newlines would end the row outright.
 */
function cell(text: string): string {
	return text.replace(/[\\|`]/g, '\\$&').replace(/\s*[\r\n]+\s*/g, ' ');
}

// One backtick more than any fence a dependency's own text could contain, so the fix block cannot
// be closed early and the rest of the summary reinterpreted as markdown.
const FENCE = '````';

/** GitHub job-summary markdown — the findings surface without opening a 5k-line log. */
export function formatStepSummary(
	explained: ExplainedDuplicate[],
	{
		reportOnly,
		exemptPackages,
		scratch,
	}: { reportOnly: boolean; exemptPackages: Set<string>; scratch?: string },
): string {
	const rows = explained.flatMap((dup) =>
		dup.copies.map(
			(copy) =>
				`| ${[dup.name, copy.version, describeOrigin(copy), copy.path].map(cell).join(' | ')} |`,
		),
	);
	return [
		`### Single-instance deps: duplicates found${reportOnly ? ' (advisory)' : ''}`,
		'',
		`${describeFailureCount(explained.length)} in the \`npm install\` graph.`,
		'',
		'| Library | Version | Pulled in by | Path |',
		'| --- | --- | --- | --- |',
		...rows,
		'',
		'<details><summary>How to fix</summary>',
		'',
		FENCE,
		...formatRemediation(explained, { exemptPackages, scratch }),
		FENCE,
		'',
		'</details>',
		'',
	].join('\n');
}
