import { descriptions } from './../../SyncroMSP/v1/actions/ticket/index';
import {
	INodeType,
	INodeTypeDescription,

} from 'n8n-workflow';

import {
	campaignFields,
	campaignOperations,
} from './CampaignDescription';

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
			},
		],
		requestDefaults: {
			baseURL: 'https://googleads.googleapis.com',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
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
				],
				default: 'Campaign',
				description: 'The resource to operate on.',
			},
			...campaignOperations,
			...campaignFields,
		],
	};
}
