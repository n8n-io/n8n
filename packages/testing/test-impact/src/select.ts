/**
 * `select` handler: changed files + impact map → spec list.
 *
 * The file-system-aware wrapper around the pure {@link resolveImpact} resolver.
 * This is where the FAIL-OPEN safety contract lives — every failure mode
 * (missing map, unreadable map, corrupt JSON, empty map) must degrade to
 * `mode: 'broad'` so the caller runs the full suite, never an empty one.
 *
 * Extracted from {@link runSelect} in `cli.ts` so the contract can be
 * exhaustively unit-tested without spawning a subprocess.
 */

import * as fs from 'node:fs';

import {
	changedRuntimeDepsFromManifests,
	classifyManifestChange,
	dropDevDepOnlyDeps,
	filterImpactfulChanges,
	stripDependencyFiles,
} from './changes.js';
import type { WorkspaceImporters } from './dep-graph.js';
import {
	type ImpactMap,
	type InternedImpactMap,
	type ResolveResult,
	decodeImpactMap,
} from './impact-map.js';
import { CoverageMapStrategy } from './select/coverage-map-strategy.js';
import { DependencyGraphStrategy } from './select/dep-graph-strategy.js';
import { selectImpactedTests } from './select/pipeline.js';
import type { SelectionStrategy } from './select/strategy.js';

export interface SelectTestsInput {
	/** Changed files (file paths). */
	changedFiles: string[];
	/** Path to the impact map JSON. Missing/unreadable → fail-open broad. */
	mapFile?: string;
	/** Path to a newline/comma separated list of every known spec. */
	allSpecsFile?: string;
	/** before/after content of each changed package.json (caller reads from git),
	 *  keyed by path. When supplied, a devDependencies-only manifest change drops
	 *  the lockfile + manifests from selection — a devDep can't reach the runtime
	 *  bundle the E2E suite exercises. */
	manifests?: Record<string, { before: string; after: string }>;
	/** Workspace package dir → runtime dependency names it declares (parsed from
	 *  pnpm-lock.yaml's `importers`). With `manifests`, a changed runtime dep is
	 *  walked to its declaring packages and scoped via the map (DEVP-389) instead
	 *  of forcing broad. */
	lockfileImporters?: WorkspaceImporters;
}

export interface SelectTestsResult extends ResolveResult {
	/** Set when the map could not be loaded; the result is broad as a safety. */
	failOpen?: string;
}

function parseSpecList(raw: string): string[] {
	return raw
		.split(/[\n,]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function loadMap(mapFile: string | undefined): { map: ImpactMap; failOpen?: string } {
	if (!mapFile) return { map: {}, failOpen: 'no --map provided' };
	if (!fs.existsSync(mapFile)) return { map: {}, failOpen: `map not found: ${mapFile}` };
	try {
		const parsed: unknown = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
		// Interned form ({specs, files}) is decoded; a plain ImpactMap is used as-is.
		const isInterned =
			typeof parsed === 'object' && parsed !== null && 'specs' in parsed && 'files' in parsed;
		const map = isInterned ? decodeImpactMap(parsed as InternedImpactMap) : (parsed as ImpactMap);
		// An empty map carries no coverage data — a build/data failure, not a set
		// of genuinely-uncovered changes. Flag it as fail-open so selection runs
		// broad rather than declaring every change uncovered and skipping E2E.
		if (Object.keys(map).length === 0) return { map, failOpen: 'empty map (no coverage data)' };
		return { map };
	} catch (error) {
		return { map: {}, failOpen: `unreadable map: ${String(error)}` };
	}
}

/**
 * Resolve changed files against the impact map, biased to OVER-select. With an
 * empty/missing map every changed file is "unmapped" → {@link resolveImpact}
 * returns `mode: 'broad'`, so fail-open falls out of the same code path.
 */
export function selectTests(input: SelectTestsInput): SelectTestsResult {
	const allSpecs = input.allSpecsFile
		? parseSpecList(fs.readFileSync(input.allSpecsFile, 'utf8'))
		: undefined;
	const { map, failOpen } = loadMap(input.mapFile);
	// Drop non-impactful paths (repo tooling / docs / named config) up front.
	let impactful = filterImpactfulChanges(input.changedFiles);

	// Genuine fail-open: an UNUSABLE map is an infrastructure failure, not a
	// coverage gap → run everything. This is distinct from a healthy map that
	// simply has no entry for a change (declared uncovered below, not run).
	if (failOpen) {
		return { specs: allSpecs ?? [], unmapped: impactful, mode: 'broad', failOpen };
	}

	if (input.manifests) impactful = dropDevDepOnlyDeps(impactful, input.manifests);

	// Runtime dependency changes (389): hand the changed deps to the dep-graph
	// selector — it walks them to their declaring packages and scopes via the
	// map — and drop the dep files from the coverage path. The dep-graph keeps
	// its sibling climb: a dep IS exercised by the specs covering its package.
	const strategies: SelectionStrategy[] = [];
	if (input.lockfileImporters && input.manifests) {
		const runtimeDeps = changedRuntimeDepsFromManifests(input.manifests);
		if (runtimeDeps.length > 0) {
			impactful = stripDependencyFiles(impactful);
			strategies.push(
				new DependencyGraphStrategy(map, input.lockfileImporters, runtimeDeps, { allSpecs }),
			);
		}
	}
	// An unattributable dependency CHANGE stays conservatively broad — we can't
	// scope it and must never declare a dep change merely "uncovered" (it could
	// affect anything). That means: a lockfile bump (a definitive dep-version
	// signal we couldn't scope), or a runtime-manifest change the dep-graph didn't
	// strip (e.g. a transitive dep declared by no importer). A package.json change
	// that is NOT a dependency change (version / scripts / exports / devDep) is not
	// a dep signal — it falls through and is declared uncovered like any source.
	const lockfileRemains = impactful.includes('pnpm-lock.yaml');
	const unscopedRuntimeManifest = impactful.some(
		(f) =>
			/(^|\/)package\.json$/.test(f) &&
			input.manifests?.[f] &&
			classifyManifestChange(input.manifests[f].before, input.manifests[f].after) === 'runtime',
	);
	if (lockfileRemains || unscopedRuntimeManifest) {
		return { specs: allSpecs ?? [], unmapped: impactful, mode: 'broad' };
	}

	// Coverage map for source files: a file with no covering spec is DECLARED
	// uncovered (surfaced as a gap, not run) rather than climbing to its package
	// and running unrelated specs — that verifies nothing and slows the loop.
	// Unit tests + the always-on sanity spec are the net for uncovered changes.
	strategies.unshift(new CoverageMapStrategy(map, { allSpecs, onUncovered: 'declare' }));

	return selectImpactedTests(
		impactful.map((file) => ({ file })),
		strategies,
	);
}
