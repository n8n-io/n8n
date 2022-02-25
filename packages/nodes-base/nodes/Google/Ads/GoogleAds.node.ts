import {
	INodeType,
	INodeTypeDescription,

} from 'n8n-workflow';

import {analyticFields, analyticOperations } from './AnalyticDescription';

import {
	campaignFields,
	campaignOperations,
} from './CampaignDescription';

import {
	invoiceFields,
	invoiceOperations,
} from './InvoiceDescription';

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
			color: '#ff0000',
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
						url: '/v9/customers:listAccessibleCustomers',
					},
				},
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			//baseURL: 'https://googleads.googleapis.com',
			baseURL: 'https://agobrech.free.beeceptor.com',
			headers: {
				'developer-token': '={{$credentials.developerToken}}',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Analytics',
						value: 'analytic',
					},
				],
				default: 'campaign',
				description: 'The resource to operate on.',
			},
			//-------------------------------
			// Campaign Operations
			//-------------------------------
			...campaignOperations,
			...campaignFields,
			//-------------------------------
			// Invoice Operations
			//-------------------------------
			...invoiceOperations,
			...invoiceFields,
			//-------------------------------
			// Analytics Operations
			//-------------------------------
			...analyticOperations,
			...analyticFields,
		],
	};
}
