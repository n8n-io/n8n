import { getOAuth2AuthHeaders } from '../src/oauth2-helpers';

describe('getOAuth2AuthHeaders', () => {
	it('signs with the top-level access token when no options are given', () => {
		const headers = getOAuth2AuthHeaders({ oauthTokenData: { access_token: 'token' } });

		expect(headers).toEqual({ Authorization: 'Bearer token' });
	});

	it('signs with the token at the configured property', () => {
		const headers = getOAuth2AuthHeaders(
			{
				oauthTokenData: {
					access_token: 'bot-token',
					authed_user: { access_token: 'user-token' },
				},
			},
			{ property: 'authed_user.access_token' },
		);

		expect(headers).toEqual({ Authorization: 'Bearer user-token' });
	});

	it('falls back to the top-level token when the configured property is absent', () => {
		const headers = getOAuth2AuthHeaders(
			{ oauthTokenData: { access_token: 'bot-token' } },
			{ property: 'authed_user.access_token' },
		);

		expect(headers).toEqual({ Authorization: 'Bearer bot-token' });
	});

	it('adds the access token under the configured additional header', () => {
		const headers = getOAuth2AuthHeaders(
			{ oauthTokenData: { access_token: 'token' } },
			{ keyToIncludeInAccessTokenHeader: 'X-Access-Token' },
		);

		expect(headers).toEqual({
			Authorization: 'Bearer token',
			'X-Access-Token': 'token',
		});
	});

	it('returns no headers when there is no usable token', () => {
		expect(getOAuth2AuthHeaders({ oauthTokenData: { access_token: '' } })).toEqual({});
		expect(getOAuth2AuthHeaders({})).toEqual({});
	});
});
