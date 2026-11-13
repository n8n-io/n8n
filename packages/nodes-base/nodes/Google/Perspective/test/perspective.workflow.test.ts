import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Perspective Node - request URLs', () => {
	beforeAll(() => {
		nock('https://commentanalyzer.googleapis.com')
			.post('/v1alpha1/comments:analyze')
			.reply(200, {
				attributeScores: {
					TOXICITY: { summaryScore: { value: 0.02, type: 'PROBABILITY' } },
				},
				languages: ['en'],
			});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googlePerspectiveOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/userinfo.email',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['perspective.workflow.json'],
	});
});
