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
	forcesBroad,
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
	 *  walked to its declaring packages and scoped via the map instead
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
 * Resolve changed files → the specs that must run. Routes each change to one of
 * three outcomes: BROAD (infra failure, runtime-defining change, or an
 * unattributable dependency), SCOPED (mapped source / attributable dep), or
 * declared UNCOVERED (no covering spec → not run; unit + sanity are the net).
 */
export function selectTests(input: SelectTestsInput): SelectTestsResult {
	const allSpecs = input.allSpecsFile
		? parseSpecList(fs.readFileSync(input.allSpecsFile, 'utf8'))
		: undefined;
	const { map, failOpen } = loadMap(input.mapFile);
	const broad = (files: string[]): SelectTestsResult => ({
		specs: allSpecs ?? [],
		unmapped: files,
		mode: 'broad',
		...(failOpen ? { failOpen } : {}),
	});

	let impactful = filterImpactfulChanges(input.changedFiles);

	// Fail-open: an unusable/empty map is an infra failure, not a coverage gap.
	if (failOpen) return broad(impactful);

	// Container image / harness changes define the runtime for EVERY spec and
	// aren't in the map → run the suite (low-churn, so broad is cheap).
	const forcing = impactful.filter(forcesBroad);
	if (forcing.length > 0) return broad(forcing);

	// devDependency-only change can't reach the runtime bundle → dropped.
	if (input.manifests) impactful = dropDevDepOnlyDeps(impactful, input.manifests);

	// Runtime-dep change: walk it to the packages that declare it and drop
	// the dep files from the coverage path.
	const strategies: SelectionStrategy[] = [];
	if (input.lockfileImporters && input.manifests) {
		const runtimeDeps = changedRuntimeDepsFromManifests(input.manifests);
		if (runtimeDeps.length > 0) {
			// Stripping the lockfile is intentional: the dep-graph scopes each changed
			// declared dep to its importers, which covers that dep's transitive subtree
			// (the subtree is reached only THROUGH the dep). What it does NOT cover is
			// UNRELATED transitive churn co-occurring in the same lockfile (e.g. a
			// `pnpm dedupe` alongside the bump) — the deferred transitive-closure case,
			// backstopped by the nightly full E2E run. A lockfile-only change (no
			// manifest) never reaches here and stays broad.
			impactful = stripDependencyFiles(impactful);
			strategies.push(
				new DependencyGraphStrategy(map, input.lockfileImporters, runtimeDeps, { allSpecs }),
			);
		}
	}

	// A dep change the walk couldn't scope stays broad (never declared uncovered):
	// a lockfile bump, or a runtime manifest still present. A package.json with no
	// manifest metadata (e.g. local dev with no base ref) can't be classified, so
	// it's treated conservatively as runtime → broad. A classified non-dep manifest
	// change (version / scripts) falls through and is declared like source.
	const lockfileRemains = impactful.includes('pnpm-lock.yaml');
	const unscopedRuntimeManifest = impactful.some((f) => {
		if (!/(^|\/)package\.json$/.test(f)) return false;
		const manifest = input.manifests?.[f];
		if (!manifest) return true;
		return classifyManifestChange(manifest.before, manifest.after) === 'runtime';
	});
	if (lockfileRemains || unscopedRuntimeManifest) return broad(impactful);

	// Source files: no covering spec → declared uncovered (surfaced, not run);
	// running its package's specs verifies nothing.
	strategies.unshift(new CoverageMapStrategy(map, { allSpecs, onUncovered: 'declare' }));

	return selectImpactedTests(
		impactful.map((file) => ({ file })),
		strategies,
	);
}
