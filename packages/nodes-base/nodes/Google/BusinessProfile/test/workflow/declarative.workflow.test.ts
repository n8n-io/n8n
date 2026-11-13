import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Business Profile - declarative request URLs', () => {
	const account = 'accounts/104578213969250394851';
	const location = 'locations/7183021945602238911';

	beforeAll(() => {
		nock('https://mybusiness.googleapis.com')
			.get(`/v4/${account}/${location}/reviews/AbFvOqk3Lm9`)
			.reply(200, { reviewId: 'AbFvOqk3Lm9' })
			.get(`/v4/${account}/${location}/localPosts/3`)
			.reply(200, { name: `${account}/${location}/localPosts/3` });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleBusinessProfileOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/business.manage',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['declarative.workflow.json'],
	});
});
