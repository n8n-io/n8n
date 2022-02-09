import {
	CampaignProperties,
} from '../../Interfaces';

export const campaignDescription: CampaignProperties = [
	{
		displayName: 'Query',
		name: 'queryGQL',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'custom',
				],
			},
		},
		description: 'Custom query to run against the campaign endpoint.',
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'custom',
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
					'custom',
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
