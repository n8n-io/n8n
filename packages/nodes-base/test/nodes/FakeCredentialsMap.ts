// If your test needs data from credentials, you can add it here.
// as JSON.stringify({ id: 'credentials_ID', name: 'credentials_name' }) for specific credentials
// or as 'credentials_type' for all credentials of that type
// expected keys for credentials can be found in packages/nodes-base/credentials/[credentials_type].credentials.ts
export const FAKE_CREDENTIALS_DATA = {
	[JSON.stringify({ id: '20', name: 'Airtable account' })]: {
		apiKey: 'key456',
	},
	airtableApi: {
		apiKey: 'key123',
	},
	n8nApi: {
		apiKey: 'key123',
		baseUrl: 'https://test.app.n8n.cloud/api/v1',
	},
	npmApi: {
		accessToken: 'fake-npm-access-token',
		registryUrl: 'https://fake.npm.registry',
	},
	totpApi: {
		label: 'GitHub:john-doe',
		secret: 'BVDRSBXQB2ZEL5HE',
	},
	aws: {
		region: 'eu-central-1',
		accessKeyId: 'key',
		secretAccessKey: 'secret',
	},
	twitterOAuth2Api: {
		grantType: 'pkce',
		authUrl: 'https://twitter.com/i/oauth2/authorize',
		accessTokenUrl: 'https://api.twitter.com/2/oauth2/token',
		clientId: 'CLIENTID',
		clientSecret: 'CLIENTSECRET',
		scope:
			'tweet.read users.read tweet.write tweet.moderate.write users.read follows.read follows.write offline.access like.read like.write dm.write dm.read list.read list.write',
		authQueryParameters: '',
		authentication: 'header',
		oauthTokenData: {
			token_type: 'bearer',
			expires_in: 7200,
			access_token: 'ACCESSTOKEN',
			scope:
				'tweet.moderate.write follows.read offline.access list.write dm.read list.read tweet.write like.write like.read users.read dm.write tweet.read follows.write',
			refresh_token: 'REFRESHTOKEN',
		},
	},
} as const;
