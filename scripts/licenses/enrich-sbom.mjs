#!/usr/bin/env node
/**
 * Enriches a CycloneDX SBOM (sbom-source.cdx.json) with resolved licenses,
 * writing the result back so the attested/shipped artifact carries the same
 * license picture as THIRD_PARTY_LICENSES.md — not raw cdxgen output.
 *
 * Transforms, all driven by the single source of truth in license-overrides.json
 * (plus the on-disk root LICENSE.md for first-party text):
 *
 *   1. Overrides   — replace an empty/non-SPDX license with the resolved SPDX id,
 *                    PURL-pinned (release closure) or version-agnostic via byName
 *                    (container images, where a package can appear at >1 version).
 *   2. First-party — emit n8n's own packages as LicenseRef-n8n-sustainable-use
 *                    with the full license text, so scanners read "n8n's declared
 *                    license" instead of "unknown/proprietary". A first-party
 *                    package published under a real OSI license keeps that license.
 *   3. Elections   — record the elected license for validly dual-licensed (OR)
 *                    deps as a `cdx:license:elected` property, so a copyleft
 *                    policy gate reads the elected term, not the copyleft side.
 *
 * Stale config fails loudly: a PURL-pinned override/election that matches no
 * component (e.g. after a dependency bump) exits non-zero — unless --lenient-config
 * (a per-image scan holds only a subset of the closure, so absence is expected).
 *
 * --drop-phantom-npm removes cdxgen's filesystem-scan artifacts (nested
 * test/fixture/exports-subpath package.json) — only relevant for image scans.
 *
 * Usage: node enrich-sbom.mjs <sbom-path> [output-path] [--license-file=<path>]
 *                             [--lenient-config] [--drop-phantom-npm]
 *        output-path defaults to <sbom-path> (in-place).
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isFirstParty, applyOverride, qualifiedName } from './render-licenses-md.mjs';
import { loadSpdxIds } from './check-sbom-licenses.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDES_PATH = path.join(scriptDir, 'license-overrides.json');
const REPO_ROOT = path.resolve(scriptDir, '..', '..');
const DEFAULT_LICENSE_FILE = path.join(REPO_ROOT, 'LICENSE.md');
const DEFAULT_PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'coverage']);

export const FIRST_PARTY_LICENSE_REF = 'LicenseRef-n8n-sustainable-use';
export const ELECTED_PROPERTY = 'cdx:license:elected';

export async function loadLicenseConfig() {
	try {
		const raw = await readFile(OVERRIDES_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		return {
			overrides: parsed.overrides ?? {},
			byName: parsed.byName ?? {},
			elections: parsed.elections ?? {},
		};
	} catch (err) {
		if (err.code === 'ENOENT') return { overrides: {}, byName: {}, elections: {} };
		throw err;
	}
}

function srcFileOf(component) {
	return component.properties?.find((p) => p.name === 'SrcFile')?.value ?? null;
}

/**
 * A scan of a container image filesystem (unlike the pnpm-lockfile scan of the
 * release closure) deep-walks node_modules and mis-catalogs nested package.json
 * as standalone components: `exports` subpaths (@google/genai/web), sub-builds
 * (web-streams-polyfill-es6), and test/benchmark fixtures bundled inside real
 * deps (resolve/test/.../false_main, tedious/benchmarks). None are real shippable
 * packages. Two robust signals identify them:
 *   - no version (real npm packages always carry one), or
 *   - the package.json does not sit at its own canonical
 *     node_modules/<name>/package.json (it's nested inside another package).
 */
export function isPhantomNpm(component) {
	const purl = component.purl ?? '';
	if (!purl.startsWith('pkg:npm/')) return false;
	if (!component.version) return true;
	const src = srcFileOf(component);
	if (!src) return false; // can't prove it's a phantom — keep it
	return !src.endsWith(`/node_modules/${qualifiedName(component)}/package.json`);
}

