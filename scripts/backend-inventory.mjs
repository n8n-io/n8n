#!/usr/bin/env node
// @ts-check
/**
 * Generates (or verifies) docs/backend/inventory.md, the map of backend packages,
 * backend modules, and server subsystems that the onboarding documents point at.
 *
 * Facts that rot are read from the source of truth at generation time:
 *   - the workspace (which packages and module folders exist, package.json descriptions),
 *   - the module registry (MODULE_NAMES, defaultModules, each module's @BackendModule options),
 *   - OWNERS (which team owns each path, last-match-wins).
 *
 * Facts that need a human are read from docs/backend/inventory.data.json:
 *   - one purpose sentence per entry,
 *   - a status label (legacy-active, legacy-frozen, extracted, experimental, deprecated, tooling),
 *   - a group, and optional notes.
 *
 * The script fails when the workspace has a package or module folder without a data
 * entry, or when a data entry points at a path that no longer exists. That is the
 * freshness check: a new package cannot land without a sentence about it.
 *
 *   node scripts/backend-inventory.mjs           # write docs/backend/inventory.md
 *   node scripts/backend-inventory.mjs --check   # exit 1 if the committed file is stale
 *
 * Only node built-ins are used, so CI needs no dependency install.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findOwningEntry, parseOwnersFile } from '../.github/scripts/owners/owners.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(REPO_ROOT, 'docs/backend/inventory.data.json');
const OUTPUT_FILE = join(REPO_ROOT, 'docs/backend/inventory.md');
const MODULES_DIR = 'packages/cli/src/modules';
const MODULES_CONFIG = 'packages/@n8n/backend-common/src/modules/modules.config.ts';
const MODULE_REGISTRY = 'packages/@n8n/backend-common/src/modules/module-registry.ts';

const check = process.argv.includes('--check');

/** @param {string} msg */
function fail(msg) {
	console.error(`backend-inventory: ${msg}`);
	process.exit(1);
}

