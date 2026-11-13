import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Business Profile Trigger - request URLs', () => {
	beforeAll(() => {
		nock('https://mybusiness.googleapis.com')
			.get('/v4/accounts/104578213969250394851/locations/7183021945602238911/reviews')
			.query({ pageSize: 1 })
			.reply(200, {
				reviews: [
					{
						name: 'accounts/104578213969250394851/locations/7183021945602238911/reviews/AbFvOqk3Lm9',
						reviewId: 'AbFvOqk3Lm9',
						starRating: 'FIVE',
						comment: 'Friendly staff and quick service.',
					},
				],
				totalReviewCount: 1,
			});
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
		workflowFiles: ['trigger.workflow.json'],
	});
});
