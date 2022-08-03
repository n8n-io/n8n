import {
	INodeProperties,
} from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
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
				name: 'Get All',
				value: 'getAll',
				action: 'Get all messages',
			},
			{
				name: 'Mark as Read',
				value: 'markAsRead',
				action: 'Mark a message as read',
			},
			{
				name: 'Mark as Unread',
				value: 'markAsUnread',
				action: 'Mark a message as unread',
			},
			{
				name: 'Reply to Sender',
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
				resource: [
					'message',
				],
				operation: [
					'get',
					'delete',
					'markAsRead',
					'markAsUnread',
				],
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
				resource: [
					'message',
				],
				operation: [
					'reply',
				],
			},
		},
		placeholder: '172ce2c4a72cc243',
	},
	{
		displayName: 'To',
		name: 'sendTo',
		type: 'string',
		default: '',
		required: true,
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
		placeholder: 'info@example.com',
		description: 'The email addresses of the recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
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
		placeholder: 'Hello World!',
	},
	{
		displayName: 'Email Type',
		name: 'emailType',
		type: 'options',
		default: 'text',
		required: true,
		noDataExpression: true,
		options: [
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Text',
				value: 'text',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'send',
					'reply',
				],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'reply',
					'send',
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'send',
					'reply',
				],
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
								default: 'data',
								description: 'Add the field name from the input node. Multiple properties can be set separated by comma.',
								hint: 'The name of the field with the attachment in the node input',
							},
						],
					},
				],
				default: {},
				description: 'Array of supported attachments to add to the message',
			},
			{
				displayName: 'BCC',
				name: 'bccList',
				type: 'string',
				description: 'The email addresses of the blind copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'CC',
				name: 'ccList',
				type: 'string',
				description: 'The email addresses of the copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'Extra to Recipients',
				name: 'sendTo',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'/operation': [
							'reply',
						],
					},
				},
				placeholder: 'info@example.com',
				description: 'These emails would be sent along with the original sender\'s email. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
			},
			{
				displayName: 'Override Sender Name',
				name: 'senderName',
				type: 'string',
				placeholder: '',
				default: '',
				description: "The name that will be shown in recipients' inboxes",
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
				],
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
						description: 'Returns the full email message data with body content parsed in the payload field',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Returns only email message ID, labels, and email headers',
					},
					{
						name: 'Minimal',
						value: 'minimal',
						description: 'Returns only email message ID and labels; does not return the email headers, body, or payload',
					},
					{
						name: 'RAW',
						value: 'raw',
						description: 'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
					},
					{
						name: 'Resolved',
						value: 'resolved',
						description: 'Returns the full email with all data resolved and attachments saved as binary data',
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
						format: [
							'full',
							'metadata',
							'minimal',
							'raw',
						],
					},
				},
				description: 'Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is \'attachment_\' the first attachment is saved to \'attachment_0\'.',
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
				operation: [
					'getAll',
				],
				resource: [
					'message',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'message',
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
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'message',
				],
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
						format: [
							'full',
							'ids',
							'metadata',
							'minimal',
							'raw',
						],
					},
				},
				description: 'Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is \'attachment_\' the first attachment is saved to \'attachment_0\'.',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Full',
						value: 'full',
						description: 'Returns the full email message data with body content parsed in the payload field',
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
						description: 'Returns only email message ID and labels; does not return the email headers, body, or payload',
					},
					{
						name: 'RAW',
						value: 'raw',
						description: 'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
					},
					{
						name: 'Resolved',
						value: 'resolved',
						description: 'Returns the full email with all data resolved and attachments saved as binary data',
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
				description: 'Only return messages with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Matches Search Query',
				name: 'q',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Only return messages matching the specified query. Supports the same query format as the Gmail search box. For example, \'from:name@email.com is:unread\'. See more <a href="https://support.google.com/mail/answer/7190?hl=en">here</a>',
			},
			{
				displayName: 'Read Status',
				name: 'readStatus',
				type: 'options',
				default: 'unread',
				description: 'Filter emails by their read status',
				options: [
					{
						name: 'Only Read Emails',
						value: 'read',
					},
					{
						name: 'Only Unread Emails',
						value: 'unread',
					},
				],
			},
			{
				displayName: 'Received After',
				name: 'receivedAfter',
				type: 'dateTime',
				default: '',
				description: 'Get all emails received after the specified date, in an expression you can set date using string in ISO format or a timestamp in miliseconds',
			},
			{
				displayName: 'Received Before',
				name: 'receivedBefore',
				type: 'dateTime',
				default: '',
				description: 'Get all emails received after the specified date, in an expression you can set date using string in ISO format or a timestamp in miliseconds',
			},
			{
				displayName: 'Sender',
				name: 'sender',
				type: 'string',
				default: '',
				description: 'Sender name or email to filter by',
			},
		],
	},
];
