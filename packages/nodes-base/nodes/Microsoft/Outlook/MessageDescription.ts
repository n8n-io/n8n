import { 
	INodeProperties,
} from 'n8n-workflow';

export const messageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a draft of a new message.',
			},
			{
				name: 'Create Reply',
				value: 'createReply',
				description: 'Create a draft of a reply message.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single message.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all messages in the signed-in user\'s mailbox.',
			},
			{
				name: 'Get MIME Content',
				value: 'getMime',
				description: 'Get MIME content of a message.',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message.',
			},
			{
				name: 'Send Draft',
				value: 'sendDraft',
				description: 'Send an existing draft message.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a message.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageFields = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		description: 'Message ID',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'addAttachment',
					'createReply',
					'delete',
					'get',
					'getAttachment',
					'getMime',
					'sendDraft',
					'update',
				],
			},
		},
	},
	// message:createReply
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
				resource: [
					'message',
				],
				operation: [
					'createReply',
				],
			},
		},
	},
	// message:getAll
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	// message:send
	{
		displayName: 'Save To Sent Items',
		name: 'saveToSentItems',
		description: 'Indicates whether to save the message in Sent Items.',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'send',
				],
			},
		},
	},
	// message:create, message:update, message:send

	{
		displayName: 'Subject',
		name: 'subject',
		description: 'The subject of the message.',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
					'send',
				],
			},
		},
		type: 'string',
		default: '',
	},
	{
		displayName: 'Body Content',
		name: 'bodyContent',
		description: 'Message body content.',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
					'send',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Recipients',
		name: 'toRecipients',
		description: 'Email addresses of recipients.',
		type: 'string',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'send',
				],
			},
		},
		placeholder: 'Add Recipient',
		default: [],
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
					'message',
				],
				operation: [
					'create',
					'send',
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
				description: 'Email addresses of BCC recipients.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Recipient',
				default: [],
			},
			{
				displayName: 'Body Content Type',
				name: 'bodyContentType',
				description: 'Message body content type.',
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
				displayName: 'Categories',
				name: 'categories',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
			{
				displayName: 'CC Recipients',
				name: 'ccRecipients',
				description: 'Email addresses of CC recipients.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Recipient',
				default: [],
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
								description: 'Name of the header.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the header.',
							},
						],
					},
				],
			},
			{
				displayName: 'From',
				name: 'from',
				description: 'The owner of the mailbox which the message is sent.<br>Must correspond to the actual mailbox used.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				description: 'The importance of the message.',
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
				displayName: 'Read',
				name: 'isRead',
				description: 'Indicates whether the message has been read.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Read Receipt Requested',
				name: 'isReadReceiptRequested',
				description: 'Indicates whether a read receipt is requested for the message.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Recipients',
				name: 'toRecipients',
				description: 'Email addresses of recipients.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						'/operation': [
							'create',
						],
					},
				},
				placeholder: 'Add Recipient',
				default: [],
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				description: 'Email addresses to use when replying.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'BCC Recipients',
				name: 'bccRecipients',
				description: 'Email addresses of BCC recipients.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Recipient',
				default: [],
			},
			{
				displayName: 'Body Content',
				name: 'bodyContent',
				description: 'Message body content.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body Content Type',
				name: 'bodyContentType',
				description: 'Message body content type.',
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
				displayName: 'Categories',
				name: 'categories',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
			{
				displayName: 'CC Recipients',
				name: 'ccRecipients',
				description: 'Email addresses of CC recipients.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Recipient',
				default: [],
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
								description: 'Name of the header.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the header.',
							},
						],
					},
				],
			},
			{
				displayName: 'From',
				name: 'from',
				description: 'The owner of the mailbox which the message is sent.<br>Must correspond to the actual mailbox used.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				description: 'The importance of the message.',
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
				default: 'low',
			},
			{
				displayName: 'Read',
				name: 'isRead',
				description: 'Indicates whether the message has been read.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Read Receipt Requested',
				name: 'isReadReceiptRequested',
				description: 'Indicates whether a read receipt is requested for the message.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Recipients',
				name: 'toRecipients',
				description: 'Email addresses of recipients.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Recipient',
				default: [],
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				description: 'Email addresses to use when replying.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				description: 'The subject of the message.',
				type: 'string',
				default: '',
			},
		],
	},
	// File operations
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		description: 'Name of the binary property to which to<br />write the data of the read file.',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getMime',
				],
			},
		},
	},
	// message:create, message:send

	// Get & Get All operations
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will contain. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description: 'Microsoft Graph API OData $filter query.',
			},
		],
	},
	{
		displayName: 'Folder ID',
		name: 'folderId',
		description: 'Folder ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'move',
				],
			},
		},
	},
] as INodeProperties[];
