import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Cloud Natural Language Node - request URLs', () => {
	beforeAll(() => {
		nock('https://language.googleapis.com')
			.post('/v1/documents:analyzeSentiment', {
				document: { type: 'PLAIN_TEXT', content: 'The new release works well.' },
				encodingType: 'UTF16',
			})
			.reply(200, { documentSentiment: { magnitude: 0.8, score: 0.8 }, language: 'en' });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleCloudNaturalLanguageOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/cloud-language',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['requests.workflow.json'],
	});
});
