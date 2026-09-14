#!/usr/bin/env node
/**
 * Proves an oxlint package enforces the same rules its ESLint layer did.
 *
 * Run `snapshot.mjs` on a tree where the package still uses ESLint, then this
 * against the oxlint config:
 *   node scripts/lint-parity/snapshot.mjs --out /tmp/before.json --only packages/@n8n/errors
 *   node scripts/lint-parity/oxlint-parity.mjs --pkg packages/@n8n/errors --eslint /tmp/before.json
 *
 * Exits non-zero on a rule oxlint enforces that ESLint did not, and on a rule
 * ESLint enforced that is missing from oxlint and from `oxlint-gap.json`. A gap
 * entry is how a drop gets reviewed instead of discovered later.
 *
 * Two oxlint limits shape this:
 *
 * - `--print-config` lists native rules only, never jsPlugin ones, so the 14
 *   local rules would read as missing. Those are read from the config objects
 *   instead, which is weaker: it describes what we declared, not what oxlint
 *   resolved. A fixture probe is the only way to prove they fire.
 * - `--print-config` resolves the config, not a file, so `overrides` do not
 *   appear. Both sides are therefore compared as a union across the package's
 *   sample files.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

function arg(name) {
	const i = process.argv.indexOf(name);
	return i === -1 ? undefined : process.argv[i + 1];
}

const pkgDir = arg('--pkg');
const eslintFile = arg('--eslint');
if (!pkgDir || !eslintFile) {
	console.error(
		'usage: oxlint-parity.mjs --pkg <pkgDir> --eslint <snapshot.json> [--gap <gap.json>]',
	);
	process.exit(2);
}
const gapFile = arg('--gap') ?? join(here, 'oxlint-gap.json');

/**
 * oxlint keeps a rule under the plugin that owns it, which is not always the
 * namespace ESLint used. Everything else maps by namespace alone.
 */
const SCOPE_BY_NAMESPACE = {
	'@typescript-eslint': 'typescript',
	'import-x': 'import',
	import: 'import',
	unicorn: 'unicorn',
	promise: 'promise',
	jsdoc: 'jsdoc',
	vue: 'vue',
};

/** Namespaces oxlint can only reach through a jsPlugin, so ids stay as ESLint wrote them. */
const JS_PLUGIN_NAMESPACES = new Set([
	'@stylistic',
	'lodash',
	'unused-imports',
	'n8n-local-rules',
]);

function splitId(id) {
	const i = id.lastIndexOf('/');
	return i === -1 ? ['', id] : [id.slice(0, i), id.slice(i + 1)];
}

function oxlintRuleIds() {
	const out = spawnSync('pnpm', ['exec', 'oxlint', '--rules', '--format=json'], {
		cwd: join(root, pkgDir),
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
	});
	const start = out.stdout.indexOf('[');
	if (start === -1) throw new Error(`oxlint --rules failed: ${(out.stderr || out.stdout).trim()}`);
	return new Set(JSON.parse(out.stdout.slice(start)).map((r) => `${r.scope}/${r.value}`));
}

/** ESLint id -> the oxlint id we would write in a config, or null if oxlint has no such rule. */
function toOxlintId(eslintId, native) {
	const [ns, name] = splitId(eslintId);
	if (JS_PLUGIN_NAMESPACES.has(ns)) return eslintId;
	if (ns === '') return native.has(`eslint/${name}`) ? name : null;
	const scope = SCOPE_BY_NAMESPACE[ns];
	if (!scope) return null;
	if (native.has(`${scope}/${name}`)) return `${scope}/${name}`;
	// A handful of typescript-eslint extension rules live in oxlint's eslint scope.
	if (native.has(`eslint/${name}`)) return name;
	return null;
}

/** A rule id as it appears in an oxlint config -> its canonical `scope/value` form. */
function canonical(configId, native) {
	const [ns, name] = splitId(configId);
	if (ns === '') return native.has(`eslint/${name}`) ? `eslint/${name}` : configId;
	return configId;
}

function isEnabled(severity) {
	// oxlint prints `deny`/`warn`/`allow`; a config states error/warn/off. Every
	// lint script runs with --quiet, so only the deny set is enforced.
	const value = Array.isArray(severity) ? severity[0] : severity;
	return value === 'deny' || value === 'error' || value === 2;
}

/** Native rules oxlint actually resolved for this package. */
function resolvedNativeRules() {
	const out = spawnSync('pnpm', ['exec', 'oxlint', '--print-config'], {
		cwd: join(root, pkgDir),
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
	});
	const start = out.stdout.indexOf('{');
	if (start === -1) {
		throw new Error(`oxlint --print-config failed: ${(out.stderr || out.stdout).trim()}`);
	}
	const parsed = JSON.parse(out.stdout.slice(start));
	return Object.entries(parsed.rules ?? {})
		.filter(([, severity]) => isEnabled(severity))
		.map(([id]) => id);
}

