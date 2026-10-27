import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { applyTemplatedAuth, resolveTemplatedAuth } from '../templated-auth';

const credentialData = (
	template: object,
	placeholderValues: object = {},
	placeholderDefs?: object[],
): ICredentialDataDecryptedObject => ({
	template: JSON.stringify(template),
	placeholderValues: JSON.stringify(placeholderValues),
	...(placeholderDefs ? { placeholderDefs: JSON.stringify(placeholderDefs) } : {}),
});

describe('resolveTemplatedAuth', () => {
	it('should resolve placeholders in headers, query and nested body values', () => {
		const result = resolveTemplatedAuth(
			credentialData(
				{
					headers: { Authorization: 'Bearer {{api_key}}', 'api-version': '{{api_version}}' },
					qs: { apikey: '{{api_key}}' },
					body: { auth: { token: '{{api_key}}' } },
				},
				{ api_key: 'secret-key', api_version: '202404' },
			),
		);

		expect(result).toEqual({
			headers: { Authorization: 'Bearer secret-key', 'api-version': '202404' },
			qs: { apikey: 'secret-key' },
			body: { auth: { token: 'secret-key' } },
		});
	});

	it('should resolve multiple placeholders within one string', () => {
		const result = resolveTemplatedAuth(
			credentialData(
				{ headers: { 'X-Auth': '{{user}}:{{ token }}' } },
				{ user: 'bot', token: 'abc' },
			),
		);

		expect(result.headers).toEqual({ 'X-Auth': 'bot:abc' });
	});

	it('should leave parts without placeholders untouched', () => {
		const result = resolveTemplatedAuth(
			credentialData({ headers: { Accept: 'application/json' }, qs: { page: 1 } }),
		);

		expect(result).toEqual({ headers: { Accept: 'application/json' }, qs: { page: 1 } });
	});

	it('should throw when a placeholder has no value', () => {
		expect(() =>
			resolveTemplatedAuth(credentialData({ headers: { 'X-Key': '{{api_key}}' } })),
		).toThrow('No value set for placeholder {{api_key}}');
	});

	it('should throw when a placeholder value is empty', () => {
		expect(() =>
			resolveTemplatedAuth(
				credentialData({ headers: { 'X-Key': '{{api_key}}' } }, { api_key: '' }),
			),
		).toThrow('No value set for placeholder {{api_key}}');
	});

	it('should throw when a placeholder value is not a plain value', () => {
		expect(() =>
			resolveTemplatedAuth(
				credentialData({ headers: { 'X-Key': '{{api_key}}' } }, { api_key: { nested: true } }),
			),
		).toThrow('must be a plain value');
	});

	it.each(['constructor', 'toString'])('should not resolve inherited %s values', (name) => {
		expect(() =>
			resolveTemplatedAuth(credentialData({ headers: { Authorization: `{{${name}}}` } })),
		).toThrow(`No value set for placeholder {{${name}}}`);
	});

	it('should throw on invalid template JSON', () => {
		expect(() => resolveTemplatedAuth({ template: 'not json', placeholderValues: '{}' })).toThrow(
			'Invalid Simplified Custom Auth template JSON',
		);
	});

	it.each([
		['array', []],
		['string', 'headers'],
	])('should reject a template parsed as a %s', (_, template) => {
		expect(() =>
			resolveTemplatedAuth({ template: JSON.stringify(template), placeholderValues: '{}' }),
		).toThrow('Simplified Custom Auth template must be a JSON object');
	});

	it.each(['headers', 'body', 'qs'])('should reject non-object template %s', (partName) => {
		expect(() => resolveTemplatedAuth(credentialData({ [partName]: 'invalid' }))).toThrow(
			`Simplified Custom Auth template ${partName} must be a JSON object`,
		);
	});

	it.each([
		['array', []],
		['string', 'secret'],
	])('should reject placeholder values parsed as a %s', (_, placeholderValues) => {
		expect(() =>
			resolveTemplatedAuth({
				template: '{}',
				placeholderValues: JSON.stringify(placeholderValues),
			}),
		).toThrow('Simplified Custom Auth placeholder values must be a JSON object');
	});

	it('should keep reserved JSON keys as plain own properties', () => {
		const result = resolveTemplatedAuth({
			template: '{"headers":{"__proto__":{"polluted":"{{value}}"}}}',
			placeholderValues: '{"value":"x"}',
		});

		const headers = result.headers as object;
		expect(Object.getOwnPropertyDescriptor(headers, '__proto__')?.value).toEqual({
			polluted: 'x',
		});
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it('should resolve an empty credential to no request parts', () => {
		expect(resolveTemplatedAuth({})).toEqual({});
	});

	describe('optional placeholders', () => {
		const defs = [
			{ name: 'api_key', title: 'API key' },
			{ name: 'org', title: 'Organization', optional: true },
		];

		it('should omit template entries referencing an empty optional placeholder', () => {
			const result = resolveTemplatedAuth(
				credentialData(
					{
						headers: { Authorization: 'Key {{api_key}}', 'X-Org': '{{org}}' },
						qs: { org: '{{org}}' },
					},
					{ api_key: 'secret' },
					defs,
				),
			);

			expect(result).toEqual({ headers: { Authorization: 'Key secret' }, qs: {} });
		});

		it('should substitute an optional placeholder normally when a value is set', () => {
			const result = resolveTemplatedAuth(
				credentialData(
					{ headers: { Authorization: 'Key {{api_key}}', 'X-Org': '{{org}}' } },
					{ api_key: 'secret', org: 'acme' },
					defs,
				),
			);

			expect(result.headers).toEqual({ Authorization: 'Key secret', 'X-Org': 'acme' });
		});

		it('should omit a mixed entry when its optional placeholder is empty, even with statics', () => {
			const result = resolveTemplatedAuth(
				credentialData(
					{ headers: { Authorization: 'Key {{api_key}}', 'X-Scope': 'org:{{org}}' } },
					{ api_key: 'secret', org: '' },
					defs,
				),
			);

			expect(result.headers).toEqual({ Authorization: 'Key secret' });
		});

		it('should omit an entry before resolving its other missing placeholders', () => {
			const result = resolveTemplatedAuth(
				credentialData({ headers: { 'X-Scope': '{{org}}:{{api_key}}' } }, {}, defs),
			);

			expect(result.headers).toEqual({});
		});

		it('should still fail closed for empty required placeholders', () => {
			expect(() =>
				resolveTemplatedAuth(
					credentialData({ headers: { 'X-Key': '{{api_key}}' } }, { api_key: '' }, defs),
				),
			).toThrow('No value set for placeholder {{api_key}}');
		});

		it('should treat markers as required when the defs are unparseable', () => {
			expect(() =>
				resolveTemplatedAuth({
					template: JSON.stringify({ headers: { 'X-Org': '{{org}}' } }),
					placeholderValues: '{}',
					placeholderDefs: 'not json',
				}),
			).toThrow('No value set for placeholder {{org}}');
		});
	});
});

describe('applyTemplatedAuth', () => {
	const credentials = credentialData({ body: { token: '{{api_key}}' } }, { api_key: 'secret' });

	it('should merge a body template into an object body', () => {
		const requestOptions = { body: { payload: true } };

		applyTemplatedAuth(credentials, requestOptions);

		expect(requestOptions.body).toEqual({ payload: true, token: 'secret' });
	});

	it.each([
		['raw', 'payload'],
		['binary', Buffer.from('payload')],
	])('should reject a %s request body', (_, body) => {
		expect(() => applyTemplatedAuth(credentials, { body })).toThrow(
			'Simplified Custom Auth body templates cannot be applied to non-object request bodies',
		);
	});
});
