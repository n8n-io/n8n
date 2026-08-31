import { applyOAuth2RefreshToken } from '../src/oauth2-helpers';

describe('applyOAuth2RefreshToken', () => {
	it('copies the refreshed access token into the configured token property', () => {
		const tokenData = {
			access_token: 'new-user-token',
			authed_user: { access_token: 'stale-user-token' },
		};

		applyOAuth2RefreshToken(
			tokenData,
			{ access_token: 'new-user-token' },
			{
				property: 'authed_user.access_token',
				refreshProperty: 'access_token',
			},
		);

		expect(tokenData).toEqual({
			access_token: 'new-user-token',
			authed_user: { access_token: 'new-user-token' },
		});
	});
});
