import {
	INodeProperties
} from 'n8n-workflow';

export const analyticOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'analytic',
				],
			},
		},
		options: [
			{
				name: 'Get Analytics',
				value: 'getAnalytics',
				description: 'Returns analytics regarding a campaign.',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/v9/customers/" + $parameter["clientCustomerId"] + "/googleAds:search"}}',
						body: {
							query: 'SELECT metrics.average_cost, metrics.average_page_views, metrics.active_view_ctr, metrics.active_view_cpm, metrics.clicks, metrics.content_impression_share, metrics.impressions, campaign.id FROM campaign',
						},
						headers: {
							'login-customer-id': '={{$parameter["managerCustomerId"]}}',
						},
					},
				},
			},
		],
		default: 'getAnalytics',
		description: 'The operation to perform.',
	},
];

export const analyticFields: INodeProperties[] = [
	{
		displayName: 'Manager Customer ID',
		name: 'managerCustomerId',
		type: 'string',
		required: true,
		placeholder: '9998887777',
		displayOptions: {
			show: {
				resource: [
					'analytic',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Client Customer ID',
		name: 'clientCustomerId',
		type: 'string',
		required: true,
		placeholder: '6665554444',
		displayOptions: {
			show: {
				resource: [
					'analytic',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'analytic',
				],
			},
		},
		default: '',
		description: 'ID of the campaign',
	},
];



