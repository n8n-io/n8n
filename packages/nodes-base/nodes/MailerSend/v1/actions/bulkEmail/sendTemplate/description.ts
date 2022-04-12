import {
	BulkEmailProperties,
} from '../../Interfaces';

/* -------------------------------------------------------------------------- */
/*                                email:sendTemplate                          */
/* -------------------------------------------------------------------------- */
export const bulkEmailTemplateDescription: BulkEmailProperties = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTemplates',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'sendTemplate',
				],
			},
		},
	},
	{
		displayName: 'From Email',
		name: 'fromEmail',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'sendTemplate',
				],
			},
		},
		description: 'Email address from',
		placeholder: 'hello@mailersend.com',
	},
	{
		displayName: 'To Email',
		name: 'toEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'john@mailersend.com',
		description: 'Email address of the recipient. Multiple ones can be separated by comma.',
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'sendTemplate',
				],
			},
		},
	},
	{
		displayName: 'To Name',
		name: 'toName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Contact Name',
		description: 'Name of the recipient. Multiple ones can be separated by comma.',
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'sendTemplate',
				],
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
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'sendTemplate',
				],
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
					'bulkEmail',
				],
				operation: [
					'sendTemplate',
				],
			},
		},
		options: [
			{
				displayName: 'Bcc Email',
				name: 'bccEmail',
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
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				description: 'The reply-to email address. Multiple ones can be separated by comma.',
				default: '',
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
				resource: [
					'bulkEmail',
				],
				operation: [
					'sendTemplate',
				],
			},
		},
		placeholder: 'Add Variable',
		default: '',
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
];

