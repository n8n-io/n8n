#!/usr/bin/env node
/**
 * Fails when a change removes an OAuth scope that the released n8n still grants.
 *
 * Narrowing a scope cannot be undone: existing credentials keep the token they
 * were issued, so the node starts failing for them and restoring the scope later
 * does not repair it.
 *
 * The baseline is the released package, not master, because tokens only exist
 * for scopes that shipped: a scope added to master and removed again before
 * release breaks nobody. Running it as a required check on the PR is what makes
 * that safe, since a removal then cannot merge in the first place.
 *
 * Needs the local packages built (it reads their generated dist/types). Network
 * failures warn and exit 0: a CDN outage should not block a merge for a guard
 * against a rare mistake. Every outcome, including a skip, is written to the job
 * summary, so a dead check does not read as a passing one.
 *
 * Full rationale: https://linear.app/n8n/issue/ENT-370
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scopesByCredential, diffScopes } from './credential-scopes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const PACKAGES = [
	{ name: 'n8n-nodes-base', dir: path.resolve(here, '..') },
	{ name: '@n8n/n8n-nodes-langchain', dir: path.resolve(here, '../../@n8n/nodes-langchain') },
];

const ALLOWED_REMOVALS = path.resolve(here, '../credentials/scope-removals.json');
const TYPES_FILE = 'dist/types/credentials.json';
const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;

const report = (lines) => {
	console.log(lines.join('\n'));
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
	}
};

/** A skip leaves the check unenforced, so it has to be as visible as a finding. */
const skip = (message) => {
	console.log(`::warning::[check-released-scopes] ${message}`);
	report([`### OAuth scope check skipped`, '', message]);
};

const fetchJson = async (url) => {
	for (let attempt = 1; ; attempt++) {
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
			if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
			return await response.json();
		} catch (error) {
			if (attempt === ATTEMPTS) throw new Error(`${error.message} for ${url}`);
			// A transient 5xx or a rate limit needs a moment, not an instant retry.
			await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
		}
	}
};

const allowances = existsSync(ALLOWED_REMOVALS)
	? JSON.parse(readFileSync(ALLOWED_REMOVALS, 'utf8'))
	: [];
const used = new Set();
const isAllowed = (credential, { scope }) => {
	const entry = allowances.find(
		(candidate) => candidate.credential === credential && candidate.scope === scope,
	);
	if (!entry) return false;
	used.add(entry);
	return true;
};

let release;
try {
	release = await fetchJson('https://registry.npmjs.org/n8n/latest');
} catch (error) {
	skip(`could not resolve the released n8n version (${error.message}).`);
	process.exit(0);
}
const dependencies = release.dependencies ?? {};

// Both sides are resolved as one set of credentials per side, because `extends`
// crosses packages: langchain credentials inherit from nodes-base's `oAuth2Api`.
// Per-package resolution would silently miss an inherited scope default.
const baseline = [];
const local = [];
const checkedCredentials = new Set();
const compared = [];

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

	const version = dependencies[name];
	if (!version) {
		skip(`n8n@${release.version} does not depend on ${name}, so its scopes were not checked.`);
		continue;
	}

	let released;
	try {
		released = await fetchJson(
			`https://cdn.jsdelivr.net/npm/${name}@${encodeURIComponent(version)}/${TYPES_FILE}`,
		);
		if (!Array.isArray(released)) throw new Error('metadata is not an array of credentials');
	} catch (error) {
		skip(`could not read ${name}@${version} (${error.message}), so its scopes were not checked.`);
		continue;
	}

	baseline.push(...released);
	local.push(...JSON.parse(readFileSync(localFile, 'utf8')));
	for (const credential of released) checkedCredentials.add(credential.name);
	compared.push(`${name}@${version}`);
}

if (compared.length === 0) process.exit(0);

const { removals, advisories } = diffScopes(
	scopesByCredential(baseline),
	scopesByCredential(local),
	isAllowed,
);

for (const entry of allowances) {
	if (!used.has(entry) && checkedCredentials.has(entry.credential)) {
		console.log(
			`::warning::[check-released-scopes] the scope-removals.json entry for ${entry.credential} / ${entry.scope} no longer matches anything, it can be deleted`,
		);
	}
}

if (advisories.length > 0) {
	report([
		`### OAuth scope expressions changed (vs n8n@${release.version})`,
		'',
		...advisories.flatMap((entry) => [
			`- \`${entry.credential}\``,
			`  - was: \`${entry.from}\``,
			`  - now: \`${entry.to}\``,
		]),
		'',
		'These credentials compute their scopes, so the set cannot be compared automatically. Check the credential diff and confirm no scope was dropped.',
	]);
}

if (removals.length === 0) {
	report([
		`OAuth scopes checked against ${compared.join(', ')} (n8n@${release.version}): no scope removed.`,
	]);
	process.exit(0);
}

report([
	`### OAuth scopes removed (vs ${compared.join(', ')} from n8n@${release.version})`,
	'',
	...removals.map((entry) => `- \`${entry.credential}\`: \`${entry.scope}\``),
	'',
	'Every credential connected with a removed scope keeps failing after the change, and putting the scope back later does not repair them: those users have to reconnect.',
	'',
	'If the change is intended, ship it behind a new node version or with a migration note, and record it in `packages/nodes-base/credentials/scope-removals.json`:',
	'',
	'```json',
	'{ "credential": "…", "scope": "…", "pr": 0, "reason": "…" }',
	'```',
]);

process.exit(1);
