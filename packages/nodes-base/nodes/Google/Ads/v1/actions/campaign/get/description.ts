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
];
