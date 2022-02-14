import {
	INodeProperties,
} from 'n8n-workflow';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the campaigns linked to that user',
				routing: {
					request: {
						method: 'POST',
						url: '/v9/customers/9846033527/googleAds:search',
						body: {
							query: 'SELECT campaign.id, campaign.name FROM campaign ORDER BY campaign.id DESC',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific campaign',
				routing: {
					request: {
						method: 'GET',
						url: '/v9/customers:listAccessibleCustomers',
					},
				},
			},
			{
				name: 'Custom Query',
				value: 'customQuery',
				description: 'Make a custom query against the campaign endpoint',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const campaignFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 calendar:availability                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'campaign',
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
				operation: [
					'get',
				],
				resource: [
					'campaign',
				],
			},
		},
		default: '',
		description: 'ID of the campaign',
	},
	{
		displayName: 'Google Query',
		name: 'customGQL',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'customQuery',
				],
				resource: [
					'campaign',
				],
			},
		},
		default: '',
		description: 'Custom GQL query',
	},
];
