import { INodeProperties } from 'n8n-workflow';

export const emailOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'email',
				],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a email',
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				description: 'Send a email template',
			},
		],
		default: 'send',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const emailFields = [

/* -------------------------------------------------------------------------- */
/*                                email:send                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'From Email',
		name: 'fromEmail',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'email',
				],
				operation: [
					'send',
				]
			},
		},
		description: 'The title for the email',
	},
	{
		displayName: 'Is Body HTML?',
		name: 'isBodyHtml',
		type: 'boolean',
		required: true,
		default: true,
		displayOptions: {
			show: {
				resource: [
					'email',
				],
				operation: [
					'send',
				]
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'email',
				],
				operation: [
					'send',
				]
			},
		},
	},
	{
		displayName: 'To Email',
		name: 'toEmails',
		type: 'string',
		required: true,
		description: 'Email address of the recipient. Multiple ones can be separated by comma.',
		displayOptions: {
			show: {
				resource: [
					'email',
				],
				operation: [
					'send',
				]
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
				resource: [
					'email',
				],
				operation: [
					'send',
				],
			},
		},
		options: [
			{
				displayName: 'Bcc Addresses',
				name: 'bccAddresses',
				type: 'string',
				description: 'Bcc Email address of the recipient. Multiple ones can be separated by comma.',
				default: '',
			},
			{
				displayName: 'Cc Addresses',
				name: 'ccAddresses',
				type: 'string',
				description: 'Cc Email address of the recipient. Multiple ones can be separated by comma.',
				default: '',
			},
			{
				displayName: 'From Name',
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
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Track Opens',
				name: 'trackOpens',
				type: 'string',
				description: 'Enable or disable open tracking on this message.',
				default: '',
			},
			{
				displayName: 'Track Clicks',
				name: 'trackClicks',
				type: 'string',
				description: 'Enable or disable open tracking on this message.',
				default: '',
			},
			{
				displayName: 'Template Language',
				name: 'templateLanguage',
				type: 'boolean',
				default: true,
			},
		]
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
				resource: [
					'email',
				],
				operation: [
					'send',
				]
			},
		},
		placeholder: 'Add Variable',
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
				]
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                email:sendTemplate                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'From Email',
		name: 'fromEmail',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'email',
				],
				operation: [
					'sendTemplate',
				]
			},
		},
		description: 'The title for the email',
	},
	{
		displayName: 'Template',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'email',
				],
				operation: [
					'sendTemplate',
				]
			},
		},
	},
	{
		displayName: 'To Email',
		name: 'toEmails',
		type: 'string',
		required: true,
		description: 'Email address of the recipient. Multiple ones can be separated by comma.',
		displayOptions: {
			show: {
				resource: [
					'email',
				],
				operation: [
					'sendTemplate',
				]
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
				resource: [
					'email',
				],
				operation: [
					'sendTemplate',
				],
			},
		},
		options: [
			{
				displayName: 'Bcc Addresses',
				name: 'bccAddresses',
				type: 'string',
				description: 'Bcc Recipients of the email separated by ,.',
				default: '',
			},
			{
				displayName: 'Cc Addresses',
				name: 'ccAddresses',
				type: 'string',
				description: 'Cc recipients of the email separated by ,.',
				default: '',
			},
			{
				displayName: 'From Name',
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
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Track Opens',
				name: 'trackOpens',
				type: 'string',
				description: 'Enable or disable open tracking on this message.',
				default: '',
			},
			{
				displayName: 'Track Clicks',
				name: 'trackClicks',
				type: 'string',
				description: 'Enable or disable open tracking on this message.',
				default: '',
			},
			{
				displayName: 'Template Language',
				name: 'templateLanguage',
				type: 'boolean',
				default: true,
			},
		]
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
				resource: [
					'email',
				],
				operation: [
					'sendTemplate',
				]
			},
		},
		placeholder: 'Add Variable',
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
				]
			},
		],
	},
] as INodeProperties[];
