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

import { dropDevDepOnlyDeps, filterImpactfulChanges } from './changes.js';
import {
	type ImpactMap,
	type InternedImpactMap,
	type ResolveResult,
	decodeImpactMap,
} from './impact-map.js';
import { CoverageMapStrategy } from './select/coverage-map-strategy.js';
import { selectImpactedTests } from './select/pipeline.js';

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
	// Drop non-impactful paths (repo tooling / docs / named config) up front so
	// they never trip the unmapped→broad fallback. A change that's *only* such
	// files yields an empty set → scoped/0 → the caller skips E2E.
	let impactful = filterImpactfulChanges(input.changedFiles);
	if (input.manifests) impactful = dropDevDepOnlyDeps(impactful, input.manifests);
	const changed = impactful.map((file) => ({ file }));
	// The live V8 selection runs through the pipeline as the single selection
	// mechanism; the AST / dep-graph selectors join this array later. Sibling
	// fallback scopes a new/unmapped file to its nearest covered directory.
	const result = selectImpactedTests(changed, [
		new CoverageMapStrategy(map, { allSpecs, siblingFallback: true }),
	]);
	return { ...result, failOpen };
}
