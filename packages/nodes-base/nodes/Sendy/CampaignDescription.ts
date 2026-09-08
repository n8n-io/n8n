import type { INodeProperties } from 'n8n-workflow';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a campaign',
				action: 'Create a campaign',
			},
		],
		default: 'create',
	},
];

export const campaignFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                campaign:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'From name',
		name: 'fromName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		default: '',
		description: "The 'From name' of your campaign",
	},
	{
		displayName: 'From email',
		name: 'fromEmail',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		default: '',
		description: "The 'From email' of your campaign",
	},
	{
		displayName: 'Reply to',
		name: 'replyTo',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		default: '',
		description: "The 'Reply to' of your campaign",
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		default: '',
		description: "The 'Title' of your campaign",
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		default: '',
		description: "The 'Subject' of your campaign",
	},
	{
		displayName: 'HTML text',
		name: 'htmlText',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		default: '',
		description: "The 'HTML version' of your campaign",
	},
	{
		displayName: 'Send campaign',
		name: 'sendCampaign',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		default: false,
		description:
			'Whether to send the campaign as well and not just create a draft. Default is false.',
	},
	{
		displayName: 'Brand ID',
		name: 'brandId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['campaign'],
				sendCampaign: [false],
			},
		},
		required: true,
		default: '',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Exclude list IDs',
				name: 'excludeListIds',
				type: 'string',
				default: '',
				description:
					'Lists to exclude from your campaign. List IDs should be single or comma-separated.',
			},
			{
				displayName: 'Exclude segment IDs',
				name: 'excludeSegmentIds',
				type: 'string',
				default: '',
				description:
					'Segments to exclude from your campaign. Segment IDs should be single or comma-separated.',
			},
			{
				displayName: 'List IDs',
				name: 'listIds',
				type: 'string',
				default: '',
				description: 'List IDs should be single or comma-separated',
			},
			{
				displayName: 'Plain text',
				name: 'plainText',
				type: 'string',
				default: '',
				description: "The 'Plain text version' of your campaign",
			},
			{
				displayName: 'Querystring',
				name: 'queryString',
				type: 'string',
				default: '',
				description: 'Google Analytics tags',
			},
			{
				displayName: 'Segment IDs',
				name: 'segmentIds',
				type: 'string',
				default: '',
				description: 'Segment IDs should be single or comma-separated',
			},
			{
				displayName: 'Track clicks',
				name: 'trackClicks',
				type: 'boolean',
				default: true,
				description: 'Whether to disable clicks tracking. Default is true.',
			},
			{
				displayName: 'Track opens',
				name: 'trackOpens',
				type: 'boolean',
				default: true,
				description: 'Whether to disable opens tracking. Default is true.',
			},
		],
	},
];
