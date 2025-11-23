import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('GoogleAnalyticsV2', () => {
	const credentials = {
		googleAnalyticsOAuth2: {
			scope: '',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
			},
		},
	};

	describe('Report Resource - GA4 Get Operation', () => {
		beforeAll(() => {
			const mock = nock('https://analyticsdata.googleapis.com');

			mock.post('/v1beta/properties/123456789:runReport').reply(200, {
				dimensionHeaders: [{ name: 'date' }],
				metricHeaders: [{ name: 'totalUsers', type: 'TYPE_INTEGER' }],
				rows: [
					{
						dimensionValues: [{ value: '20240101' }],
						metricValues: [{ value: '100' }],
					},
				],
				rowCount: 1,
			});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['report-ga4-get.workflow.json'],
		});
	});

	describe('Report Resource - Universal Analytics Get Operation', () => {
		beforeAll(() => {
			const mock = nock('https://analyticsreporting.googleapis.com');

			mock.post('/v4/reports:batchGet').reply(200, {
				reports: [
					{
						columnHeader: {
							dimensions: ['ga:date'],
							metricHeader: {
								metricHeaderEntries: [
									{ name: 'ga:users', type: 'INTEGER' },
									{ name: 'ga:sessions', type: 'INTEGER' },
								],
							},
						},
						data: {
							rows: [
								{
									dimensions: ['20240101'],
									metrics: [{ values: ['100', '50'] }],
								},
							],
						},
					},
				],
			});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['report-universal-get.workflow.json'],
		});
	});

	describe('UserActivity Resource - Search Operation', () => {
		beforeAll(() => {
			const mock = nock('https://analyticsreporting.googleapis.com');

			mock.post('/v4/userActivity:search').reply(200, {
				sessions: [
					{
						sessionId: 'session123',
						deviceCategory: 'desktop',
						platform: 'web',
						dataSource: 'web',
						activities: [
							{
								activityTime: '2024-01-01T10:00:00Z',
								source: 'web',
								medium: 'organic',
								channelGrouping: 'Organic Search',
								campaign: 'spring_sale',
								keyword: 'analytics',
								hostname: 'example.com',
							},
						],
					},
				],
			});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['useractivity-search.workflow.json'],
		});
	});
});
