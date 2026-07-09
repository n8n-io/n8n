// Credential fixtures for the Teams harness (workflow) tests. The NodeTestHarness
// no-ops preAuthentication but still calls authenticate, so the Service Principal
// token POST never fires — the credential's `authenticate` attaches
// `Bearer <accessToken>` straight from this fixture. Supply `accessToken` inline
// and nock ONLY the Graph endpoint, never login.microsoftonline.com.
export const credentials = {
	microsoftTeamsOAuth2Api: {
		scope: 'openid',
		oauthTokenData: {
			access_token: 'token',
		},
	},
	microsoftEntraServicePrincipalApi: {
		accessToken: 'token',
		authentication: 'clientSecret',
		tenantId: '11111111-1111-1111-1111-111111111111',
		clientId: '22222222-2222-2222-2222-222222222222',
		clientSecret: 'test-client-secret',
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};
