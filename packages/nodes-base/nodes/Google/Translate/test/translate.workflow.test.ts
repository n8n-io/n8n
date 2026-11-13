import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Translate Node - request URLs', () => {
	beforeAll(() => {
		nock('https://translation.googleapis.com')
			.post('/language/translate/v2', { q: 'Good morning', target: 'de' })
			.reply(200, {
				data: {
					translations: [{ translatedText: 'Guten Morgen', detectedSourceLanguage: 'en' }],
				},
			});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleTranslateOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/cloud-translation',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['translate.workflow.json'],
	});
});
