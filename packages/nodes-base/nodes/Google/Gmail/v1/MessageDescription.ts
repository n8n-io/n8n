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
				action: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many messages',
			},
			{
				name: 'Reply',
				value: 'reply',
				action: 'Reply to a message',
			},
			{
				name: 'Send',
				value: 'send',
				action: 'Send a message',
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
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['get', 'delete'],
			},
		},
		placeholder: '172ce2c4a72cc243',
	},
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
		placeholder: '172ce2c4a72cc243',
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
		placeholder: 'CAHNQoFsC6JMMbOBJgtjsqN0eEc+gDg2a=SQj-tWUebQeHMDgqQ@mail.gmail.com',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply', 'send'],
			},
		},
		placeholder: 'Hello World!',
	},
	{
		displayName: 'HTML',
		name: 'includeHtml',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send', 'reply'],
			},
		},
		default: false,
		description: 'Whether the message should also be included as HTML',
	},
	{
		displayName: 'HTML Message',
		name: 'htmlMessage',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				includeHtml: [true],
				resource: ['message'],
				operation: ['reply', 'send'],
			},
		},
		description: 'The HTML message body',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply', 'send'],
			},
		},
		description: 'Plain text message body',
	},
	{
		displayName: 'To Email',
		name: 'toList',
		type: 'string',
		default: [],
		required: true,
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add To Email',
		},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply', 'send'],
			},
		},
		placeholder: 'info@example.com',
		description: 'The email addresses of the recipients',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send', 'reply'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Attachment',
				name: 'attachmentsUi',
				placeholder: 'Add Attachment',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attachmentsBinary',
						displayName: 'Attachment Binary',
						values: [
							{
								displayName: 'Attachment Field Name (in Input)',
								name: 'property',
								type: 'string',
								default: '',
								description:
									'Add the field name from the input node. Multiple properties can be set separated by comma.',
							},
						],
					},
				],
				default: {},
				description: 'Array of supported attachments to add to the message',
			},
			{
				displayName: 'BCC Email',
				name: 'bccList',
				type: 'string',
				description: 'The email addresses of the blind copy recipients',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add BCC Email',
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'CC Email',
				name: 'ccList',
				type: 'string',
				description: 'The email addresses of the copy recipients',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add CC Email',
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'Override Sender Name',
				name: 'senderName',
				type: 'string',
				placeholder: 'Name <test@gmail.com>',
				default: '',
				description:
					'The name displayed in your contacts inboxes. It has to be in the format: "Display-Name &#60;name@gmail.com&#62;". The email address has to match the email address of the logged in user for the API.',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Full',
						value: 'full',
						description:
							'Returns the full email message data with body content parsed in the payload field',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Returns only email message ID, labels, and email headers',
					},
					{
						name: 'Minimal',
						value: 'minimal',
						description:
							'Returns only email message ID and labels; does not return the email headers, body, or payload',
					},
					{
						name: 'RAW',
						value: 'raw',
						description:
							'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
					},
					{
						name: 'Resolved',
						value: 'resolved',
						description:
							'Returns the full email with all data resolved and attachments saved as binary data',
					},
				],
				default: 'resolved',
				description: 'The format to return the message in',
			},
			{
				displayName: 'Attachment Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				displayOptions: {
					hide: {
						format: ['full', 'metadata', 'minimal', 'raw'],
					},
				},
				description:
					'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 message:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['message'],
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
				operation: ['getAll'],
				resource: ['message'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 10,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['message'],
			},
		},
		options: [
			{
				displayName: 'Attachment Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				displayOptions: {
					hide: {
						format: ['full', 'ids', 'metadata', 'minimal', 'raw'],
					},
				},
				description:
					'Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0".',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Full',
						value: 'full',
						description:
							'Returns the full email message data with body content parsed in the payload field',
					},
					{
						name: 'IDs',
						value: 'ids',
						description: 'Returns only the IDs of the emails',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Returns only email message ID, labels, and email headers',
					},
					{
						name: 'Minimal',
						value: 'minimal',
						description:
							'Returns only email message ID and labels; does not return the email headers, body, or payload',
					},
					{
						name: 'RAW',
						value: 'raw',
						description:
							'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
					},
					{
						name: 'Resolved',
						value: 'resolved',
						description:
							'Returns the full email with all data resolved and attachments saved as binary data',
					},
				],
				default: 'resolved',
				description: 'The format to return the message in',
			},
			{
				displayName: 'Include Spam and Trash',
				name: 'includeSpamTrash',
				type: 'boolean',
				default: false,
				description: 'Whether to include messages from SPAM and TRASH in the results',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description:
					'Only return messages with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Query',
				name: 'q',
				type: 'string',
				default: '',
				description:
					'Only return messages matching the specified query. Supports the same query format as the Gmail search box. For example, "from:someuser@example.com rfc822msgid:&lt;somemsgid@example.com&gt; is:unread". Parameter cannot be used when accessing the api using the gmail.metadata scope.',
			},
		],
	},
];
