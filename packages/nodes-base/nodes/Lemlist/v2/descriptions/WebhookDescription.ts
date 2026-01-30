import type { INodeProperties } from 'n8n-workflow';

export const webhookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a webhook',
				action: 'Create a webhook',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a webhook',
				action: 'Delete a webhook',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many webhooks',
				action: 'Get many webhooks',
			},
		],
		displayOptions: {
			show: {
				resource: ['webhook'],
			},
		},
	},
];

export const webhookFields: INodeProperties[] = [
	// ----------------------------------
	//        webhook: create
	// ----------------------------------
	{
		displayName: 'Target URL',
		name: 'targetUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/webhook',
		description: 'URL to receive webhook events',
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		required: true,
		default: '*',
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
				name: 'All Events',
				value: '*',
			},
			{
				name: 'API Done',
				value: 'apiDone',
			},
			{
				name: 'API Failed',
				value: 'apiFailed',
			},
			{
				name: 'API Interested',
				value: 'apiInterested',
			},
			{
				name: 'API Not Interested',
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
		description: 'Event type to trigger the webhook',
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
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
					'Filter webhook to a specific campaign. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Is First',
				name: 'isFirst',
				type: 'boolean',
				default: false,
				description: 'Whether to only trigger on first occurrence',
			},
		],
	},

	// ----------------------------------
	//        webhook: delete
	// ----------------------------------
	{
		displayName: 'Webhook ID',
		name: 'webhookId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the webhook to delete',
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//        webhook: getAll
	// ----------------------------------
	// No additional fields required
];
