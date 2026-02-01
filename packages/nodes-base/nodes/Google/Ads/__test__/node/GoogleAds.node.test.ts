import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import getResult from './fixtures/get.json';
import getManyResult from './fixtures/getMany.json';

describe('Google Ads Node', () => {
	const credentials = {
		googleAdsOAuth2Api: {
			oauthTokenData: {
				access_token: 'access-token',
			},
			developerToken: 'test-developer-token',
		},
	};

	describe('get', () => {
		const googleAdsNock = nock('https://googleads.googleapis.com');

		beforeAll(() => {
			googleAdsNock
				.post('/v20/customers/4445556666/googleAds:search', {
					query:
						'select ' +
						'campaign.id, ' +
						'campaign.name, ' +
						'campaign_budget.amount_micros, ' +
						'campaign_budget.period,' +
						'campaign.status,' +
						'campaign.optimization_score,' +
						'campaign.advertising_channel_type,' +
						'campaign.advertising_channel_sub_type,' +
						'metrics.impressions,' +
						'metrics.interactions,' +
						'metrics.interaction_rate,' +
						'metrics.average_cost,' +
						'metrics.cost_micros,' +
						'metrics.conversions,' +
						'metrics.cost_per_conversion,' +
						'metrics.conversions_from_interactions_rate,' +
						'metrics.video_views,' +
						'metrics.average_cpm,' +
						'metrics.ctr ' +
						'from campaign ' +
						'where campaign.id = 12345678901',
				})
				.matchHeader('login-customer-id', '1112223333')
				.reply(200, getResult);
		});

		afterAll(() => googleAdsNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['get.workflow.json'],
		});
	});

	describe('getMany', () => {
		const googleAdsNock = nock('https://googleads.googleapis.com');

		beforeAll(() => {
			googleAdsNock
				.post('/v20/customers/4445556666/googleAds:search', {
					query:
						'select ' +
						'campaign.id, ' +
						'campaign.name, ' +
						'campaign_budget.amount_micros, ' +
						'campaign_budget.period,' +
						'campaign.status,' +
						'campaign.optimization_score,' +
						'campaign.advertising_channel_type,' +
						'campaign.advertising_channel_sub_type,' +
						'metrics.impressions,' +
						'metrics.interactions,' +
						'metrics.interaction_rate,' +
						'metrics.average_cost,' +
						'metrics.cost_micros,' +
						'metrics.conversions,' +
						'metrics.cost_per_conversion,' +
						'metrics.conversions_from_interactions_rate,' +
						'metrics.video_views,' +
						'metrics.average_cpm,' +
						'metrics.ctr ' +
						'from campaign ' +
						'where campaign.id > 0  ',
				})
				.matchHeader('login-customer-id', '1112223333')
				.reply(200, getManyResult);

			googleAdsNock
				.post('/v20/customers/4445556666/googleAds:search', {
					query:
						'select ' +
						'campaign.id, ' +
						'campaign.name, ' +
						'campaign_budget.amount_micros, ' +
						'campaign_budget.period,' +
						'campaign.status,' +
						'campaign.optimization_score,' +
						'campaign.advertising_channel_type,' +
						'campaign.advertising_channel_sub_type,' +
						'metrics.impressions,' +
						'metrics.interactions,' +
						'metrics.interaction_rate,' +
						'metrics.average_cost,' +
						'metrics.cost_micros,' +
						'metrics.conversions,' +
						'metrics.cost_per_conversion,' +
						'metrics.conversions_from_interactions_rate,' +
						'metrics.video_views,' +
						'metrics.average_cpm,' +
						'metrics.ctr ' +
						'from campaign ' +
						'where campaign.id > 0 ' +
						' and segments.date DURING LAST_7_DAYS ' +
						" and campaign.status = 'ENABLED'",
				})
				.matchHeader('login-customer-id', '1112223333')
				.reply(200, getManyResult);

			googleAdsNock
				.post('/v20/customers/4445556666/googleAds:search', {
					query:
						'select ' +
						'campaign.id, ' +
						'campaign.name, ' +
						'campaign_budget.amount_micros, ' +
						'campaign_budget.period,' +
						'campaign.status,' +
						'campaign.optimization_score,' +
						'campaign.advertising_channel_type,' +
						'campaign.advertising_channel_sub_type,' +
						'metrics.impressions,' +
						'metrics.interactions,' +
						'metrics.interaction_rate,' +
						'metrics.average_cost,' +
						'metrics.cost_micros,' +
						'metrics.conversions,' +
						'metrics.cost_per_conversion,' +
						'metrics.conversions_from_interactions_rate,' +
						'metrics.video_views,' +
						'metrics.average_cpm,' +
						'metrics.ctr ' +
						'from campaign ' +
						'where campaign.id > 0  ' +
						" and campaign.status = 'REMOVED'",
				})
				.matchHeader('login-customer-id', '1112223333')
				.reply(200, { ...getManyResult, results: undefined });
		});

		afterAll(() => googleAdsNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getMany.workflow.json'],
		});
	});
});
