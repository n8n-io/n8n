import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { campaignFields, campaignOperations } from './CampaignDescription';

export class GoogleAds implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Ads',
		name: 'googleAds',
		icon: 'file:googleAds.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Google Ads API',
		defaults: {
			name: 'Google Ads',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleAdsOAuth2Api',
				required: true,
				testedBy: {
					request: {
						method: 'GET',
						url: '/v13/customers:listAccessibleCustomers',
					},
				},
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			baseURL: 'https://googleads.googleapis.com',
			headers: {
				'developer-token': '={{$credentials.developerToken}}',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Campaign',
						value: 'campaign',
					},
				],
				default: 'campaign',
			},
			//-------------------------------
			// Campaign Operations
			//-------------------------------
			...campaignOperations,
			{
				displayName:
					'Divide field names expressed with <i>micros</i> by 1,000,000 to get the actual value',
				name: 'campaigsNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['campaign'],
					},
				},
			},
			...campaignFields,
		],
	};
}
