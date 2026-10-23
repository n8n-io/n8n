import { describe, expect, test } from 'vitest';

import { diffScopes, parseScopeDefault, scopesByCredential } from './credential-scopes.mjs';

/**
 * Every expression below is the verbatim `scope` default of a released
 * credential. They are the whole reason this parser exists, so they are pinned
 * here rather than reduced to synthetic examples.
 */
const CALENDLY = 'users:read webhooks:read webhooks:write scheduled_events:read';
const ZOHO = 'ZohoCRM.modules.ALL,ZohoCRM.settings.all,ZohoCRM.users.all';
const TEAMS =
	'={{$self["customScopes"] ? $self["enabledScopes"] : "openid offline_access User.Read.All Group.ReadWrite.All Chat.ReadWrite ChannelMessage.Read.All"}}';
const AZURE_ENTRA = '={{ $self.customScopes ? $self.enabledScopes : "openid offline_access"}}';
const WEBFLOW = '={{$self["legacy"] ? "" : "cms:read cms:write sites:read forms:read"}}';
const LINKEDIN =
	'=w_member_social{{ $self["organizationSupport"] === true ? ",w_organization_social" : "" }}{{ $self["legacy"] === true ? ",r_liteprofile,r_emailaddress" : ",profile,email,openid" }}';
const SHAREPOINT =
	'={{($self["customScopes"] ? $self["enabledScopes"] : "openid offline_access https://{subdomain}.sharepoint.com/.default").replace(/\\{subdomain\\}/g, ($self["subdomain"] || "").trim())}}';
const AZURE_MONITOR =
	'={{(($self["customScopes"] && $self["enabledScopes"] && $self["enabledScopes"] !== "{resource}/.default") ? $self["enabledScopes"] : ($self["grantType"] === "clientCredentials" ? "{resource}/.default" : "")).replace(/\\{resource\\}/g, $self["resource"])}}';
const LINEAR =
	'={{"read write issues:create comments:create" + ($self["includeAdminScope"] ? " admin" : "") + ($self["actor"] === "app" ? " app:mentionable" : "")}}';

const literal = (raw) => {
	const parsed = parseScopeDefault(raw);
	expect(parsed.kind).toBe('literal');
	return [...parsed.scopes];
};

describe('parseScopeDefault', () => {
	test('splits a plain scope list on whitespace', () => {
		expect(literal(CALENDLY)).toEqual([
			'users:read',
			'webhooks:read',
			'webhooks:write',
			'scheduled_events:read',
		]);
	});

	test('splits a comma separated scope list', () => {
		expect(literal(ZOHO)).toEqual([
			'ZohoCRM.modules.ALL',
			'ZohoCRM.settings.all',
			'ZohoCRM.users.all',
		]);
	});

	test('reads the literal fallback out of a custom-scopes expression', () => {
		expect(literal(TEAMS)).toEqual([
			'openid',
			'offline_access',
			'User.Read.All',
			'Group.ReadWrite.All',
			'Chat.ReadWrite',
			'ChannelMessage.Read.All',
		]);
	});

	test('reads the fallback when the expression uses dot access and padding', () => {
		expect(literal(AZURE_ENTRA)).toEqual(['openid', 'offline_access']);
	});

	test('reads the fallback of a two-branch expression whose other branch is empty', () => {
		expect(literal(WEBFLOW)).toEqual(['cms:read', 'cms:write', 'sites:read', 'forms:read']);
	});

	test('strips the expression marker so it is not glued onto the first scope', () => {
		expect(literal('=openid offline_access')).toEqual(['openid', 'offline_access']);
	});

	describe('shapes that must stay opaque', () => {
		// Guessing here produces a scope set that is wrong, which reads as a
		// removal of every real scope. `source` has to survive verbatim: the
		// opaque report diffs the raw strings.
		test.each([
			// The tail literal is one conditional branch, not the scope set:
			// trusting it drops the unconditional `w_member_social`.
			['literals spliced around several interpolations (LinkedIn)', LINKEDIN],
			['a ternary with a chained .replace (SharePoint)', SHAREPOINT],
			['a nested ternary with a chained .replace (Azure Monitor)', AZURE_MONITOR],
			['string concatenation onto a literal (Linear)', LINEAR],
		])('%s', (_name, raw) => {
			expect(parseScopeDefault(raw)).toEqual({ kind: 'opaque', source: raw });
		});
	});
});