/** @param {string} rel */
function read(rel) {
	return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

/** @param {string} rel */
function isDir(rel) {
	const p = join(REPO_ROOT, rel);
	return existsSync(p) && statSync(p).isDirectory();
}

/** @param {string} rel */
function listDirs(rel) {
	if (!isDir(rel)) return [];
	return readdirSync(join(REPO_ROOT, rel))
		.filter((name) => !name.startsWith('.') && isDir(join(rel, name)))
		.map((name) => join(rel, name))
		.sort();
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function discoverPackages() {
	const roots = [
		'packages/cli',
		'packages/core',
		'packages/workflow',
		'packages/nodes-base',
		'packages/node-dev',
		...listDirs('packages/@n8n'),
		...listDirs('packages/modules'),
		...listDirs('packages/extensions'),
		...listDirs('packages/testing'),
	];
	return roots.filter((rel) => isDir(rel));
}

function discoverModuleDirs() {
	return listDirs(MODULES_DIR).filter((rel) => !rel.endsWith('__tests__'));
}

/**
 * Extracts the string literals of the array literal assigned after `anchor`.
 * Skips a type annotation such as `ModuleName[]` by starting at the `=` sign,
 * and drops comments so that an apostrophe in one cannot shift the matches.
 * @param {string} source @param {string} anchor
 */
function extractStringArray(source, anchor) {
	const start = source.indexOf(anchor);
	if (start === -1) fail(`could not find "${anchor}"`);
	const assign = source.indexOf('=', start);
	const open = source.indexOf('[', assign);
	const close = source.indexOf(']', open);
	const body = source.slice(open, close).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
	const items = [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
	if (items.length === 0) fail(`"${anchor}" resolved to an empty array`);
	return items;
}

function readModuleRegistry() {
	const names = extractStringArray(read(MODULES_CONFIG), 'MODULE_NAMES');
	const defaults = extractStringArray(read(MODULE_REGISTRY), 'defaultModules');
	return { names, defaults: new Set(defaults) };
}

/**
 * Reads the @BackendModule options of a module folder.
 * @param {string} dir
 */
function readModuleOptions(dir) {
	const files = readdirSync(join(REPO_ROOT, dir)).filter((f) => f.endsWith('.module.ts'));
	if (files.length === 0) return null;
	const source = read(join(dir, files[0]));
	const match = source.match(/@BackendModule\(\{([\s\S]*?)\}\)/);
	if (!match) fail(`${dir}: ${files[0]} has no @BackendModule decorator`);
	const body = match[1];
	const name = body.match(/name:\s*'([^']+)'/)?.[1];
	if (!name) fail(`${dir}: @BackendModule has no name`);
	const licenseMatch = body.match(/licenseFlag:\s*(\[[^\]]*\]|[^,\n}]+)/);
	const licenseFlag = licenseMatch
		? [...licenseMatch[1].matchAll(/(?:LICENSE_FEATURES\.)?([A-Z_]+|'[^']+')/g)]
				.map((m) => m[1].replace(/'/g, ''))
				.map(resolveLicenseFeature)
		: [];
	const typesMatch = body.match(/instanceTypes:\s*\[([^\]]*)\]/);
	const instanceTypes = typesMatch
		? [...typesMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
		: ['main', 'webhook', 'worker'];
	return { name, licenseFlag, instanceTypes };
}

/** @type {Record<string, string> | null} */
let licenseFeatures = null;

/** Turns LICENSE_FEATURES.SAML into feat:saml by reading @n8n/constants. @param {string} token */
function resolveLicenseFeature(token) {
	if (token.startsWith('feat:')) return token;
	if (!licenseFeatures) {
		licenseFeatures = {};
		const source = read('packages/@n8n/constants/src/index.ts');
		for (const m of source.matchAll(/([A-Z_]+):\s*'(feat:[^']+)'/g)) licenseFeatures[m[1]] = m[2];
	}
	return licenseFeatures[token] ?? token;
}

/** @param {string} rel */
function readPackageJson(rel) {
	const p = join(REPO_ROOT, rel, 'package.json');
	if (!existsSync(p)) return null;
	return JSON.parse(readFileSync(p, 'utf8'));
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

const ownersEntries = parseOwnersFile();

/**
 * Finds the owning team of a path. A directory is checked with a synthetic file
 * inside it so that directory patterns match. Returns null for the catch-all.
 * `inherited` is true when a parent directory pattern matched, not the path itself.
 * @param {string} rel
 * @returns {{ team: string, pattern: string, inherited: boolean } | null}
 */
function ownerOf(rel) {
	const candidate = isDir(rel) ? `${rel}/x` : rel;
	const entry = findOwningEntry(candidate, ownersEntries);
	if (!entry || entry.pattern === '*') return null;
	const own = entry.pattern === rel || entry.pattern === `${rel}/`;
	// Inheriting from a broad pattern hides a missing entry. Inheriting from a close
	// parent such as `packages/testing/` is a real ownership statement.
	const inherited = !own && BROAD_PATTERNS.has(entry.pattern);
	return { team: entry.team, pattern: entry.pattern, inherited };
}

const BROAD_PATTERNS = new Set(['packages/cli/']);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * @typedef Entry
 * @property {string} path
 * @property {'package'|'module'|'subsystem'} kind
 * @property {string} group
 * @property {string} purpose
 * @property {string} status
 * @property {string} [teamHint]
 * @property {string} [note]
 */

/** @type {{ statusLabels: Record<string, string>, entries: Entry[] }} */
const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
const byPath = new Map(data.entries.map((e) => [e.path, e]));

function validate() {
	const errors = [];
	for (const e of data.entries) {
		if (!existsSync(join(REPO_ROOT, e.path))) errors.push(`entry points at a missing path: ${e.path}`);
		if (!(e.status in data.statusLabels)) errors.push(`${e.path}: unknown status "${e.status}"`);
	}
	for (const rel of discoverPackages()) {
		if (!byPath.has(rel)) errors.push(`package without an inventory entry: ${rel}`);
	}
	for (const rel of discoverModuleDirs()) {
		if (!byPath.has(rel)) errors.push(`module folder without an inventory entry: ${rel}`);
	}
	if (errors.length) fail(`\n  ${errors.join('\n  ')}\n\nAdd the entries to ${relative(REPO_ROOT, DATA_FILE)}.`);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** @param {string} s */
function cell(s) {
	return (s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Renders the owner. A module or package that only inherits its owner from a parent
 * folder shows the inherited team and the likely team, because that is the case
 * where OWNERS is missing an entry.
 * @param {Entry} e
 */
function ownerCell(e) {
	const owner = ownerOf(e.path);
	if (!owner) return e.teamHint ? `none, likely ${cell(e.teamHint)}` : 'none';
	if (owner.inherited && e.kind !== 'subsystem') {
		const hint = e.teamHint ? `, likely ${cell(e.teamHint)}` : '';
		return `\`${owner.team}\` (from \`${owner.pattern}\`)${hint}`;
	}
	return `\`${owner.team}\``;
}

/** @param {Entry} e */
function lacksOwnEntry(e) {
	const owner = ownerOf(e.path);
	return !owner || (owner.inherited && e.kind !== 'subsystem');
}

/** @param {string} rel */
function link(rel) {
	return `[\`${rel}\`](../../${rel})`;
}

// Package groups that a backend joiner does not need in the map. The entries stay in
// inventory.data.json so that the completeness check still covers them.
const EXCLUDED_PACKAGE_GROUPS = new Set(['Frontend and build configuration', 'Testing platform']);

/** @param {Entry[]} entries @param {(e: Entry) => string} groupOf */
function groupBy(entries, groupOf) {
	/** @type {Map<string, Entry[]>} */
	const groups = new Map();
	for (const e of entries) {
		const g = groupOf(e);
		if (!groups.has(g)) groups.set(g, []);
		groups.get(g)?.push(e);
	}
	return groups;
}

const PACKAGE_GROUP_ORDER = [
	'Application server',
	'Workflow model and execution',
	'Persistence',
	'Cross-cutting concerns',
	'API contracts',
	'AI',
	'Protocol clients',
	'Realtime',
	'Extension system',
	'Developer CLIs and tooling',
	'Testing platform',
	'Frontend and build configuration',
];

const SUBSYSTEM_GROUP_ORDER = [
	'Transport',
	'Workflow domain',
	'Execution',
	'Scaling',
	'Task runners',
	'Auth and access',
	'Credentials',
	'Nodes',
	'Persistence',
	'Enterprise not yet modules',
	'Cross-cutting observability',
	'Cross-cutting lifecycle',
	'Configuration',
	'Licensing',
	'Shared services',
	'Shared helpers',
	'Commands',
	'Realtime',
];

/** @param {string[]} order */
function sorter(order) {
	return (/** @type {string} */ a, /** @type {string} */ b) => {
		const ia = order.indexOf(a);
		const ib = order.indexOf(b);
		return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib) || a.localeCompare(b);
	};
}

function render() {
	const registry = readModuleRegistry();
	const packages = data.entries.filter((e) => e.kind === 'package');
	const modules = data.entries.filter((e) => e.kind === 'module');
	const subsystems = data.entries.filter((e) => e.kind === 'subsystem');

	const out = [];
	out.push('---');
	out.push('title: Backend inventory');
	out.push('audience: Backend engineers new to n8n');
	out.push('tier: 1');
	out.push('generated: true');
	out.push('owner: "@n8n-io/catalysts"');
	out.push('---');
	out.push('');
	out.push('# Backend inventory');
	out.push('');
	out.push(
		'Generated by `scripts/backend-inventory.mjs`. Do not edit this file. Edit `inventory.data.json` for the purpose, status, group, and notes, then run the script. Package names, module registry facts, and owners come from the workspace, the module registry, and `OWNERS` at generation time.',
	);
	out.push('');
	out.push(
		`The backend is ${packages.filter((e) => !EXCLUDED_PACKAGE_GROUPS.has(e.group)).length} packages, ${registry.names.length} backend modules inside \`packages/cli\`, and ${subsystems.length} server subsystems inside \`packages/cli/src\` that were never extracted into modules. Frontend, build configuration, and testing packages are left out on purpose.`,
	);
	out.push('');
	out.push('## Status labels');
	out.push('');
	out.push('| Label | Meaning |');
	out.push('|---|---|');
	for (const [label, meaning] of Object.entries(data.statusLabels)) {
		out.push(`| \`${label}\` | ${cell(meaning)} |`);
	}
	out.push('');
	out.push(
		'The owner column is the GitHub team from `OWNERS`, last match wins. "none" means the path falls to the catch-all rule, and the likely team is a guess from recent authors that needs an `OWNERS` entry.',
	);
	out.push('');

	out.push('## Packages');
	out.push('');
	const pkgGroups = groupBy(
		packages.filter((e) => !EXCLUDED_PACKAGE_GROUPS.has(e.group)),
		(e) => e.group,
	);
	for (const group of [...pkgGroups.keys()].sort(sorter(PACKAGE_GROUP_ORDER))) {
		out.push(`### ${group}`);
		out.push('');
		out.push('| Package | npm name | Status | Owner | Purpose |');
		out.push('|---|---|---|---|---|');
		for (const e of pkgGroups.get(group) ?? []) {
			const pkg = readPackageJson(e.path);
			const npmName = pkg?.name ? `\`${pkg.name}\`` : '';
			const note = e.note ? ` ${cell(e.note)}.` : '';
			out.push(`| ${link(e.path)} | ${npmName} | \`${e.status}\` | ${ownerCell(e)} | ${cell(e.purpose)}${note} |`);
		}
		out.push('');
	}

	out.push('## Backend modules');
	out.push('');
	out.push(
		`${registry.names.length} names are registered in \`MODULE_NAMES\`. ${registry.defaults.size} are on by default. The rest are opt-in through \`N8N_ENABLED_MODULES\`. A module with a license flag is loaded on every instance and initialized only on a licensed one. Instance types say which processes load the module.`,
	);
	out.push('');
	out.push('| Module | Enabled | License flag | Instance types | Status | Owner | Purpose |');
	out.push('|---|---|---|---|---|---|---|');
	for (const e of modules) {
		const opts = readModuleOptions(e.path);
		const enabled = opts ? (registry.defaults.has(opts.name) ? 'default' : 'opt-in') : 'always (not a module)';
		const license = opts && opts.licenseFlag.length ? opts.licenseFlag.map((f) => `\`${f}\``).join(' or ') : '';
		const types = opts ? opts.instanceTypes.join(', ') : 'main';
		const note = e.note ? ` ${cell(e.note)}.` : '';
		out.push(
			`| ${link(e.path)} | ${enabled} | ${license} | ${types} | \`${e.status}\` | ${ownerCell(e)} | ${cell(e.purpose)}${note} |`,
		);
	}
	out.push('');

	out.push('## Server subsystems in packages/cli/src');
	out.push('');
	out.push(
		'Everything under `packages/cli/src` outside `modules/`. These predate the module system. New features do not go here. See the status label of each row before you extend it.',
	);
	out.push('');
	const subGroups = groupBy(subsystems, (e) => e.group);
	for (const group of [...subGroups.keys()].sort(sorter(SUBSYSTEM_GROUP_ORDER))) {
		out.push(`### ${group}`);
		out.push('');
		out.push('| Path | Status | Owner | Purpose |');
		out.push('|---|---|---|---|');
		for (const e of subGroups.get(group) ?? []) {
			const note = e.note ? ` ${cell(e.note)}.` : '';
			out.push(`| ${link(e.path)} | \`${e.status}\` | ${ownerCell(e)} | ${cell(e.purpose)}${note} |`);
		}
		out.push('');
	}

	const unowned = data.entries.filter(lacksOwnEntry);
	out.push('## Paths without an OWNERS entry');
	out.push('');
	out.push(
		`${unowned.length} packages and modules have no entry of their own in \`OWNERS\`. They fall to the catch-all rule or inherit from a parent folder. Each one needs an explicit entry so that reviewers are requested from the right team.`,
	);
	out.push('');
	for (const e of unowned) {
		out.push(`- ${link(e.path)}${e.teamHint ? `, likely ${cell(e.teamHint)}` : ''}`);
	}
	out.push('');
	return out.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

validate();
const rendered = render();

if (check) {
	const current = existsSync(OUTPUT_FILE) ? readFileSync(OUTPUT_FILE, 'utf8') : '';
	if (current !== rendered) {
		fail(`${relative(REPO_ROOT, OUTPUT_FILE)} is stale. Run: node scripts/backend-inventory.mjs`);
	}
	console.log('backend-inventory: up to date');
} else {
	writeFileSync(OUTPUT_FILE, rendered);
	console.log(`backend-inventory: wrote ${relative(REPO_ROOT, OUTPUT_FILE)} (${data.entries.length} entries)`);
}
