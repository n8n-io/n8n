export const credentials = {
	azureStorageOAuth2Api: {
		grantType: 'authorizationCode',
		authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
		accessTokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		clientId: 'CLIENTID',
		clientSecret: 'CLIENTSECRET',
		scope: 'https://storage.azure.com/user_impersonation',
		authQueryParameters: 'response_mode=query',
		authentication: 'body',
		oauthTokenData: {
			token_type: 'Bearer',
			scope: 'https://storage.azure.com/user_impersonation',
			expires_in: 4730,
			ext_expires_in: 4730,
			access_token: 'ACCESSTOKEN',
			callbackQueryString: {
				session_state: 'SESSIONSTATE',
			},
		},
		account: 'myaccount',
		baseUrl: 'https://myaccount.blob.core.windows.net',
	},
	azureStorageSharedKeyApi: {
		account: 'devstoreaccount1',
		key: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
		baseUrl: 'https://myaccount.blob.core.windows.net',
	},
};
