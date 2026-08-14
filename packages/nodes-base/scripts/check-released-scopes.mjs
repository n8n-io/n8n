#!/usr/bin/env node
/**
 * Fails when a change removes an OAuth scope that the released n8n still grants.
 *
 * Narrowing a scope is a breaking change and it cannot be undone: existing
 * credentials keep the token they were issued, so the node starts failing for
 * them and restoring the scope later does not repair them. #28141 tightened
 * Microsoft Teams' Group.ReadWrite.All, users broke, #36005 restored it six
 * weeks later.
 *
 * The baseline is the credential metadata of the currently released packages,
 * fetched from the CDN, so nothing has to be recorded in the repo and adding
 * scopes or credentials never needs an update. An intended removal is recorded
 * once in scope-removals.json.
 *
 * Needs the local packages built (it reads their generated dist/types).
 * Network failures warn and exit 0: this guards a rare mistake, it is not worth
 * a red build when a CDN is down.
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const PACKAGES = [
	{ name: 'n8n-nodes-base', dir: path.resolve(here, '..') },
	{ name: '@n8n/n8n-nodes-langchain', dir: path.resolve(here, '../../@n8n/nodes-langchain') },
];

const ALLOWED_REMOVALS = path.resolve(here, '../credentials/scope-removals.json');
const TYPES_FILE = 'dist/types/credentials.json';
const TIMEOUT_MS = 20_000;

const warn = (message) => console.warn(`[check-released-scopes] ${message}`);

const fetchJson = async (url) => {
	const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
	return await response.json();
};

/** Properties of a credential including inherited ones, child wins. */
const resolveProperties = (credentials, name, seen = new Set()) => {
	const resolved = new Map();
	if (seen.has(name)) return resolved;
	seen.add(name);

	const credential = credentials.get(name);
	for (const parent of credential?.extends ?? []) {
		for (const [key, value] of resolveProperties(credentials, parent, seen))
			resolved.set(key, value);
	}
	for (const property of credential?.properties ?? [])
		resolved.set(property.name, property.default);
	return resolved;
};

/**
 * Scope defaults are expression strings once a credential offers custom scopes,
 * e.g. `={{$self["customScopes"] ? $self["enabledScopes"] : "openid User.Read"}}`.
 * The literal fallback is the shipped scope set. Both sides go through this, so a
 * change that only restructures the expression compares equal.
 */
const scopeSet = (rawDefault) => {
	const fallback = /:\s*'([^']*)'\s*}}|:\s*"([^"]*)"\s*}}/.exec(rawDefault);
	const scopes = fallback
		? (fallback[1] ?? fallback[2])
		: rawDefault.startsWith('={{')
			? null
			: rawDefault;
	if (scopes === null) return new Set([rawDefault]);
	return new Set(scopes.split(/[\s,]+/).filter(Boolean));
};

/**
 * Every credential mapped to its scope set, empty when it declares no scopes. A
 * credential that lost its scopes entirely has to stay in the map: that is the
 * worst removal there is, and skipping empties would hide it.
 */
const scopesByCredential = (list) => {
	const credentials = new Map(list.map((credential) => [credential.name, credential]));
	const scopes = new Map();
	for (const name of credentials.keys()) {
		const scope = resolveProperties(credentials, name).get('scope');
		scopes.set(name, typeof scope === 'string' && scope !== '' ? scopeSet(scope) : new Set());
	}
	return scopes;
};

const releasedVersions = async () => {
	const released = await fetchJson('https://registry.npmjs.org/n8n/latest');
	return { version: released.version, dependencies: released.dependencies ?? {} };
};

const allowed = existsSync(ALLOWED_REMOVALS)
	? JSON.parse(readFileSync(ALLOWED_REMOVALS, 'utf8'))
	: [];
const isAllowed = (credential, scope) =>
	allowed.some((entry) => entry.credential === credential && entry.scope === scope);

let release;
try {
	release = await releasedVersions();
} catch (error) {
	warn(`could not resolve the released version (${error.message}), skipping`);
	process.exit(0);
}

const removals = [];
const additions = [];
const usedAllowances = new Set();

for (const { name, dir } of PACKAGES) {
	const localFile = path.join(dir, TYPES_FILE);
	// Not a soft failure: skipping here would silently disable the check if a
	// build stops emitting the metadata or it moves.
	if (!existsSync(localFile)) {
		console.error(
			`[check-released-scopes] ${name} is not built: ${TYPES_FILE} is missing. Run \`pnpm build --filter=${name}\` first.`,
		);
		process.exit(1);
	}

	const version = release.dependencies[name];
	if (!version) {
		warn(`n8n@${release.version} does not depend on ${name}, skipping it`);
		continue;
	}

	let baseline;
	try {
		baseline = await fetchJson(`https://cdn.jsdelivr.net/npm/${name}@${version}/${TYPES_FILE}`);
	} catch (error) {
		warn(`could not fetch ${name}@${version} (${error.message}), skipping it`);
		continue;
	}

	const released = scopesByCredential(baseline);
	const current = scopesByCredential(JSON.parse(readFileSync(localFile, 'utf8')));

	for (const [credential, releasedScopes] of released) {
		if (releasedScopes.size === 0) continue;

		const currentScopes = current.get(credential);
		// A credential that is gone entirely is a node removal, which has its own
		// deprecation path and is not what this guards.
		if (!currentScopes) continue;

		for (const scope of releasedScopes) {
			if (currentScopes.has(scope)) continue;
			if (isAllowed(credential, scope)) {
				usedAllowances.add(`${credential}|${scope}`);
				continue;
			}
			removals.push({ package: name, version, credential, scope });
		}
		for (const scope of currentScopes) {
			if (!releasedScopes.has(scope)) additions.push({ credential, scope });
		}
	}
}

const summary = (lines) => {
	console.log(lines.join('\n'));
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
	}
};

for (const entry of allowed) {
	if (!usedAllowances.has(`${entry.credential}|${entry.scope}`)) {
		warn(
			`scope-removals.json entry for ${entry.credential} / ${entry.scope} no longer matches anything, it can be deleted`,
		);
	}
}

if (additions.length > 0) {
	summary([
		`### OAuth scopes added (vs n8n@${release.version})`,
		'',
		...additions.map((entry) => `- \`${entry.credential}\`: \`${entry.scope}\``),
		'',
		'Managed OAuth apps have to consent to a new scope before it works for users on Cloud.',
	]);
}

if (removals.length === 0) process.exit(0);

summary([
	`### OAuth scopes removed (vs n8n@${release.version})`,
	'',
	...removals.map(
		(entry) =>
			`- \`${entry.credential}\`: \`${entry.scope}\` (in ${entry.package}@${entry.version})`,
	),
	'',
	'Every credential connected with this scope keeps failing after the change, and putting the scope back later does not repair them: those users have to reconnect.',
	'',
	'If the removal is intended, ship it behind a new node version or with a migration note, and record it in `packages/nodes-base/credentials/scope-removals.json`.',
]);

process.exit(1);
