#!/usr/bin/env node
/**
 * Fails when a change removes an OAuth scope that the released n8n still grants.
 *
 * Narrowing a scope cannot be undone: existing credentials keep the token they
 * were issued, so the node starts failing for them and restoring the scope later
 * does not repair it. Added scopes are only reported, never failed.
 *
 * The baseline is the released package, not master, because tokens only exist
 * for scopes that shipped. A scope added to master and removed again before
 * release breaks nobody. The cost is attribution, so the workflow also runs on
 * master to name the merge that introduced a removal.
 *
 * Needs the local packages built (it reads their generated dist/types). Network
 * failures warn and exit 0: a CDN outage should not block a merge for a guard
 * against a rare mistake.
 *
 * Full rationale: https://linear.app/n8n/issue/ENT-370
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scopesByCredential } from './credential-scopes.mjs';

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
const unreadable = [];
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
		const currentScopes = current.get(credential);
		// A credential that is gone entirely is a node removal, which has its own
		// deprecation path and is not what this guards.
		if (!currentScopes) continue;

		// Neither side can be diffed as a set of scopes if either is computed.
		// Report the change instead of inventing scopes that were never there.
		if (releasedScopes.kind === 'opaque' || currentScopes.kind === 'opaque') {
			if (releasedScopes.source !== currentScopes.source) {
				unreadable.push({
					credential,
					from: releasedScopes.source,
					to: currentScopes.source,
				});
			}
			continue;
		}

		for (const scope of releasedScopes.scopes) {
			if (currentScopes.scopes.has(scope)) continue;
			if (isAllowed(credential, scope)) {
				usedAllowances.add(`${credential}|${scope}`);
				continue;
			}
			removals.push({ package: name, version, credential, scope });
		}
	}

	// Additions are walked over the current side so a brand new credential is
	// included. That is the case most likely to need a managed OAuth app to
	// consent, so it is the last one worth missing.
	for (const [credential, currentScopes] of current) {
		if (currentScopes.kind === 'opaque') continue;

		const releasedScopes = released.get(credential);
		if (releasedScopes?.kind === 'opaque') continue;

		for (const scope of currentScopes.scopes) {
			if (!releasedScopes?.scopes.has(scope)) additions.push({ credential, scope });
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

if (unreadable.length > 0) {
	summary([
		`### OAuth scope expressions changed (vs n8n@${release.version})`,
		'',
		...unreadable.flatMap((entry) => [
			`- \`${entry.credential}\``,
			`  - was: \`${entry.from}\``,
			`  - now: \`${entry.to}\``,
		]),
		'',
		'These credentials compute their scopes, so the set cannot be compared automatically. Check the credential diff and confirm no scope was dropped.',
	]);
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
