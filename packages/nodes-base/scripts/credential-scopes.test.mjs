import { describe, expect, test } from 'vitest';

import { parseScopeDefault, scopesByCredential } from './credential-scopes.mjs';

/**
 * The scope defaults below are the real shapes shipped by credentials today.
 * They are the whole reason this parser exists, so they are pinned here rather
 * than reduced to synthetic examples.
 */
const literal = (raw) => {
	const parsed = parseScopeDefault(raw);
	expect(parsed.kind).toBe('literal');
	return [...parsed.scopes];
};

describe('parseScopeDefault', () => {
	test('splits a plain scope list on whitespace', () => {
		expect(literal('users:read webhooks:read webhooks:write')).toEqual([
			'users:read',
			'webhooks:read',
			'webhooks:write',
		]);
	});

	test('splits a comma separated scope list', () => {
		expect(literal('ZohoCRM.modules.ALL,ZohoCRM.settings.all')).toEqual([
			'ZohoCRM.modules.ALL',
			'ZohoCRM.settings.all',
		]);
	});

	test('reads the literal fallback out of a custom-scopes expression', () => {
		expect(
			literal('={{$self["customScopes"] ? $self["enabledScopes"] : "openid User.Read"}}'),
		).toEqual(['openid', 'User.Read']);
	});

	test('strips the expression marker so it is not glued onto the first scope', () => {
		// Regression: `=openid ...` used to parse as the scope `=openid`, so
		// switching a credential between the plain and expression forms of the
		// same scopes reported one removal and one addition.
		expect(literal('=openid offline_access https://{{$self.region}}/.default')).toEqual([
			'openid',
			'offline_access',
			'https://{{$self.region}}/.default',
		]);
	});

	test('compares equal across the plain and expression forms of the same scopes', () => {
		expect(literal('=openid offline_access')).toEqual(literal('openid offline_access'));
	});

	test('reports an expression that computes its scopes as opaque', () => {
		// Anything that chains onto the ternary cannot be read reliably. Guessing
		// here would produce a scope set that is wrong, which reads as a removal
		// of every real scope, so it has to stay unparsed.
		const raw =
			'={{(($self["customScopes"] && $self["enabledScopes"]) ? $self["enabledScopes"] : "openid offline_access https://{subdomain}/.default").replace(/\\{subdomain\\}/g, $self["subdomain"])}}';
		expect(parseScopeDefault(raw).kind).toBe('opaque');
	});

	test('reports a whole-value expression wrapper as opaque', () => {
		const raw = '={{$self["legacy"] ? "" : "cms:read cms:write"}}';
		// This one does end in its literal, so it is readable.
		expect(literal(raw)).toEqual(['cms:read', 'cms:write']);

		const computed = '={{$self["resource"].split(",").map((s) => s.trim()).join(" ")}}';
		expect(parseScopeDefault(computed).kind).toBe('opaque');
	});
});

describe('scopesByCredential', () => {
	test('keeps a credential with no scopes as an empty set rather than dropping it', () => {
		const scopes = scopesByCredential([{ name: 'noScopes', properties: [] }]);

		expect(scopes.get('noScopes')).toEqual({ kind: 'literal', scopes: new Set(), source: '' });
	});

	test('inherits scopes through extends, with the child winning', () => {
		const scopes = scopesByCredential([
			{ name: 'base', properties: [{ name: 'scope', default: 'read' }] },
			{ name: 'child', extends: ['base'], properties: [] },
			{
				name: 'override',
				extends: ['base'],
				properties: [{ name: 'scope', default: 'read write' }],
			},
		]);

		expect([...scopes.get('child').scopes]).toEqual(['read']);
		expect([...scopes.get('override').scopes]).toEqual(['read', 'write']);
	});
});
