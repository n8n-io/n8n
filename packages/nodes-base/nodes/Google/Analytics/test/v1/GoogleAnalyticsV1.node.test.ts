import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('GoogleAnalyticsV1 - request URLs', () => {
	beforeAll(() => {
		nock('https://analyticsreporting.googleapis.com')
			.post('/v4/reports:batchGet')
			.reply(200, {
				reports: [
					{
						columnHeader: {
							dimensions: ['ga:date'],
							metricHeader: { metricHeaderEntries: [{ name: 'ga:users', type: 'INTEGER' }] },
						},
						data: { rows: [{ dimensions: ['20240101'], metrics: [{ values: ['100'] }] }] },
					},
				],
			})
			.post('/v4/userActivity:search')
			.reply(200, {
				sessions: [
					{
						sessionId: '1712345678',
						deviceCategory: 'desktop',
						platform: 'Windows',
						dataSource: 'web',
						activities: [],
					},
				],
			});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleAnalyticsOAuth2: {
				scope: '',
				oauthTokenData: { access_token: 'ACCESSTOKEN' },
			},
		},
		workflowFiles: ['request-urls.workflow.json'],
	});
});