describe('scopesByCredential', () => {
	test('keeps a credential that declares no scope as an empty set rather than dropping it', () => {
		const scopes = scopesByCredential([{ name: 'noScopes', properties: [] }]);

		expect(scopes.get('noScopes')).toEqual({ kind: 'literal', scopes: new Set(), source: '' });
	});

	test('treats a declared but empty scope default as an empty set', () => {
		const scopes = scopesByCredential([
			{ name: 'emptyScope', properties: [{ name: 'scope', default: '' }] },
		]);

		expect(scopes.get('emptyScope')).toEqual({ kind: 'literal', scopes: new Set(), source: '' });
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

	test('inherits through a chain, as the Microsoft credentials do', () => {
		// azureStorageOAuth2Api -> microsoftOAuth2Api -> oAuth2Api
		const scopes = scopesByCredential([
			{ name: 'oAuth2Api', properties: [{ name: 'scope', default: '' }] },
			{ name: 'microsoftOAuth2Api', extends: ['oAuth2Api'], properties: [] },
			{
				name: 'azureStorageOAuth2Api',
				extends: ['microsoftOAuth2Api'],
				properties: [{ name: 'scope', default: 'https://storage.azure.com/.default' }],
			},
		]);

		expect([...scopes.get('azureStorageOAuth2Api').scopes]).toEqual([
			'https://storage.azure.com/.default',
		]);
	});

	test('does not inherit a doNotInherit property, matching the engine', () => {
		const scopes = scopesByCredential([
			{ name: 'base', properties: [{ name: 'scope', default: 'read', doNotInherit: true }] },
			{ name: 'child', extends: ['base'], properties: [] },
		]);

		expect(scopes.get('child').scopes).toEqual(new Set());
	});

	test('resolves a shared ancestor for every parent, not just the first', () => {
		// `right` has no scope of its own and only inherits `root`'s. If the cycle
		// guard were shared across branches, `left` would have consumed `root`
		// already, `right` would resolve to nothing, and the last parent would
		// stop winning.
		const scopes = scopesByCredential([
			{ name: 'root', properties: [{ name: 'scope', default: 'read' }] },
			{ name: 'left', extends: ['root'], properties: [{ name: 'scope', default: 'left-only' }] },
			{ name: 'right', extends: ['root'], properties: [] },
			{ name: 'diamond', extends: ['left', 'right'], properties: [] },
		]);

		expect([...scopes.get('diamond').scopes]).toEqual(['read']);
	});

	test('terminates on an extends cycle instead of recursing forever', () => {
		const scopes = scopesByCredential([
			{ name: 'a', extends: ['b'], properties: [] },
			{ name: 'b', extends: ['a'], properties: [{ name: 'scope', default: 'read' }] },
		]);

		expect([...scopes.get('a').scopes]).toEqual(['read']);
	});
});

describe('diffScopes', () => {
	const lit = (...scopes) => ({
		kind: 'literal',
		scopes: new Set(scopes),
		source: scopes.join(' '),
	});
	const opaque = (source) => ({ kind: 'opaque', source });
	const diff = (before, after, isAllowed) =>
		diffScopes(new Map([['cred', before]]), new Map([['cred', after]]), isAllowed);

	test('fails on a dropped scope', () => {
		expect(diff(lit('read', 'write'), lit('read')).removals).toEqual([
			{ credential: 'cred', scope: 'write' },
		]);
	});

	test('passes a dropped scope that is allow-listed', () => {
		const isAllowed = (credential, what) => credential === 'cred' && what.scope === 'write';

		expect(diff(lit('read', 'write'), lit('read'), isAllowed).removals).toEqual([]);
	});

	test('fails when becoming computed drops a scope out of the expression', () => {
		// Without this, making a scope default computed would silently switch the
		// guard off for that credential.
		expect(diff(lit('read', 'write'), opaque('={{f($self) + "read"}}')).removals).toEqual([
			{ credential: 'cred', scope: 'write' },
		]);
	});

	test('only reports when becoming computed keeps every scope', () => {
		// The shape three shipped Microsoft credentials use: wrap the literal and
		// substitute a placeholder. Nothing was dropped, so nothing should fail.
		const after = opaque(
			'={{($self["c"] ? $self["e"] : "read write {tenant}").replace(/x/g, "y")}}',
		);
		const { removals, advisories } = diff(lit('read', 'write'), after);

		expect(removals).toEqual([]);
		expect(advisories).toHaveLength(1);
	});

	describe('a scope survives becoming computed only as a whole token', () => {
		test.each([
			// The Teams incident this guard exists for: #28141 narrowed
			// `Group.ReadWrite.All` to `Group.Read.All`, which is not the same scope.
			['a longer scope that contains it', 'Group.Read.All', '={{"Group.ReadWrite.All"}}'],
			['a scope that ends with it', 'read', '={{"issues:read"}}'],
			['an unrelated word that contains it', 'read', '={{"bread"}}'],
		])('%s does not keep it alive', (_name, scope, source) => {
			expect(diff(lit(scope), opaque(source)).removals).toEqual([{ credential: 'cred', scope }]);
		});

		test.each([
			['quoted alongside others', 'read', '={{$self["c"] ? $self["e"] : "read write"}}'],
			['comma separated', 'openid', '={{"a,openid,b"}}'],
			[
				'a URL scope wrapped in a .replace',
				'https://storage.azure.com/.default',
				'={{("https://storage.azure.com/.default").replace(/x/g, "y")}}',
			],
			[
				'a scope carrying a placeholder',
				'https://{subdomain}.sharepoint.com/.default',
				'={{("https://{subdomain}.sharepoint.com/.default").replace(/a/g, $self["s"])}}',
			],
		])('%s keeps it', (_name, scope, source) => {
			expect(diff(lit(scope), opaque(source)).removals).toEqual([]);
		});
	});

	test('passes a scope dropped by a computed expression when it is allow-listed', () => {
		const isAllowed = (credential, what) => credential === 'cred' && what.scope === 'write';
		const { removals } = diff(lit('read', 'write'), opaque('={{f($self) + "read"}}'), isAllowed);

		expect(removals).toEqual([]);
	});

	test('reports a restructured expression as an advisory, not a failure', () => {
		const { removals, advisories } = diff(opaque('={{a()}}'), opaque('={{b()}}'));

		expect(removals).toEqual([]);
		expect(advisories).toEqual([{ credential: 'cred', from: '={{a()}}', to: '={{b()}}' }]);
	});

	test('says nothing when an expression is unchanged', () => {
		expect(diff(opaque('={{a()}}'), opaque('={{a()}}'))).toEqual({
			removals: [],
			advisories: [],
		});
	});

	test('reports an expression that became readable as an advisory', () => {
		const { removals, advisories } = diff(opaque('={{a()}}'), lit('read'));

		expect(removals).toEqual([]);
		expect(advisories).toHaveLength(1);
	});

	test('skips a credential that is gone entirely, which is a credential removal', () => {
		const released = new Map([['gone', lit('read')]]);

		expect(diffScopes(released, new Map())).toEqual({ removals: [], advisories: [] });
	});
});
