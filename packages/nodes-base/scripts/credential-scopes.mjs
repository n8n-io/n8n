/**
 * Scope extraction for check-released-scopes.mjs, kept pure and separate so it
 * is testable without a network call or a build.
 */

/**
 * Properties of a credential including inherited ones, child wins. Mirrors
 * `mergeNodeProperties` (packages/workflow/src/node-helpers.ts): parents in
 * declaration order, then own properties. An extending credential's own
 * `doNotInherit` property resolves at no level, because the engine puts its own
 * properties through the same merge (`credentials-helper.ts` only short-circuits
 * for a credential with no `extends`, and none of those declares a `scope`).
 * `seen` is copied per branch so a shared ancestor still resolves for the second
 * parent.
 */
export const resolveProperties = (credentials, name, seen = new Set()) => {
	const resolved = new Map();
	if (seen.has(name)) return resolved;
	seen.add(name);

	const credential = credentials.get(name);
	for (const parent of credential?.extends ?? []) {
		for (const [key, value] of resolveProperties(credentials, parent, new Set(seen)))
			resolved.set(key, value);
	}
	for (const property of credential?.properties ?? []) {
		if (property.doNotInherit) continue;
		resolved.set(property.name, property.default);
	}
	return resolved;
};

/**
 * Matches the literal else-branch of a scope expression that ends in it, e.g.
 * `={{$self["customScopes"] ? $self["enabledScopes"] : "openid User.Read"}}`.
 * Only trusted for a single-conditional `={{...}}` wrapper, see below.
 */
const LITERAL_FALLBACK = /:\s*(['"])([^'"]*)\1\s*\}\}$/;

/**
 * One `={{...}}` around the whole value, with one conditional in it. A second
 * `{{` means literals sit outside the interpolation, and a second `?` means the
 * tail literal is the last branch of a chain rather than the whole scope set.
 * Either way the regex match would be a subset of the real scopes.
 */
const isSingleConditionalWrapper = (raw) =>
	raw.startsWith('={{') && raw.indexOf('{{', 3) === -1 && (raw.match(/\?/g) ?? []).length <= 1;

const splitScopes = (scopes) => new Set(scopes.split(/[\s,]+/).filter(Boolean));

/** Characters that can sit inside a scope, so a match on one is not a whole scope. */
const SCOPE_CHAR = '\\w.:/@~+-';

/**
 * Whether `source` still grants `scope`, as a whole token rather than a
 * substring: `issues:read` and `bread` do not keep `read` alive.
 */
const grantsScope = (source, scope) => {
	const escaped = scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(?:^|[^${SCOPE_CHAR}])${escaped}(?:[^${SCOPE_CHAR}]|$)`).test(source);
};

/**
 * A credential's `scope` default is one of two shapes:
 *
 * 1. A plain list: `'users:read webhooks:write'`, or comma separated.
 * 2. An expression. Only one form is readable: a single `={{...}}` wrapper with
 *    one conditional whose literal else-branch is the whole tail, which is what
 *    every credential with custom-scope support looks like. Everything else (a
 *    chained `.replace()`, string concatenation, literals spliced around several
 *    `{{...}}` blocks) is opaque and compared as a raw string.
 *
 * Anything else must stay opaque even when the regex happens to match: LinkedIn
 * is `=w_member_social{{...}}{{... : ",profile,email,openid"}}`, where the tail
 * literal is one conditional branch and not the scope set. Reporting
 * `{profile, email, openid}` there hides the removal of `w_member_social`, and a
 * wrong scope set is worse than an unparsed one.
 *
 * @returns {{kind: 'literal', scopes: Set<string>, source: string} | {kind: 'opaque', source: string}}
 */
export const parseScopeDefault = (rawDefault) => {
	if (isSingleConditionalWrapper(rawDefault)) {
		const fallback = LITERAL_FALLBACK.exec(rawDefault);
		return fallback
			? { kind: 'literal', scopes: splitScopes(fallback[2]), source: rawDefault }
			: { kind: 'opaque', source: rawDefault };
	}

	if (rawDefault.includes('{{')) return { kind: 'opaque', source: rawDefault };

	// A leading `=` marks an expression and is not part of the first scope.
	// Without stripping it, `=openid ...` and `openid ...` compare as a removal
	// plus an addition.
	return {
		kind: 'literal',
		scopes: splitScopes(rawDefault.replace(/^=/, '')),
		source: rawDefault,
	};
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

/**
 * Diffs two scope maps. Pure, so the decision of what fails is testable without
 * a network call or a build.
 *
 * A credential missing from `current` is skipped: that is a credential removal,
 * which has its own deprecation path and is not what this guards.
 *
 * `removals` fail the check. `advisories` are reported for a human to confirm,
 * and cover every change to a scope set that cannot be compared as a set. A
 * scope the released package granted is still caught when it disappears from a
 * newly computed expression, so becoming computed does not silently switch the
 * guard off.
 */
export const diffScopes = (released, current, isAllowed = () => false) => {
	const removals = [];
	const advisories = [];

	for (const [credential, before] of released) {
		const after = current.get(credential);
		if (!after) continue;

		// A readable scope set that became computed cannot be diffed as a set, but
		// each scope it used to grant is still a plain token: if one is gone from
		// the expression entirely, it was dropped. Restructuring that keeps every
		// scope (wrapping in parens, adding a `.replace()` for a placeholder,
		// switching to concatenation) leaves them all present and only reports.
		if (before.kind === 'literal' && after.kind === 'opaque') {
			for (const scope of before.scopes) {
				if (grantsScope(after.source, scope)) continue;
				if (isAllowed(credential, { scope })) continue;
				removals.push({ credential, scope });
			}
		}

		if (before.kind === 'opaque' || after.kind === 'opaque') {
			if (before.source !== after.source) {
				advisories.push({ credential, from: before.source, to: after.source });
			}
			continue;
		}

		for (const scope of before.scopes) {
			if (after.scopes.has(scope)) continue;
			if (isAllowed(credential, { scope })) continue;
			removals.push({ credential, scope });
		}
	}

	return { removals, advisories };
};
