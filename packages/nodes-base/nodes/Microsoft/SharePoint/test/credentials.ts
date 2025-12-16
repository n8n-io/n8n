export const credentials = {
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
