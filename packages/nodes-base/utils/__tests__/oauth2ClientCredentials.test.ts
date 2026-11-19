import type { IHttpRequestOptions } from 'n8n-workflow';

import {
	createClientCredentialsTokenSource,
	requestClientCredentialsToken,
} from '../oauth2ClientCredentials';

const config = {
	tokenUrl: 'https://idp.example.com/token',
	clientId: 'id',
	clientSecret: 'secret',
};

const respondWith = (body: unknown) => vi.fn().mockResolvedValue(body);

describe('requestClientCredentialsToken', () => {
	it('posts the grant form the token endpoint expects', async () => {
		const request = respondWith({ access_token: 'tok', expires_in: 120 });

		await requestClientCredentialsToken(request, { ...config, scope: 'registry:read' });

		const options = request.mock.calls[0][0] as IHttpRequestOptions;
		expect(options.method).toBe('POST');
		expect(String(options.url)).toBe('https://idp.example.com/token');
		expect(options.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
		expect(options.body).toEqual({
			grant_type: 'client_credentials',
			client_id: 'id',
			client_secret: 'secret',
			scope: 'registry:read',
		});
	});

	it.each([
		['no scope is set', undefined],
		['the scope is empty', ''],
		['the scope is only spaces', '   '],
	])('omits the scope when %s', async (_case, scope) => {
		const request = respondWith({ access_token: 'tok' });

		await requestClientCredentialsToken(request, { ...config, scope });

		expect((request.mock.calls[0][0] as IHttpRequestOptions).body).not.toHaveProperty('scope');
	});

	it.each([
		['the token URL is missing', { ...config, tokenUrl: undefined }],
		['the client ID is empty', { ...config, clientId: '' }],
		['the client secret is only spaces', { ...config, clientSecret: '  ' }],
	])('refuses to ask when %s', async (_case, incomplete) => {
		const request = respondWith({ access_token: 'tok' });

		await expect(requestClientCredentialsToken(request, incomplete)).rejects.toThrow(
			'Set the token URL, client ID and client secret',
		);
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		['the response has no token', {}],
		['the token is empty', { access_token: '' }],
		['the response is undefined', undefined],
	])('fails when %s', async (_case, body) => {
		await expect(requestClientCredentialsToken(respondWith(body), config)).rejects.toThrow(
			'returned no access token',
		);
	});

	it.each([
		['the endpoint states one', { access_token: 'tok', expires_in: 120 }, 120],
		['it states none', { access_token: 'tok' }, 3600],
		['it states nonsense', { access_token: 'tok', expires_in: 'soon' }, 3600],
		['it states zero', { access_token: 'tok', expires_in: 0 }, 3600],
		['it states a negative', { access_token: 'tok', expires_in: -60 }, 3600],
	])('takes the lifetime when %s', async (_case, body, expected) => {
		const { expiresInSeconds } = await requestClientCredentialsToken(respondWith(body), config);

		expect(expiresInSeconds).toBe(expected);
	});
});

describe('createClientCredentialsTokenSource', () => {
	it('asks once while the token is alive', async () => {
		const request = respondWith({ access_token: 'tok', expires_in: 3600 });
		const source = createClientCredentialsTokenSource(request, config, () => 0);

		expect(await source.getToken()).toBe('tok');
		expect(await source.getToken()).toBe('tok');

		expect(request).toHaveBeenCalledTimes(1);
	});

	it('asks again once the token expires, so a long activation keeps working', async () => {
		const request = vi
			.fn()
			.mockResolvedValueOnce({ access_token: 'first', expires_in: 60 })
			.mockResolvedValueOnce({ access_token: 'second', expires_in: 60 });
		let now = 0;
		const source = createClientCredentialsTokenSource(request, config, () => now);

		expect(await source.getToken()).toBe('first');
		now = 60_000;

		expect(await source.getToken()).toBe('second');
	});

	it('renews before the stated expiry, so a token in flight is not already dead', async () => {
		const request = vi
			.fn()
			.mockResolvedValueOnce({ access_token: 'first', expires_in: 60 })
			.mockResolvedValueOnce({ access_token: 'second', expires_in: 60 });
		let now = 0;
		const source = createClientCredentialsTokenSource(request, config, () => now);

		await source.getToken();
		now = 35_000;

		expect(await source.getToken()).toBe('second');
	});
});
