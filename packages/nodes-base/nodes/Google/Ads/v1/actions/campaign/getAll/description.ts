import {
	CampaignProperties,
} from '../../Interfaces';

export const campaignGetAllDescription: CampaignProperties = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'campaign',
				],
			},
		},
		default: true,
		description: 'Your Google Ads customer ID.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: 'true',
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Retrieve all campaigns',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'campaign',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return.',
	},
];
