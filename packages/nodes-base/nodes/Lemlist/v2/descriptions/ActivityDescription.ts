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
				displayName: 'Is first',
				name: 'isFirst',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'emailsOpened',
				description: 'Type of activity to retrieve',
				options: [
					{
						name: 'Aircall created',
						value: 'aircallCreated',
					},
					{
						name: 'Aircall done',
						value: 'aircallDone',
					},
					{
						name: 'Aircall ended',
						value: 'aircallEnded',
					},
					{
						name: 'Aircall interested',
						value: 'aircallInterested',
					},
					{
						name: 'Aircall not interested',
						value: 'aircallNotInterested',
					},
					{
						name: 'API done',
						value: 'apiDone',
					},
					{
						name: 'API failed',
						value: 'apiFailed',
					},
					{
						name: 'API interested',
						value: 'apiInterested',
					},
					{
						name: 'API not interested',
						value: 'apiNotInterested',
					},
					{
						name: 'Attracted',
						value: 'attracted',
					},
					{
						name: 'Connection issue',
						value: 'connectionIssue',
					},
					{
						name: 'Contacted',
						value: 'contacted',
					},
					{
						name: 'Custom domain errors',
						value: 'customDomainErrors',
					},
					{
						name: 'Emails bounced',
						value: 'emailsBounced',
					},
					{
						name: 'Emails clicked',
						value: 'emailsClicked',
					},
					{
						name: 'Emails failed',
						value: 'emailsFailed',
					},
					{
						name: 'Emails interested',
						value: 'emailsInterested',
					},
					{
						name: 'Emails not interested',
						value: 'emailsNotInterested',
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
					{
						name: 'Hooked',
						value: 'hooked',
					},
					{
						name: 'Interested',
						value: 'interested',
					},
					{
						name: 'Lemwarm paused',
						value: 'lemwarmPaused',
					},
					{
						name: 'LinkedIn interested',
						value: 'linkedinInterested',
					},
					{
						name: 'LinkedIn invite accepted',
						value: 'linkedinInviteAccepted',
					},
					{
						name: 'LinkedIn invite done',
						value: 'linkedinInviteDone',
					},
					{
						name: 'LinkedIn invite failed',
						value: 'linkedinInviteFailed',
					},
					{
						name: 'LinkedIn not interested',
						value: 'linkedinNotInterested',
					},
					{
						name: 'LinkedIn replied',
						value: 'linkedinReplied',
					},
					{
						name: 'LinkedIn send failed',
						value: 'linkedinSendFailed',
					},
					{
						name: 'LinkedIn sent',
						value: 'linkedinSent',
					},
					{
						name: 'LinkedIn visit done',
						value: 'linkedinVisitDone',
					},
					{
						name: 'LinkedIn visit failed',
						value: 'linkedinVisitFailed',
					},
					{
						name: 'LinkedIn voice note done',
						value: 'linkedinVoiceNoteDone',
					},
					{
						name: 'LinkedIn voice note failed',
						value: 'linkedinVoiceNoteFailed',
					},
					{
						name: 'Manual interested',
						value: 'manualInterested',
					},
					{
						name: 'Manual not interested',
						value: 'manualNotInterested',
					},
					{
						name: 'Not interested',
						value: 'notInterested',
					},
					{
						name: 'Opportunities done',
						value: 'opportunitiesDone',
					},
					{
						name: 'Paused',
						value: 'paused',
					},
					{
						name: 'Resumed',
						value: 'resumed',
					},
					{
						name: 'Send limit reached',
						value: 'sendLimitReached',
					},
					{
						name: 'Skipped',
						value: 'skipped',
					},
					{
						name: 'Warmed',
						value: 'warmed',
					},
				],
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: 'v2',
			},
		],
	},
];
