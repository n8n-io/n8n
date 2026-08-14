#!/usr/bin/env node
/**
 * Release-blocking gate: every component in a CycloneDX SBOM must declare a
 * valid SPDX license (id or expression) or an explicitly-allowed LicenseRef.
 *
 * This is the "doesn't slip through" guardrail for DEVP-307. Run it against the
 * SBOM we actually attest and ship, AFTER enrich-sbom.mjs has resolved overrides
 * and first-party licenses. A component with no license, a non-SPDX free-text
 * string ("BSD", "MIT/X11", "SEE LICENSE IN LICENSE.md", "UNLICENSED"), or an
 * unknown id fails the release.
 *
 * Dependency-free by design: the SPDX id list is vendored at
 * ./spdx-license-ids.json so this runs with plain `node`, no install required.
 *
 * Dual-licensed (OR) deps that include a copyleft alternative are reported as
 * WARNINGS, not failures — they are valid, and enrich-sbom records n8n's elected
 * license. (A copyleft-denying policy gate is a separate follow-up; this warning
 * is the signal it would build on.)
 *
 * Usage:
 *   node check-sbom-licenses.mjs <sbom-path> [--allow-ref=LicenseRef-x]... [--enforce-prefix=pkg:npm/]...
 *
 * --enforce-prefix scopes the gate to components whose purl matches a prefix
 * (e.g. pkg:npm/ for container images, where OS packages carry upstream-distro
 * license strings we don't control). Omit it to gate every component.
 *
 * Exit codes: 0 = pass (warnings allowed), 1 = at least one invalid component,
 *             2 = usage/IO error.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { qualifiedName } from './render-licenses-md.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const SPDX_IDS_PATH = path.join(scriptDir, 'spdx-license-ids.json');

const COPYLEFT_PATTERN = /^(A?GPL|LGPL|EUPL|SSPL)(-|$)/i;

export async function loadSpdxIds() {
	const raw = await readFile(SPDX_IDS_PATH, 'utf-8');
	return new Set(JSON.parse(raw).licenseIds);
}

function stripPlus(id) {
	return id.endsWith('+') ? id.slice(0, -1) : id;
}

export function isCopyleft(id) {
	return COPYLEFT_PATTERN.test(stripPlus(id));
}

function tokenizeExpression(expr) {
	return expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean);
}

/**
 * Validate an SPDX license expression token-by-token. Returns
 * { valid, badTokens, hasCopyleftOr }. License ids must be in the SPDX set or an
 * allowed ref; the id after WITH is an exception and accepted as-is.
 */
export function validateExpression(expr, validIds, allowRefs) {
	const tokens = tokenizeExpression(expr);
	if (tokens.length === 0) return { valid: false, badTokens: [], hasCopyleftOr: false };

	const badTokens = [];
	let expectException = false;
	let hasOr = false;
	let hasCopyleft = false;

	for (const tok of tokens) {
		if (tok === '(' || tok === ')') continue;
		const upper = tok.toUpperCase();
		if (upper === 'AND') {
			expectException = false;
			continue;
		}
		if (upper === 'OR') {
			hasOr = true;
			expectException = false;
			continue;
		}
		if (upper === 'WITH') {
			expectException = true;
			continue;
		}
		if (expectException) {
			// SPDX exception id (e.g. Classpath-exception-2.0); accepted as-is.
			expectException = false;
			continue;
		}
		const id = stripPlus(tok);
		if (isCopyleft(id)) hasCopyleft = true;
		if (validIds.has(id) || allowRefs.has(id)) continue;
		badTokens.push(tok);
	}

	return { valid: badTokens.length === 0, badTokens, hasCopyleftOr: hasOr && hasCopyleft };
}

/**
 * Validate a single component's licenses[]. Returns
 * { ok, reason, warning } where warning is a non-blocking note (dual copyleft).
 */
