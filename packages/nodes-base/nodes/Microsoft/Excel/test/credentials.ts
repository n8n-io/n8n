// preAuthentication is a no-op in the harness, so `authenticate` attaches Bearer <accessToken>
// from this fixture — nock the scoped Graph endpoint, not login.microsoftonline.com.
export const credentials = {
	microsoftExcelOAuth2Api: {
		scope: 'openid',
		oauthTokenData: {
			access_token: 'token',
		},
	},
	microsoftEntraServicePrincipalApi: {
		accessToken: 'test-access-token',
		authentication: 'clientSecret',
		tenantId: '11111111-1111-1111-1111-111111111111',
		clientId: '22222222-2222-2222-2222-222222222222',
		clientSecret: 'test-client-secret',
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};
