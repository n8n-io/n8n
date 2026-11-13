import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const documentId = '1Xk7cR2mPq9sT4vW6yZ8bD0fH3jL5nQ7rU9wA2cE4gIk';

describe('Google Docs Node - request URLs', () => {
	beforeAll(() => {
		nock('https://www.googleapis.com')
			.post('/drive/v3/files', {
				name: 'Release notes',
				mimeType: 'application/vnd.google-apps.document',
				parents: ['1AbCdEfGhIjKlMnOpQrStUvWxYz012345'],
			})
			.reply(200, {
				id: documentId,
				name: 'Release notes',
				mimeType: 'application/vnd.google-apps.document',
			});

		nock('https://docs.googleapis.com')
			.get(`/v1/documents/${documentId}`)
			.times(2)
			.reply(200, { documentId, title: 'Release notes' })
			.post(`/v1/documents/${documentId}:batchUpdate`)
			.reply(200, { documentId, replies: [{}], writeControl: { requiredRevisionId: 'ALm37BW' } });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleDocsOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/documents',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['requests.workflow.json'],
	});
});