function firstPartyRefLicenses(licenseText) {
	const license = { name: FIRST_PARTY_LICENSE_REF };
	if (licenseText) {
		license.text = { contentType: 'text/markdown', content: licenseText };
	}
	return [{ license }];
}

/**
 * Build name -> SPDX-id map from the source workspace package.json files, so a
 * first-party package published under a real OSI license (e.g. @n8n/tournament
 * is Apache-2.0, @n8n/json-schema-to-zod is ISC) keeps that license in the SBOM
 * instead of being stamped with the Sustainable Use License. Source package.json
 * is the source of truth; the compiled closure rewrites the field uniformly.
 *
 * Version-agnostic by design — keyed on package name, not purl — so first-party
 * version bumps never make this go stale.
 */
export async function buildFirstPartyOsiMap(packagesDir, validIds) {
	const map = new Map();
	async function walk(dir) {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.isDirectory()) {
				if (!SKIP_DIRS.has(entry.name)) await walk(path.join(dir, entry.name));
				continue;
			}
			if (entry.name !== 'package.json') continue;
			try {
				const pkg = JSON.parse(await readFile(path.join(dir, entry.name), 'utf-8'));
				const id = typeof pkg.license === 'string' ? pkg.license.replace(/\+$/, '') : null;
				// Only real OSI ids count; n8n-license strings ("SEE LICENSE IN
				// LICENSE.md", URLs, "none", missing) fall through to the LicenseRef.
				if (pkg.name && id && validIds.has(id)) map.set(pkg.name, pkg.license);
			} catch {
				/* skip unreadable/placeholder package.json */
			}
		}
	}
	await walk(packagesDir);
	return map;
}

function recordElection(component, elected) {
	const properties = (component.properties ?? []).filter((p) => p.name !== ELECTED_PROPERTY);
	properties.push({ name: ELECTED_PROPERTY, value: elected });
	return { ...component, properties };
}

/**
 * Enrich a single component. Pure — returns a new component, never mutates input.
 * Records which override/election keys it consumed in the provided Sets.
 */
export function enrichComponent(
	component,
	{
		overrides,
		byName = {},
		elections,
		licenseText,
		firstPartyOsi,
		matchedOverrides,
		matchedElections,
	},
) {
	const wasOverridden = overrides?.[component.purl] != null;
	let next = applyOverride(component, overrides, matchedOverrides);
	// applyOverride tags an internal flag for the markdown disk-text lookup; it
	// must not leak into the shipped SBOM.
	if ('_overrideSkipDiskText' in next) {
		const { _overrideSkipDiskText, ...clean } = next;
		next = clean;
	}

	if (!wasOverridden && isFirstParty(next.purl)) {
		// First-party stamping never clobbers an explicit override.
		const osiId = firstPartyOsi?.get(qualifiedName(next));
		next = osiId
			? { ...next, licenses: [{ license: { id: osiId } }] }
			: { ...next, licenses: firstPartyRefLicenses(licenseText) };
	} else if (!wasOverridden) {
		// Version-agnostic, name-keyed override for third-party packages whose
		// license is version-stable but unresolved by cdxgen (e.g. ssh2 declares a
		// legacy licenses[] array, no SPDX). Robust to version drift, unlike the
		// purl-pinned overrides — so it also catches the version a given image
		// resolved to (ssh2@1.16.0 vs the release closure's 1.15.0).
		const byNameEntry = byName[qualifiedName(next)];
		if (byNameEntry) {
			next = { ...next, licenses: [{ license: { id: byNameEntry.license } }] };
		}
	}

	const election = elections[next.purl];
	if (election) {
		matchedElections?.add(next.purl);
		next = recordElection(next, election.elected);
	}

	return next;
}

