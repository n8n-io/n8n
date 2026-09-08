import type { INodeProperties } from 'n8n-workflow';

export const emailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['email'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a email',
				action: 'Send an email',
			},
			{
				name: 'Send template',
				value: 'sendTemplate',
				description: 'Send a email template',
				action: 'Send an email template',
			},
		],
		default: 'send',
	},
];

export const emailFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                email:send                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'From email',
		name: 'fromEmail',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		placeholder: 'admin@example.com',
		description: 'The title for the email',
	},
	{
		displayName: 'To email',
		name: 'toEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'info@example.com',
		description: 'Email address of the recipient. Multiple ones can be separated by comma.',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		placeholder: 'My subject line',
		description: 'Subject line of the email',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		description: 'Plain text message of email',
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		description: 'HTML text message of email',
	},
	{
		displayName: 'JSON parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'BCC email',
				name: 'bccEmail',
				type: 'string',
				description: 'Bcc Email address of the recipient. Multiple ones can be separated by comma.',
				default: '',
			},
			{
				displayName: 'CC addresses',
				name: 'ccAddresses',
				type: 'string',
				description: 'Cc Email address of the recipient. Multiple ones can be separated by comma.',
				default: '',
			},
			{
				displayName: 'From name',
				name: 'fromName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				default: 2,
			},
			{
				displayName: 'Reply to',
				name: 'replyTo',
				type: 'string',
				description: 'The reply-to email address. Multiple ones can be separated by comma.',
				default: '',
			},
			{
				displayName: 'Template language',
				name: 'templateLanguage',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Track clicks',
				name: 'trackClicks',
				type: 'options',
				options: [
					{
						name: 'Account default',
						value: 'account_default',
						description: 'Use the values specified in the Mailjet account',
					},
					{
						name: 'Disabled',
						value: 'disabled',
						description: 'Disable tracking for this message',
					},
					{
						name: 'Enabled',
						value: 'enabled',
						description: 'Enable tracking for this message',
					},
				],
				description: 'Enable or disable open tracking on this message',
				default: 'account_default',
			},
			{
				displayName: 'Track opens',
				name: 'trackOpens',
				type: 'options',
				options: [
					{
						name: 'Account default',
						value: 'account_default',
						description: 'Use the values specified in the Mailjet account',
					},
					{
						name: 'Disabled',
						value: 'disabled',
						description: 'Disable tracking for this message',
					},
					{
						name: 'Enabled',
						value: 'enabled',
						description: 'Enable tracking for this message',
					},
				],
				description: 'Enable or disable open tracking on this message',
				default: 'account_default',
			},
			{
				displayName: 'Custom campaign',
				name: 'customCampaign',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deduplicate campaign',
				name: 'deduplicateCampaign',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Variables (JSON)',
		name: 'variablesJson',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				jsonParameters: [true],
			},
		},
		default: '',
		description: 'HTML text message of email',
	},
	{
		displayName: 'Variables',
		name: 'variablesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				jsonParameters: [false],
			},
		},
		placeholder: 'Add variable',
		default: {},
		options: [
			{
				name: 'variablesValues',
				displayName: 'Variable',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                email:sendTemplate                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'From email',
		name: 'fromEmail',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		placeholder: 'admin@example.com',
		description: 'The title for the email',
	},
	{
		displayName: 'To email',
		name: 'toEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'info@example.com',
		description: 'Email address of the recipient. Multiple ones can be separated by comma.',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
	},
	{
		displayName: 'Template name or ID',
		name: 'templateId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTemplates',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
	},
	{
		displayName: 'JSON parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'BCC email',
				name: 'bccEmail',
				type: 'string',
				description: 'BCC Recipients of the email separated by ,',
				default: '',
			},
			{
				displayName: 'CC email',
				name: 'ccEmail',
				type: 'string',
				description: 'Cc recipients of the email separated by ,',
				default: '',
			},
			{
				displayName: 'From name',
				name: 'fromName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				default: 2,
			},
			{
				displayName: 'Reply to',
				name: 'replyTo',
				type: 'string',
				description: 'The reply-to email address. Multiple ones can be separated by comma.',
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Template language',
				name: 'templateLanguage',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Track clicks',
				name: 'trackClicks',
				type: 'string',
				description: 'Enable or disable open tracking on this message',
				default: '',
			},
			{
				displayName: 'Track opens',
				name: 'trackOpens',
				type: 'string',
				description: 'Enable or disable open tracking on this message',
				default: '',
			},
			{
				displayName: 'Custom campaign',
				name: 'customCampaign',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deduplicate campaign',
				name: 'deduplicateCampaign',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Variables',
		name: 'variablesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
				jsonParameters: [false],
			},
		},
		placeholder: 'Add variable',
		default: {},
		options: [
			{
				name: 'variablesValues',
				displayName: 'Variable',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Variables (JSON)',
		name: 'variablesJson',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
				jsonParameters: [true],
			},
		},
		default: '',
		description: 'HTML text message of email',
	},
];
