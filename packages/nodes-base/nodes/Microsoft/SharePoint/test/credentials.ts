// NodeTestHarness preAuthentication is a no-op, so the Service Principal token POST to
// login.microsoftonline.com never fires — the credential's `authenticate` attaches
// `Bearer <accessToken>` straight from this fixture. Supply `accessToken` directly and
// nock only the scoped Graph endpoint (with the Bearer header), never login.microsoftonline.com.
export const credentials = {
	microsoftEntraServicePrincipalApi: {
		accessToken: 'test-access-token',
		authentication: 'clientSecret',
		tenantId: '11111111-1111-1111-1111-111111111111',
		clientId: '22222222-2222-2222-2222-222222222222',
		clientSecret: 'test-client-secret',
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
	microsoftSharePointOAuth2Api: {
		grantType: 'authorizationCode',
		authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
		accessTokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		clientId: 'CLIENT_ID',
		clientSecret: 'CLIENT_SECRET',
		scope: 'openid offline_access https://mydomain.sharepoint.com/.default',
		authQueryParameters: 'response_mode=query',
		authentication: 'body',
		oauthTokenData: {
			token_type: 'Bearer',
			scope:
				'https://mydomain.sharepoint.com/Sites.Manage.All https://mydomain.sharepoint.com/Sites.Read.All https://mydomain.sharepoint.com/Sites.ReadWrite.All https://mydomain.sharepoint.com/Sites.Selected https://mydomain.sharepoint.com/User.Read https://mydomain.sharepoint.com/.default',
			expires_in: 4763,
			ext_expires_in: 4763,
			access_token: 'ACCESSTOKEN',
			refresh_token: 'REFRESHTOKEN',
			id_token: 'IDTOKEN',
			callbackQueryString: {
				session_state: 'SESSIONSTATE',
			},
		},
		subdomain: 'mydomain',
		baseUrl: 'https://mydomain.sharepoint.com/_api/v2.0',
	},
};
