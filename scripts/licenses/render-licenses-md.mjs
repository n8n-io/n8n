#!/usr/bin/env node
/**
 * Renders THIRD_PARTY_LICENSES.md from a CycloneDX SBOM (sbom-source.cdx.json).
 *
 * Single source of truth: the SBOM. This script is pure presentation —
 * group external components by their license expression and emit markdown.
 * License *text* is pulled from each package's on-disk LICENSE file
 * (cdxgen --include-license-content is a no-op for npm components).
 *
 * Usage: node render-licenses-md.mjs <sbom-path> <output-md-path> [node-modules-dir]
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDES_PATH = path.join(scriptDir, 'license-overrides.json');

const LICENSE_FILE_PATTERN = /^(license|licence|copying|copyright|unlicense)([.-].+)?$/i;
const INVALID_LICENSE_FILE_PATTERN = /(readme|package\.json|changelog|history)/i;

const FIRST_PARTY_PATTERNS = [
	/^pkg:npm\/%40n8n\//,
	/^pkg:npm\/%40n8n_/,
	/^pkg:npm\/n8n-/,
	/^pkg:npm\/n8n@/,
];

function isFirstParty(purl) {
	if (!purl) return false;
	return FIRST_PARTY_PATTERNS.some((p) => p.test(purl));
}

function licenseKey(licenses) {
	if (!licenses || licenses.length === 0) return null;
	const parts = licenses.map((l) => l.expression ?? l.license?.id ?? l.license?.name).filter(Boolean);
	if (parts.length === 0) return null;
	return parts.length === 1 ? parts[0] : parts.join(' AND ');
}

function licenseTextFor(licenses) {
	if (!licenses) return null;
	for (const entry of licenses) {
		const text = entry.license?.text?.content;
		if (text && text.trim()) return text.trim();
	}
	return null;
}

async function readLicenseFromDisk(nodeModulesDir, component) {
	if (!nodeModulesDir) return null;
	const pkgDir = component.group
		? path.join(nodeModulesDir, component.group, component.name)
		: path.join(nodeModulesDir, component.name);

	let entries;
	try {
		entries = await readdir(pkgDir);
	} catch {
		return null;
	}

	const candidates = entries.filter(
		(e) => LICENSE_FILE_PATTERN.test(e) && !INVALID_LICENSE_FILE_PATTERN.test(e),
	);
	for (const candidate of candidates) {
		try {
			const text = await readFile(path.join(pkgDir, candidate), 'utf-8');
			if (text && text.trim()) return text.trim();
		} catch {
			/* try next */
		}
	}
	return null;
}

function copyrightFor(component) {
	return component.copyright?.trim() || null;
}

function qualifiedName(component) {
	return component.group ? `${component.group}/${component.name}` : component.name;
}

function applyOverride(component, overrides, matchedKeys) {
	const override = overrides[component.purl];
	if (!override) return component;
	matchedKeys?.add(component.purl);
	return {
		...component,
		licenses: [{ license: { id: override.license } }],
	};
}

async function loadOverrides() {
	try {
		const raw = await readFile(OVERRIDES_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		return parsed.overrides ?? {};
	} catch (err) {
		if (err.code === 'ENOENT') return {};
		throw err;
	}
}

function buildMarkdown(groups, texts) {
	const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));

	let doc = `# Third-Party Licenses

This file lists third-party software components included in n8n and their respective license terms.

The n8n software includes open source packages, libraries, and modules, each of which is subject to its own license. The following sections list those dependencies and provide required attributions and license texts.

`;

	for (const key of sortedKeys) {
		const packages = groups.get(key).slice().sort((a, b) => a.name.localeCompare(b.name));
		doc += `## ${key}\n\n`;
		for (const pkg of packages) {
			const copyright = pkg.copyright ? `, ${pkg.copyright}` : '';
			doc += `* ${pkg.name} ${pkg.version}${copyright}\n`;
		}
		doc += '\n';
	}

	doc += '# License Texts\n\n';
	for (const key of sortedKeys) {
		const text = texts.get(key);
		doc += `## ${key} License Text\n\n`;
		if (text) {
			doc += '```\n' + text + '\n```\n\n';
		} else {
			doc += `${key} license text not available.\n\n`;
		}
	}

	return doc;
}

export async function renderSbom(sbom, overrides, { readDiskText } = {}) {
	const groups = new Map();
	const texts = new Map();
	const unresolved = [];
	const matchedOverrideKeys = new Set();
	let externalCount = 0;
	let skippedFirstParty = 0;

	for (const rawComponent of sbom.components ?? []) {
		if (isFirstParty(rawComponent.purl)) {
			skippedFirstParty++;
			continue;
		}
		externalCount++;

		const component = applyOverride(rawComponent, overrides, matchedOverrideKeys);
		const key = licenseKey(component.licenses);

		if (!key) {
			unresolved.push(`${qualifiedName(rawComponent)}@${rawComponent.version}\t${rawComponent.purl}`);
			continue;
		}

		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push({
			name: qualifiedName(component),
			version: component.version,
			copyright: copyrightFor(component),
		});

		if (!texts.has(key)) {
			const inlineText = licenseTextFor(component.licenses);
			if (inlineText) {
				texts.set(key, inlineText);
			} else if (readDiskText) {
				// Disk lookup uses rawComponent (real group/name on disk) even when
				// licenses were overridden, since the file location is independent of the SPDX expression.
				const diskText = await readDiskText(rawComponent);
				if (diskText) texts.set(key, diskText);
			}
		}
	}

	const unusedOverrides = Object.keys(overrides).filter((purl) => !matchedOverrideKeys.has(purl));

	return {
		markdown: buildMarkdown(groups, texts),
		summary: {
			totalComponents: sbom.components?.length ?? 0,
			skippedFirstParty,
			externalComponents: externalCount,
			uniqueLicenses: groups.size,
			unresolved: unresolved.length,
			unusedOverrides: unusedOverrides.length,
		},
		unresolved,
		unusedOverrides,
	};
}

export { qualifiedName, isFirstParty, licenseKey, applyOverride };

async function main() {
	const [sbomPath, outputPath, nodeModulesDir] = process.argv.slice(2);
	if (!sbomPath || !outputPath) {
		console.error('Usage: render-licenses-md.mjs <sbom-path> <output-md-path> [node-modules-dir]');
		process.exit(1);
	}
	const resolvedNodeModules = nodeModulesDir ? path.resolve(nodeModulesDir) : null;

	const sbom = JSON.parse(await readFile(sbomPath, 'utf-8'));
	const overrides = await loadOverrides();

	const { markdown, summary, unresolved, unusedOverrides } = await renderSbom(sbom, overrides, {
		readDiskText: resolvedNodeModules
			? (component) => readLicenseFromDisk(resolvedNodeModules, component)
			: undefined,
	});

	await writeFile(outputPath, markdown);
	console.log(JSON.stringify(summary, null, 2));

	if (unusedOverrides.length > 0) {
		// Stale override: a PURL was overridden but no component matched it (e.g. after a version bump).
		// Surface loudly so it's caught on the next bump instead of silently re-introducing unresolved licenses.
		console.error('\nUnused overrides (stale — no matching component PURL):');
		for (const purl of unusedOverrides) console.error('  ' + purl);
	}

	if (unresolved.length > 0) {
		console.error('\nUnresolved (no license detected, no override):');
		for (const line of unresolved) console.error('  ' + line);
		process.exit(2);
	}

	if (unusedOverrides.length > 0) {
		process.exit(3);
	}
}

// Run main() only when invoked as a script, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