export function validateComponentLicenses(component, validIds, allowRefs) {
	const licenses = component.licenses ?? [];
	if (licenses.length === 0) {
		return { ok: false, reason: 'no license declared' };
	}

	let warning = null;
	for (const entry of licenses) {
		if (entry.expression) {
			const { valid, badTokens, hasCopyleftOr } = validateExpression(
				entry.expression,
				validIds,
				allowRefs,
			);
			if (!valid) {
				return {
					ok: false,
					reason: `invalid SPDX expression "${entry.expression}" (unknown: ${badTokens.join(', ')})`,
				};
			}
			if (hasCopyleftOr) warning = `dual-licensed with copyleft alternative: "${entry.expression}"`;
			continue;
		}

		const id = entry.license?.id;
		const name = entry.license?.name;
		if (id) {
			if (validIds.has(stripPlus(id)) || allowRefs.has(id)) continue;
			return { ok: false, reason: `non-SPDX license id "${id}"` };
		}
		if (name) {
			if (allowRefs.has(name)) continue;
			return { ok: false, reason: `non-SPDX license name "${name}"` };
		}
		return { ok: false, reason: 'empty license entry (no id, name, or expression)' };
	}

	return { ok: true, warning };
}

export function checkSbom(sbom, { validIds, allowRefs, enforcePrefixes = [] }) {
	const failures = [];
	const warnings = [];
	let skipped = 0;

	for (const component of sbom.components ?? []) {
		// When enforcePrefixes is set, only gate components whose purl matches one
		// of them (e.g. pkg:npm/ on a container image, where OS packages carry
		// upstream-distro license strings we don't control). Others are inventoried
		// but not license-gated.
		if (
			enforcePrefixes.length > 0 &&
			!enforcePrefixes.some((p) => (component.purl ?? '').startsWith(p))
		) {
			skipped++;
			continue;
		}

		const label = `${qualifiedName(component)}@${component.version ?? '?'}`;
		const { ok, reason, warning } = validateComponentLicenses(component, validIds, allowRefs);
		if (!ok) {
			failures.push({ label, purl: component.purl, reason });
		} else if (warning) {
			warnings.push({ label, purl: component.purl, reason: warning });
		}
	}

	return {
		failures,
		warnings,
		summary: {
			totalComponents: sbom.components?.length ?? 0,
			enforced: (sbom.components?.length ?? 0) - skipped,
			skipped,
			failures: failures.length,
			warnings: warnings.length,
		},
	};
}

function parseArgs(argv) {
	const positional = [];
	const allowRefs = new Set();
	const enforcePrefixes = [];
	for (const arg of argv) {
		if (arg.startsWith('--allow-ref=')) allowRefs.add(arg.slice('--allow-ref='.length));
		else if (arg.startsWith('--enforce-prefix='))
			enforcePrefixes.push(arg.slice('--enforce-prefix='.length));
		else positional.push(arg);
	}
	return { sbomPath: positional[0], allowRefs, enforcePrefixes };
}

async function main() {
	const { sbomPath, allowRefs, enforcePrefixes } = parseArgs(process.argv.slice(2));
	if (!sbomPath) {
		console.error(
			'Usage: check-sbom-licenses.mjs <sbom-path> [--allow-ref=LicenseRef-x]... [--enforce-prefix=pkg:npm/]...',
		);
		process.exit(2);
	}

	let sbom;
	let validIds;
	try {
		sbom = JSON.parse(await readFile(sbomPath, 'utf-8'));
		validIds = await loadSpdxIds();
	} catch (err) {
		console.error(`ERROR: ${err.message}`);
		process.exit(2);
	}

	const { failures, warnings, summary } = checkSbom(sbom, { validIds, allowRefs, enforcePrefixes });

	if (warnings.length > 0) {
		console.error(`\n⚠️  ${warnings.length} license warning(s):`);
		for (const w of warnings) console.error(`  ${w.label} — ${w.reason}`);
	}

	if (failures.length > 0) {
		console.error(`\n❌ ${failures.length} component(s) with missing or non-SPDX licenses:`);
		for (const f of failures) console.error(`  ${f.label} (${f.purl}) — ${f.reason}`);
		console.error(
			`\nResolve each via scripts/licenses/license-overrides.json (overrides) or enrich-sbom.mjs (first-party), then re-run.`,
		);
		console.error(JSON.stringify(summary, null, 2));
		process.exit(1);
	}

	const scope =
		summary.skipped > 0
			? `${summary.enforced} enforced component(s) (${summary.skipped} not gated by --enforce-prefix)`
			: `all ${summary.totalComponents} components`;
	console.error(
		`✅ ${scope} carry a valid SPDX license or allowed LicenseRef (${warnings.length} warning(s)).`,
	);
	process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((err) => {
		console.error(err);
		process.exit(2);
	});
}
