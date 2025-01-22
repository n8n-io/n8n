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
				name: 'Get Many',
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
		displayName: 'Return All',
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
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Campaign Name or ID',
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
				displayName: 'Is First',
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
						name: 'Aircall Created',
						value: 'aircallCreated',
					},
					{
						name: 'Aircall Done',
						value: 'aircallDone',
					},
					{
						name: 'Aircall Ended',
						value: 'aircallEnded',
					},
					{
						name: 'Aircall Interested',
						value: 'aircallInterested',
					},
					{
						name: 'Aircall Not Interested',
						value: 'aircallNotInterested',
					},
					{
						name: 'Api Done',
						value: 'apiDone',
					},
					{
						name: 'Api Failed',
						value: 'apiFailed',
					},
					{
						name: 'Api Interested',
						value: 'apiInterested',
					},
					{
						name: 'Api Not Interested',
						value: 'apiNotInterested',
					},
					{
						name: 'Attracted',
						value: 'attracted',
					},
					{
						name: 'Connection Issue',
						value: 'connectionIssue',
					},
					{
						name: 'Contacted',
						value: 'contacted',
					},
					{
						name: 'Custom Domain Errors',
						value: 'customDomainErrors',
					},
					{
						name: 'Emails Bounced',
						value: 'emailsBounced',
					},
					{
						name: 'Emails Clicked',
						value: 'emailsClicked',
					},
					{
						name: 'Emails Failed',
						value: 'emailsFailed',
					},
					{
						name: 'Emails Interested',
						value: 'emailsInterested',
					},
					{
						name: 'Emails Not Interested',
						value: 'emailsNotInterested',
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
					{
						name: 'Hooked',
						value: 'hooked',
					},
					{
						name: 'Interested',
						value: 'interested',
					},
					{
						name: 'Lemwarm Paused',
						value: 'lemwarmPaused',
					},
					{
						name: 'LinkedIn Interested',
						value: 'linkedinInterested',
					},
					{
						name: 'LinkedIn Invite Accepted',
						value: 'linkedinInviteAccepted',
					},
					{
						name: 'LinkedIn Invite Done',
						value: 'linkedinInviteDone',
					},
					{
						name: 'LinkedIn Invite Failed',
						value: 'linkedinInviteFailed',
					},
					{
						name: 'LinkedIn Not Interested',
						value: 'linkedinNotInterested',
					},
					{
						name: 'LinkedIn Replied',
						value: 'linkedinReplied',
					},
					{
						name: 'LinkedIn Send Failed',
						value: 'linkedinSendFailed',
					},
					{
						name: 'LinkedIn Sent',
						value: 'linkedinSent',
					},
					{
						name: 'LinkedIn Visit Done',
						value: 'linkedinVisitDone',
					},
					{
						name: 'LinkedIn Visit Failed',
						value: 'linkedinVisitFailed',
					},
					{
						name: 'LinkedIn Voice Note Done',
						value: 'linkedinVoiceNoteDone',
					},
					{
						name: 'LinkedIn Voice Note Failed',
						value: 'linkedinVoiceNoteFailed',
					},
					{
						name: 'Manual Interested',
						value: 'manualInterested',
					},
					{
						name: 'Manual Not Interested',
						value: 'manualNotInterested',
					},
					{
						name: 'Not Interested',
						value: 'notInterested',
					},
					{
						name: 'Opportunities Done',
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
						name: 'Send Limit Reached',
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
