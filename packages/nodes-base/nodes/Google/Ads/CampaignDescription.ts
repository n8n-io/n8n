import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
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
						url: '={{"/v9/customers/" + $parameter["clientCustomerId"] + "/googleAds:search"}}',
						body: {
							query: 'SELECT campaign.id, campaign.name FROM campaign ORDER BY campaign.id DESC',
						},
						headers: {
							'login-customer-id': '={{$parameter["managerCustomerId"]}}',
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
						method: 'POST',
						url: '={{"/v9/customers/" + $parameter["clientCustomerId"] + "/googleAds:search"}}',
						returnFullResponse: true,
						body: {
							query: '={{"SELECT campaign.id, campaign.name FROM campaign ORDER BY campaign.id DESC" + "WHERE campaign.id = " + $parameter["campaignId"]}}',
						},
						headers: {
							'login-customer-id': '={{$parameter["managerCustomerId"]}}',
						},
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
		displayName: 'Manager Customer ID',
		name: 'managerCustomerId',
		type: 'string',
		required: true,
		placeholder: '9998887777',
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
		displayName: 'Client Customer ID',
		name: 'clientCustomerId',
		type: 'string',
		required: true,
		placeholder: '6665554444',
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
		placeholder: 'SELECT campaign.id, campaign.name FROM campaign ORDER BY campaign.id DESC',
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
