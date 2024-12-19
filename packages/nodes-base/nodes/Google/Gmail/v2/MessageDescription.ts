import { SEND_AND_WAIT_OPERATION, type INodeProperties } from 'n8n-workflow';

import { appendAttributionOption } from '../../../../utils/descriptions';

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
				name: 'Add Label',
				value: 'addLabels',
				action: 'Add label to message',
			},
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
				name: 'Remove Label',
				value: 'removeLabels',
				action: 'Remove label from message',
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
			{
				name: 'Send and Wait for Response',
				value: SEND_AND_WAIT_OPERATION,
				action: 'Send message and wait for response',
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
				operation: ['get', 'delete', 'markAsRead', 'markAsUnread'],
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
				resource: ['message'],
				operation: ['send'],
			},
		},
		placeholder: 'info@example.com',
		description:
			'The email addresses of the recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
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
				operation: ['send'],
			},
		},
		placeholder: 'Hello World!',
	},
	{
		displayName: 'Email Type',
		name: 'emailType',
		type: 'options',
		default: 'html',
		required: true,
		noDataExpression: true,
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send', 'reply'],
			},
			hide: {
				'@version': [2],
			},
		},
	},
	{
		displayName: 'Email Type',
		name: 'emailType',
		type: 'options',
		default: 'html',
		required: true,
		noDataExpression: true,
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send', 'reply'],
				'@version': [2],
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
				resource: ['message'],
				operation: ['reply', 'send'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send', 'reply'],
			},
		},
		default: {},
		options: [
			{
				...appendAttributionOption,
				description:
					'Whether to include the phrase “This email was sent automatically with n8n” to the end of the email',
			},
			{
				displayName: 'Attachments',
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
								displayName: 'Attachment Field Name',
								name: 'property',
								type: 'string',
								default: 'data',
								description:
									'Add the field name from the input node. Multiple properties can be set separated by comma.',
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
				description:
					'The email addresses of the blind copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'CC',
				name: 'ccList',
				type: 'string',
				description:
					'The email addresses of the copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'Sender Name',
				name: 'senderName',
				type: 'string',
				placeholder: 'e.g. Nathan',
				default: '',
				description: "The name that will be shown in recipients' inboxes",
			},
			{
				displayName: 'Send Replies To',
				name: 'replyTo',
				type: 'string',
				placeholder: 'reply@example.com',
				default: '',
				description: 'The email address that the reply message is sent to',
				displayOptions: {
					hide: {
						'/operation': ['reply'],
					},
				},
			},
			{
				displayName: 'Reply to Sender Only',
				name: 'replyToSenderOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to reply to the sender only or to the entire list of recipients',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['message'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['get'],
			},
			hide: {
				simple: [true],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Attachment Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				description:
					"Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is 'attachment_' the first attachment is saved to 'attachment_0'.",
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				default: false,
				description:
					"Whether the email's attachments will be downloaded and included in the output",
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
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['message'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName:
			'Fetching a lot of messages may take a long time. Consider using filters to speed things up',
		name: 'filtersNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['message'],
				returnAll: [true],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['message'],
			},
		},
		options: [
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
					'Only return messages with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				placeholder: 'has:attachment',
				hint: 'Use the same format as in the Gmail search box. <a href="https://support.google.com/mail/answer/7190?hl=en">More info</a>.',
				description: 'Only return messages matching the specified query',
			},
			{
				displayName: 'Read Status',
				name: 'readStatus',
				type: 'options',
				default: 'unread',
				hint: 'Filter emails by whether they have been read or not',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Unread and read emails',
						value: 'both',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Unread emails only',
						value: 'unread',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Read emails only',
						value: 'read',
					},
				],
			},
			{
				displayName: 'Received After',
				name: 'receivedAfter',
				type: 'dateTime',
				default: '',
				description:
					'Get all emails received after the specified date. In an expression you can set date using string in ISO format or a timestamp in miliseconds.',
			},
			{
				displayName: 'Received Before',
				name: 'receivedBefore',
				type: 'dateTime',
				default: '',
				description:
					'Get all emails received before the specified date. In an expression you can set date using string in ISO format or a timestamp in miliseconds.',
			},
			{
				displayName: 'Sender',
				name: 'sender',
				type: 'string',
				default: '',
				description: 'Sender name or email to filter by',
				hint: 'Enter an email or part of a sender name',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['message'],
			},
			hide: {
				simple: [true],
			},
		},
		options: [
			{
				displayName: 'Attachment Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				description:
					"Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is 'attachment_' the first attachment is saved to 'attachment_0'.",
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				default: false,
				description:
					"Whether the email's attachments will be downloaded and included in the output",
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                      label:addLabel, removeLabel                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '172ce2c4a72cc243',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['addLabels', 'removeLabels'],
			},
		},
	},
	{
		displayName: 'Label Names or IDs',
		name: 'labelIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getLabels',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['addLabels', 'removeLabels'],
			},
		},
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
];
