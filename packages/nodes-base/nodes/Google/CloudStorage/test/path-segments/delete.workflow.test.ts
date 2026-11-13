import { NodeTestHarness } from '@nodes-testing/node-test-harness';

describe('Google Cloud Storage > Object > Delete > Path segments', () => {
	new NodeTestHarness().setupTests({
		credentials: {
			googleCloudStorageOAuth2Api: { oauthTokenData: { access_token: 'access-token' } },
		},
	});
});