/**
 * jsPlugin rules, read from the config objects because `--print-config` omits
 * them. `extends` is depth-first and later wins, matching how oxlint merges.
 */
async function declaredJsPluginRules() {
	const mod = await import(pathToFileURL(join(root, pkgDir, 'oxlint.config.mts')).href);
	const declared = new Map();
	const overrideOnly = new Set();
	const plugins = new Set();

	const visit = (config) => {
		for (const parent of config.extends ?? []) visit(parent);
		for (const name of config.jsPlugins ?? []) plugins.add(name);
		for (const [id, severity] of Object.entries(config.rules ?? {})) declared.set(id, severity);
		for (const override of config.overrides ?? []) {
			for (const name of override.jsPlugins ?? []) plugins.add(name);
			for (const [id, severity] of Object.entries(override.rules ?? {})) {
				// An override that turns a rule off still leaves it enforced elsewhere
				// in the package, and this comparison is a union.
				if (!isEnabled(severity)) continue;
				if (!declared.has(id)) overrideOnly.add(id);
				declared.set(id, severity);
			}
		}
	};
	visit(mod.default);

	const ids = [...declared]
		.filter(([id, severity]) => isEnabled(severity) && JS_PLUGIN_NAMESPACES.has(splitId(id)[0]))
		.map(([id]) => id);
	return { ids, overrideOnly, plugins: [...plugins] };
}

// The test-file override is only comparable when a test file was sampled:
// ESLint resolves its config per file, oxlint's --print-config does not resolve
// overrides at all, so without a test sample there is nothing to compare and an
// override-only rule would read as unrequested.
const isTestSample = (key) => /(\.test\.ts|\/__tests__\/|^test\/)/.test(key.split('|')[1] ?? '');

const native = oxlintRuleIds();
const gap = JSON.parse(readFileSync(gapFile, 'utf8'));

// ESLint's enforced set, unioned across the package's sample files.
const snapshot = JSON.parse(readFileSync(resolve(eslintFile), 'utf8'));
const eslintRules = new Set();
let sampled = 0;
let sampledTestFile = false;
for (const [key, entry] of Object.entries(snapshot)) {
	if (!key.startsWith(`${pkgDir}|`) || !entry.rules) continue;
	sampled++;
	if (isTestSample(key)) sampledTestFile = true;
	for (const id of Object.keys(entry.rules)) eslintRules.add(id);
}
if (sampled === 0) {
	console.error(`no ESLint snapshot entries for ${pkgDir} in ${eslintFile}`);
	process.exit(2);
}

const { ids: jsPluginIds, overrideOnly, plugins } = await declaredJsPluginRules();

const comparable = (id) => !overrideOnly.has(id) || sampledTestFile;

const oxlintRules = new Set(
	[...resolvedNativeRules(), ...jsPluginIds]
		.filter(comparable)
		.map((id) => canonical(id, native)),
);

const matched = [];
const missing = [];
for (const id of [...eslintRules].sort()) {
	const target = toOxlintId(id, native);
	if (target && oxlintRules.has(canonical(target, native))) {
		matched.push(id);
		continue;
	}
	missing.push({ id, native: target });
}

// Anything oxlint enforces that no ESLint rule maps onto. A rule we did not ask
// for is as much a parity break as a rule we lost.
const expected = new Set();
for (const id of eslintRules) {
	const target = toOxlintId(id, native);
	if (target) expected.add(canonical(target, native));
}
const extra = [...oxlintRules].filter((id) => !expected.has(id)).sort();

const isDocumented = ({ id, native: target }) => id in gap || (target !== null && target in gap);
const undocumented = missing.filter((entry) => !isDocumented(entry));

console.log(`${pkgDir}: ${sampled} sample files, ${eslintRules.size} ESLint rules at error`);
console.log(`  jsPlugins declared: ${plugins.join(', ') || 'none'}`);
console.log(`  matched:            ${matched.length}`);
console.log(`  missing in oxlint:  ${missing.length} (${missing.length - undocumented.length} documented)`);
console.log(`  extra in oxlint:    ${extra.length}`);

for (const id of extra) console.log(`  EXTRA   ${id}`);
for (const { id, native: target } of undocumented) {
	console.log(`  MISSING ${id}${target ? ` (oxlint has ${target})` : ''} — not in ${gapFile}`);
}

if (extra.length > 0 || undocumented.length > 0) process.exit(1);
console.log('  parity OK');
