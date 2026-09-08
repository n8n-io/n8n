import type { INodeProperties } from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many activities',
			},
		],
		displayOptions: {
			show: {
				resource: ['activity'],
			},
		},
	},
];

export const activityFields: INodeProperties[] = [
	// ----------------------------------
	//        activity: getAll
	// ----------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Campaign name or ID',
				name: 'campaignId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				description:
					'ID of the campaign to retrieve activity for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'emailsOpened',
				description: 'Type of activity to retrieve',
				options: [
					{
						name: 'Emails bounced',
						value: 'emailsBounced',
					},
					{
						name: 'Emails clicked',
						value: 'emailsClicked',
					},
					{
						name: 'Emails opened',
						value: 'emailsOpened',
					},
					{
						name: 'Emails replied',
						value: 'emailsReplied',
					},
					{
						name: 'Emails send failed',
						value: 'emailsSendFailed',
					},
					{
						name: 'Emails sent',
						value: 'emailsSent',
					},
					{
						name: 'Emails unsubscribed',
						value: 'emailsUnsubscribed',
					},
				],
			},
		],
	},
];
