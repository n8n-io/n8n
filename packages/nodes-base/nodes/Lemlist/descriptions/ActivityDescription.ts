import {
	INodeProperties,
} from 'n8n-workflow';

export const activityOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
			},
		},
	},
] as INodeProperties[];

export const activityFields = [
	// ----------------------------------
	//        activity: getAll
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'options',
				required: true,
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				description: 'ID of the campaign to retrieve activity for.',
			},
			{
				displayName: 'Is First',
				name: 'isFirst',
				type: 'boolean',
				default: false,
				description: 'Retrieve only the first time this activity occurred.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'emailsOpened',
				description: 'Type of activity to retrieve.',
				options: [
					{
						name: 'Emails Bounced',
						value: 'emailsBounced',
					},
					{
						name: 'Emails Clicked',
						value: 'emailsClicked',
					},
					{
						name: 'Emails Opened',
						value: 'emailsOpened',
					},
					{
						name: 'Emails Replied',
						value: 'emailsReplied',
					},
					{
						name: 'Emails Send Failed',
						value: 'emailsSendFailed',
					},
					{
						name: 'Emails Sent',
						value: 'emailsSent',
					},
					{
						name: 'Emails Unsubscribed',
						value: 'emailsUnsubscribed',
					},
				],
			},
		],
	},
] as INodeProperties[];
