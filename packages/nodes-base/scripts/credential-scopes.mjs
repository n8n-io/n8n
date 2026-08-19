/**
 * Scope extraction for check-released-scopes.mjs, kept pure and separate so it
 * is testable without a network call or a build.
 */

/** Properties of a credential including inherited ones, child wins. */
export const resolveProperties = (credentials, name, seen = new Set()) => {
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
 * Matches the literal else-branch of a scope expression that ends in it, e.g.
 * `={{$self["customScopes"] ? $self["enabledScopes"] : "openid User.Read"}}`.
 *
 * Deliberately narrow. Loosening it to also match a literal followed by
 * chained calls (`... : "{resource}/.default").replace(...)}}`) makes it pick up
 * the wrong literal on the credentials that actually have that shape, and a
 * wrong scope set is far worse than an unparsed one: it reads as a removal of
 * every real scope. Anything this does not match is reported as opaque instead.
 */
const LITERAL_FALLBACK = /:\s*(['"])([^'"]*)\1\s*\}\}$/;

const splitScopes = (scopes) => new Set(scopes.split(/[\s,]+/).filter(Boolean));

/**
 * A credential's `scope` default is one of three shapes. The first two yield a
 * comparable scope set, the third does not:
 *
 * 1. A plain list: `'users:read webhooks:write'`, or comma separated.
 * 2. An n8n expression whose scope set is still recoverable, either because the
 *    literal else-branch is the whole tail (`={{... : "openid User.Read"}}`) or
 *    because the scopes are inline with interpolated parts
 *    (`=openid offline_access https://{{$self.region}}/.default`).
 * 3. An expression that computes its scopes (a chained `.replace()`, a nested
 *    ternary). There is no reliable way to read a scope set out of it without
 *    evaluating it, so it is returned as opaque and compared as a raw string.
 *
 * @returns {{kind: 'literal', scopes: Set<string>, source: string} | {kind: 'opaque', source: string}}
 */
export const parseScopeDefault = (rawDefault) => {
	const fallback = LITERAL_FALLBACK.exec(rawDefault);
	if (fallback) return { kind: 'literal', scopes: splitScopes(fallback[2]), source: rawDefault };

	// An n8n expression is marked by a leading `=`, which is not part of the
	// first scope. Without stripping it, `=openid ...` and `openid ...` compare
	// as a removal plus an addition.
	const expression = rawDefault.startsWith('=');
	const body = expression ? rawDefault.slice(1) : rawDefault;

	// `{{ }}` anywhere means parts of it are computed. Inline interpolation
	// (`https://{{$self.region}}/.default`) still splits into stable tokens, a
	// wrapper around the whole value does not.
	if (expression && body.trimStart().startsWith('{{')) {
		return { kind: 'opaque', source: rawDefault };
	}

	return { kind: 'literal', scopes: splitScopes(body), source: rawDefault };
};

/**
 * Every credential mapped to its parsed scope default, an empty literal set when
 * it declares no scopes. A credential that lost its scopes entirely has to stay
 * in the map: that is the worst removal there is, and skipping empties hides it.
 */
export const scopesByCredential = (list) => {
	const credentials = new Map(list.map((credential) => [credential.name, credential]));
	const scopes = new Map();
	for (const name of credentials.keys()) {
		const scope = resolveProperties(credentials, name).get('scope');
		scopes.set(
			name,
			typeof scope === 'string' && scope !== ''
				? parseScopeDefault(scope)
				: { kind: 'literal', scopes: new Set(), source: '' },
		);
	}
	return scopes;
};
