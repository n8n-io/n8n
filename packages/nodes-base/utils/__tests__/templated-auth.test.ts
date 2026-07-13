import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { resolveTemplatedAuth } from '../templated-auth';

const credentialData = (
	template: object,
	placeholderValues: object = {},
): ICredentialDataDecryptedObject => ({
	template: JSON.stringify(template),
	placeholderValues: JSON.stringify(placeholderValues),
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

	it('should throw on invalid template JSON', () => {
		expect(() => resolveTemplatedAuth({ template: 'not json', placeholderValues: '{}' })).toThrow(
			'Invalid Templated Custom Auth template JSON',
		);
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
});