export function enrichSbom(
	sbom,
	{
		overrides,
		byName = {},
		elections,
		licenseText,
		firstPartyOsi = new Map(),
		dropPhantomNpm = false,
	},
) {
	const matchedOverrides = new Set();
	const matchedElections = new Set();

	const source = sbom.components ?? [];
	const kept = dropPhantomNpm ? source.filter((c) => !isPhantomNpm(c)) : source;
	const droppedPhantoms = source.length - kept.length;

	const components = kept.map((component) =>
		enrichComponent(component, {
			overrides,
			byName,
			elections,
			licenseText,
			firstPartyOsi,
			matchedOverrides,
			matchedElections,
		}),
	);

	const staleOverrides = Object.keys(overrides).filter((purl) => !matchedOverrides.has(purl));
	const staleElections = Object.keys(elections).filter((purl) => !matchedElections.has(purl));

	let firstParty = 0;
	for (const c of components) if (isFirstParty(c.purl)) firstParty++;

	return {
		droppedPhantoms,
		sbom: { ...sbom, components },
		summary: {
			totalComponents: components.length,
			firstPartyEnriched: firstParty,
			overridesApplied: matchedOverrides.size,
			electionsRecorded: matchedElections.size,
			droppedPhantoms,
		},
		staleOverrides,
		staleElections,
	};
}

async function main() {
	const args = process.argv.slice(2);
	const positional = args.filter((a) => !a.startsWith('--'));
	const licenseFileArg = args.find((a) => a.startsWith('--license-file='));
	// A per-image scan contains only the npm subset present in that image, so most
	// overrides/elections won't match — that's expected, not a stale pin. Lenient
	// mode warns instead of failing. The full release-closure run stays strict.
	const lenientConfig = args.includes('--lenient-config');
	// Drop cdxgen's filesystem-scan phantoms (nested test/fixture/exports-subpath
	// package.json). Only meaningful for an image scan; the pnpm-lockfile release
	// scan has none, so the release pipeline omits this flag.
	const dropPhantomNpm = args.includes('--drop-phantom-npm');

	const sbomPath = positional[0];
	if (!sbomPath) {
		console.error(
			'Usage: enrich-sbom.mjs <sbom-path> [output-path] [--license-file=<path>] [--lenient-config] [--drop-phantom-npm]',
		);
		process.exit(1);
	}
	const outputPath = positional[1] ?? sbomPath;
	const licenseFile = licenseFileArg
		? licenseFileArg.slice('--license-file='.length)
		: DEFAULT_LICENSE_FILE;

	const sbom = JSON.parse(await readFile(sbomPath, 'utf-8'));
	const { overrides, byName, elections } = await loadLicenseConfig();
	const validIds = await loadSpdxIds();
	const firstPartyOsi = await buildFirstPartyOsiMap(DEFAULT_PACKAGES_DIR, validIds);

	let licenseText = null;
	try {
		licenseText = (await readFile(licenseFile, 'utf-8')).trim() || null;
	} catch {
		console.error(
			`WARNING: could not read first-party license text at ${licenseFile}; emitting LicenseRef without text.`,
		);
	}

	const {
		sbom: enriched,
		summary,
		staleOverrides,
		staleElections,
	} = enrichSbom(sbom, {
		overrides,
		byName,
		elections,
		licenseText,
		firstPartyOsi,
		dropPhantomNpm,
	});

	console.log(JSON.stringify(summary, null, 2));

	if (staleOverrides.length > 0 || staleElections.length > 0) {
		// A pinned override/election no longer matches any component. In a full
		// release-closure run that means a stale pin (likely a version bump) — fail
		// loudly. In lenient (per-image) mode it just means the package isn't in
		// this image — warn and continue.
		const label = lenientConfig ? 'WARNING: unmatched (not in this image)' : 'Stale';
		if (staleOverrides.length > 0) {
			console.error(`\n${label} overrides:`);
			for (const purl of staleOverrides) console.error('  ' + purl);
		}
		if (staleElections.length > 0) {
			console.error(`\n${label} elections:`);
			for (const purl of staleElections) console.error('  ' + purl);
		}
		if (!lenientConfig) process.exit(3);
	}

	await writeFile(outputPath, JSON.stringify(enriched, null, 2) + '\n');
	console.error(`Enriched SBOM written to ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
