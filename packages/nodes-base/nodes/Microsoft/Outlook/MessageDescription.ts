import { INodeProperties } from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message',
				action: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single message',
				action: 'Get a message',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: "Get all messages in the signed-in user's mailbox",
				action: 'Get all messages',
			},
			{
				name: 'Get MIME Content',
				value: 'getMime',
				description: 'Get MIME content of a message',
				action: 'Get MIME Content of a message',
			},
			{
				name: 'Move',
				value: 'move',
				description: 'Move a message',
				action: 'Move a message',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Create reply to a message',
				action: 'Reply to a message',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message',
				action: 'Send a message',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a message',
				action: 'Update a message',
			},
		],
		default: 'send',
	},
];

export const messageFields: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: [
					'addAttachment',
					'delete',
					'get',
					'getAttachment',
					'getMime',
					'move',
					'update',
					'reply',
				],
			},
		},
	},

	// message:reply
	{
		displayName: 'Reply Type',
		name: 'replyType',
		type: 'options',
		options: [
			{
				name: 'Reply',
				value: 'reply',
			},
			{
				name: 'Reply All',
				value: 'replyAll',
			},
		],
		default: 'reply',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		description: 'A comment to include. Can be an empty string.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
		type: 'string',
		default: '',
	},
	{
		displayName: 'Send',
		name: 'send',
		description:
			'Whether to send the reply message directly. If not set, it will be saved as draft.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
		type: 'boolean',
		default: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
				replyType: ['reply'],
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
								description:
									'Name of the binary property containing the data to be added to the email as an attachment',
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
				displayName: 'Body Content',
				name: 'bodyContent',
				description: 'Message body content',
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
				description:
					'The owner of the mailbox which the message is sent. Must correspond to the actual mailbox used.',
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
			{
				displayName: 'Subject',
				name: 'subject',
				description: 'The subject of the message',
				type: 'string',
				default: '',
			},
		],
	},

	// message:getAll
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},

	// message:create, message:update, message:send
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'The subject of the message',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create', 'send'],
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
				resource: ['message'],
				operation: ['create', 'send'],
			},
		},
		default: '',
	},
	{
		displayName: 'Recipients',
		name: 'toRecipients',
		description: 'Email addresses of recipients. Multiple can be added separated by comma.',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send'],
			},
		},
		required: true,
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
				resource: ['message'],
				operation: ['send'],
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
								description:
									'Name of the binary property containing the data to be added to the email as an attachment',
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
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
				description:
					'The owner of the mailbox which the message is sent. Must correspond to the actual mailbox used.',
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
			{
				displayName: 'Save To Sent Items',
				name: 'saveToSentItems',
				description: 'Whether to save the message in Sent Items',
				type: 'boolean',
				default: true,
			},
		],
	},

	// File operations
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		description: 'Name of the binary property to which to write the data of the read file',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getMime'],
			},
		},
	},

	// message:move
	{
		displayName: 'Folder ID',
		name: 'folderId',
		description: 'Target Folder ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['move'],
			},
		},
	},
];
