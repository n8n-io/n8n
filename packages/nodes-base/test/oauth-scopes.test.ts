import { jsonParse } from 'n8n-workflow';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Narrowing or removing an OAuth scope is a breaking change: existing credentials
 * keep the token they were issued, so the node starts failing for them, and putting
 * the scope back does not repair them (#28141 -> #36005 plus two backports). Nothing
 * in review makes a one-line scope edit look like that, and scopes now live in shared
 * files, so a single credential's change is easy to miss.
 *
 * This pins every default scope list. A scope change has to show up here, in one
 * file, which is also what makes it reviewable by the team that owns managed OAuth.
 * Run with UPDATE_OAUTH_SCOPES=1 to record an intended change; the fixture is
 * compared parsed, so the commit hook is free to reformat it.
 */

const FIXTURE = path.resolve(__dirname, 'oauth-scopes.json');

// Both packages n8n loads: an `extends` chain can cross the package boundary, and
// scope defaults live on either side of it. Reads generated `dist/**`.
const PACKAGE_DIRS = ['.', '../@n8n/nodes-langchain'].map((dir) =>
	path.resolve(__dirname, '..', dir),
);

type CredentialType = {
	name: string;
	extends?: string[];
	properties?: Array<{ name: string; default?: unknown }>;
};

const loadCredentials = (): Map<string, CredentialType> => {
	const all = PACKAGE_DIRS.flatMap((dir) =>
		jsonParse<CredentialType[]>(
			readFileSync(path.join(dir, 'dist/types/credentials.json'), 'utf8'),
		),
	);
	return new Map(all.map((credential) => [credential.name, credential]));
};

/** Properties of a credential including the ones it inherits, child wins. */
const resolveProperties = (
	credentials: Map<string, CredentialType>,
	name: string,
	seen = new Set<string>(),
): Map<string, unknown> => {
	const resolved = new Map<string, unknown>();
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
 * The literal fallback is the shipped scope set, so it is what gets pinned; anything
 * this cannot parse is pinned verbatim instead of being silently dropped.
 */
const scopeList = (rawDefault: string): string[] => {
	const fallback = /:\s*'([^']*)'\s*}}|:\s*"([^"]*)"\s*}}/.exec(rawDefault);
	const scopes = fallback
		? (fallback[1] ?? fallback[2])
		: rawDefault.startsWith('={{')
			? null
			: rawDefault;
	if (scopes === null) return [rawDefault];
	return scopes
		.split(/[\s,]+/)
		.filter(Boolean)
		.sort();
};

test('OAuth scope defaults match the recorded ones', () => {
	const credentials = loadCredentials();
	const current: Record<string, string[]> = {};

	for (const name of [...credentials.keys()].sort()) {
		const scope = resolveProperties(credentials, name).get('scope');
		if (typeof scope === 'string' && scope !== '') current[name] = scopeList(scope);
	}

	if (process.env.UPDATE_OAUTH_SCOPES) {
		writeFileSync(FIXTURE, `${JSON.stringify(current, null, '\t')}\n`);
	}

	expect(current).toEqual(jsonParse<Record<string, string[]>>(readFileSync(FIXTURE, 'utf8')));
});
