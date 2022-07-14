import {
	INodeProperties,
} from 'n8n-workflow';

export const draftOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new email draft',
				action: 'Create a draft',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a draft',
				action: 'Delete a draft',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single draft',
				action: 'Get a draft',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send an existing draft message',
				action: 'Send a draft',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a draft',
				action: 'Update a draft',
			},
		],
		default: 'create',
	},
];

export const draftFields: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'delete',
					'get',
					'send',
					'update',
				],
			},
		},
	},

	// draft:create
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'The subject of the message',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				],
			},
		},
		type: 'string',
		default: '',
	},
	{
		displayName: 'Body Content',
		name: 'bodyContent',
		description: 'Message body content',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
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
					'draft',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'fixedCollection',
				placeholder: 'Add Attachment',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attachments',
						displayName: 'Attachment',
						values: [
							{
								displayName: 'Binary Property Name',
								name: 'binaryPropertyName',
								type: 'string',
								default: '',
								description: 'Name of the binary property containing the data to be added to the email as an attachment',
							},
						],
					},
				],

			},
			{
				displayName: 'BCC Recipients',
				name: 'bccRecipients',
				description: 'Email addresses of BCC recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body Content Type',
				name: 'bodyContentType',
				description: 'Message body content type',
				type: 'options',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Text',
						value: 'Text',
					},
				],
				default: 'html',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				default: [],
			},
			{
				displayName: 'CC Recipients',
				name: 'ccRecipients',
				description: 'Email addresses of CC recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Headers',
				name: 'internetMessageHeaders',
				placeholder: 'Add Header',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'headers',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the header',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the header',
							},
						],
					},
				],
			},
			{
				displayName: 'From',
				name: 'from',
				description: 'The owner of the mailbox which the message is sent. Must correspond to the actual mailbox used.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				description: 'The importance of the message',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 'Low',
					},
					{
						name: 'Normal',
						value: 'Normal',
					},
					{
						name: 'High',
						value: 'High',
					},
				],
				default: 'Low',
			},
			{
				displayName: 'Read Receipt Requested',
				name: 'isReadReceiptRequested',
				description: 'Whether a read receipt is requested for the message',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Recipients',
				name: 'toRecipients',
				description: 'Email addresses of recipients. Multiple can be added separated by comma.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				description: 'Email addresses to use when replying',
				type: 'string',
				default: '',
			},
		],
	},

	// draft:send
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'send',
				],
			},
		},
		options: [
			{
				displayName: 'Recipients',
				name: 'recipients',
				description: 'Email addresses of recipients. Mutiple can be set separated by comma.',
				type: 'string',
				default: '',
			},
		],
	},



];
