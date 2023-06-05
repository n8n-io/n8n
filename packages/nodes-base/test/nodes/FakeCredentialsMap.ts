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
} as const;
