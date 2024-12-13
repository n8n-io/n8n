// If your test needs data from credentials, you can add it here.
// as JSON.stringify({ id: 'credentials_ID', name: 'credentials_name' }) for specific credentials
// or as 'credentials_type' for all credentials of that type
// expected keys for credentials can be found in packages/nodes-base/credentials/[credentials_type].credentials.ts
export const FAKE_CREDENTIALS_DATA = {
	[JSON.stringify({ id: '20', name: 'Airtable account' })]: {
		apiKey: 'key456',
	},
	[JSON.stringify({ id: 'G45TOKX5kBEraTr1', name: 'JWT Auth test PEM' })]: {
		keyType: 'pemKey',
		privateKey: `
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCfw0m1K+M1/6Tw
CvLYDv0gmxa+reEdKBfT0/hfkkjFWqbMRo0f4CQ3PwrOavS+80PDy6nVL21BmGev
w1bF7KXmqOzr+yKOUJ8A4u6vXUQKzVSFBqb2YZmZL1s7va9aaO6pVANTbmYHpTjh
SBnBrXgidVOXNX1c+IG+OZZMiTFWg4lJTE9rvMbLh4o5FPwdZlA1rLAux4KXVNNr
mE7T5/tsuikR06KMJS6V6YR4PZmTsy/3D2clADXDCtbUdEe0eBYoUmRLMhRL6umq
h98Dsm5ZG+YB2dn0ThR/g7DPVwvmnrK2S5e4hpqFYxQ8V8pGx7dQLsc/utbvsn32
dctGivkFAgMBAAECggEABDB0QdZtRlC2S/8VgBnghFbcwVJA6WlQOqM/y43D77zh
S9D7yV6wxGwYRfJjCZDKcZtpECiGtmYfLeoy38zFSueaEtQKg23UxYqt1JZe/uOE
eFqEzUgg5XXq8AWY0AeZXoJP9gOalE++TpX76uq4EDtAXmIuL95qVIkhCk+8pfaR
avLcejnyYGSJAG1J9pXHNChXXDVPd7PrIa20A44osvusifVMlcIYM3qkv167ULzX
4nu2hZwlNxGKtpVPldFY/qu5S7SdLo/2BQinrMSSKRSFihA4Uuod8GK0+UwjE4gO
TD15bjqIcadlAYV6bn34sHnMU9hjhPB5NyXiINYdsQKBgQDNu0XFjYyAgwORaZYs
jVTJg+fQ9wM7xnlfxXCVb9eoOGF0blW9VjIEz8lLjmPlPFFVS+EPN0andHHqH4t5
SQZVZxgNMcodWs8BJTVZUkXa+IljHXT1Vkb2zvtH96ADzs3c43+tNpmKhjG3XK1U
rL/v8feU31nwQb7imOmYmzbHCQKBgQDGzJ/pRLByB24W6FRfHIItP81vVg5ckCXi
sIhzHUdUmTdVbdAxeS6IW2oAc/IuksvmiZMLYsm+sIFFePJQrBsoD41R5VsFcJqE
o5x0DUzbOzqaV4HPOHDniibudyryZKnBvkXlCjyCv4iPKaFhH4T1aB+wdK4pJPo2
fyABs2lFHQKBgQDHz6IFK+QREK3PdhA/twhpK65jWvUOAkbxyE3/JX/7xr6IGX02
hdfQqoqj0midRMbto+OzJol9q+/TZs3MfysimR1X+0qE1iSExUGaPfjQomC1He/x
M9l6bi7Jh+wmpp10cpQXhBb93jW9E8rYmWtVPNmsAn1UhlZBuCfwapd6GQKBgATM
f7ezzsaR41huN0ssdv/8oErluucFG8UDGegddtFV+X34bqQjFrp36nEkW15AcOeZ
vpDxy4js3dH9f2vvG6C172VgsffJphE5mdc7UvWf0mRTZHDKHf+Y2CO9gK3lPCvP
GgTTYG6PjQ5XpOuhRSZfYxRxXJrlp5yVKQKhgBMJAoGBAMc6ktd0iqHAYCW3d9QP
e618RiMlVIYZIUlLWAUQWQSf3linqMjo1rCbbI/lSxE216XwI/VBX50gg/Oy3aUl
CibHHk2aKGlxVxe0Huv5gcjbZgVh1EMi4oxh4600IrWRH1Uz5AleXnheNiappKnA
lOMhy99LXMlAOL7qOBnZHgrm
-----END PRIVATE KEY-----
		`,
		publicKey: `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn8NJtSvjNf+k8Ary2A79
IJsWvq3hHSgX09P4X5JIxVqmzEaNH+AkNz8Kzmr0vvNDw8up1S9tQZhnr8NWxeyl
5qjs6/sijlCfAOLur11ECs1UhQam9mGZmS9bO72vWmjuqVQDU25mB6U44UgZwa14
InVTlzV9XPiBvjmWTIkxVoOJSUxPa7zGy4eKORT8HWZQNaywLseCl1TTa5hO0+f7
bLopEdOijCUulemEeD2Zk7Mv9w9nJQA1wwrW1HRHtHgWKFJkSzIUS+rpqoffA7Ju
WRvmAdnZ9E4Uf4Owz1cL5p6ytkuXuIaahWMUPFfKRse3UC7HP7rW77J99nXLRor5
BQIDAQAB
-----END PUBLIC KEY-----
		`,
		algorithm: 'RS256',
	},
	airtableApi: {
		apiKey: 'key123',
	},
	gongApi: {
		baseUrl: 'https://api.gong.io',
		accessKey: 'accessKey123',
		accessKeySecret: 'accessKeySecret123',
	},
	gongOAuth2Api: {
		grantType: 'authorizationCode',
		authUrl: 'https://app.gong.io/oauth2/authorize',
		accessTokenUrl: 'https://app.gong.io/oauth2/generate-customer-token',
		clientId: 'CLIENTID',
		clientSecret: 'CLIENTSECRET',
		scope:
			'api:calls:read:transcript api:provisioning:read api:workspaces:read api:meetings:user:delete api:crm:get-objects api:data-privacy:delete api:crm:schema api:flows:write api:crm:upload api:meetings:integration:status api:calls:read:extensive api:meetings:user:update api:integration-settings:write api:settings:scorecards:read api:stats:scorecards api:stats:interaction api:stats:user-actions api:crm:integration:delete api:calls:read:basic api:calls:read:media-url api:digital-interactions:write api:crm:integrations:read api:library:read api:data-privacy:read api:users:read api:logs:read api:calls:create api:meetings:user:create api:stats:user-actions:detailed api:settings:trackers:read api:crm:integration:register api:provisioning:read-write api:engagement-data:write api:permission-profile:read api:permission-profile:write api:flows:read api:crm-calls:manual-association:read',
		authQueryParameters: '',
		authentication: 'header',
		oauthTokenData: {
			access_token: 'ACCESSTOKEN',
			refresh_token: 'REFRESHTOKEN',
			scope:
				'api:calls:read:transcript api:provisioning:read api:workspaces:read api:meetings:user:delete api:crm:get-objects api:data-privacy:delete api:crm:schema api:flows:write api:crm:upload api:meetings:integration:status api:calls:read:extensive api:meetings:user:update api:integration-settings:write api:settings:scorecards:read api:stats:scorecards api:stats:interaction api:stats:user-actions api:crm:integration:delete api:calls:read:basic api:calls:read:media-url api:digital-interactions:write api:crm:integrations:read api:library:read api:data-privacy:read api:users:read api:logs:read api:calls:create api:meetings:user:create api:stats:user-actions:detailed api:settings:trackers:read api:crm:integration:register api:provisioning:read-write api:engagement-data:write api:permission-profile:read api:permission-profile:write api:flows:read api:crm-calls:manual-association:read',
			token_type: 'bearer',
			expires_in: 86400,
			api_base_url_for_customer: 'https://api.gong.io',
		},
		baseUrl: 'https://api.gong.io',
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
	jwtAuth: {
		keyType: 'passphrase',
		secret: 'baz',
		algorithm: 'HS256',
	},
	telegramApi: {
		accessToken: 'testToken',
		baseUrl: 'https://api.telegram.org',
	},
	notionApi: {
		apiKey: 'key123',
	},
} as const;
