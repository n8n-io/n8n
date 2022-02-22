import {
	CampaignProperties,
} from '../../Interfaces';

export const campaignDescription: CampaignProperties = [
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Get the campaign via the ID',
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Use the customer ID to specify which customer the campaign belongs to.',
	},
	{
		displayName: 'Developer Token',
		name: 'devToken',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'campaign',
				],
			},
		},
		default: '',
		description: 'Your Google Ads developer token.',
	},

];
