import {
	BulkEmailProperties,
} from '../../Interfaces';


export const emailCreateDescription: BulkEmailProperties = [
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
					'create',
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
					'create',
				],
			},
		},
	},
	{
		displayName: 'To Name',
		name: 'toName',
		type: 'string',
		default: '',
		required: false,
		placeholder: 'Contact Name',
		description: 'Name of the recipient. Multiple ones can be separated by comma.',
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'My subject line',
		description: 'Subject line of the email',
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Plain text message of email',
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Email represented in HTML',
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
					'create',
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
					'create',
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
