import {
	INodeProperties,
} from 'n8n-workflow';

export const threadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a thread',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a thread',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all threads',
			},
			{
				name: 'Reply to Sender',
				value: 'reply',
				action: 'Reply to a message',
			},
			{
				name: 'Trash',
				value: 'trash',
				action: 'Trash a thread',
			},
			{
				name: 'Untrash',
				value: 'untrash',
				action: 'Untrash a thread',
			},
		],
		default: 'getAll',
	},
];

export const threadFields: INodeProperties[] = [
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the thread you are operating on',
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'get',
					'delete',
					'reply',
					'trash',
					'untrash',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 thread:reply                               */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Message Snippet or ID',
		name: 'messageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getThreadMessages',
			loadOptionsDependsOn: [
				'threadId',
			],
		},
		default: '',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'reply',
				],
			},
		},
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
					'thread',
				],
				operation: [
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
					'thread',
				],
				operation: [
					'reply',
				],
			},
		},
		hint: 'Get better Text and Expressions writing experience by using the expression editor',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
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
								default: '',
								description: 'Add the field name from the input node. Multiple properties can be set separated by comma.',
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
				description: 'The name displayed in your contacts inboxes',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 thread:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'thread',
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
						description: 'Returns the full email message data with body content parsed in the payload field; the raw field is not used',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Returns only email message IDs, labels, and email headers',
					},
					{
						name: 'Minimal',
						value: 'minimal',
						description: 'Returns only email message IDs and labels; does not return the email headers, body, or payload',
					},
				],
				default: 'minimal',
			},
			{
				displayName: 'Return Only Messages',
				name: 'returnOnlyMessages',
				type: 'boolean',
				default: true,
				description: 'Whether to return only thread messages',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 thread:getAll                              */
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
					'thread',
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
					'thread',
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
		displayName: 'Fetching a lot of messages may take a long time. Consider using filters to speed things up',
		name: 'filtersNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'thread',
				],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				displayName: 'Include Spam and Trash',
				name: 'includeSpamTrash',
				type: 'boolean',
				default: false,
				description: 'Whether to include threads from SPAM and TRASH in the results',
			},
			{
				displayName: 'Label ID Names or IDs',
				name: 'labelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description: 'Only return threads with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				description: 'Get all emails received after the specified date. In an expression you can set date using string in ISO format or a timestamp in miliseconds.',
			},
			{
				displayName: 'Received Before',
				name: 'receivedBefore',
				type: 'dateTime',
				default: '',
				description: 'Get all emails received before the specified date. In an expression you can set date using string in ISO format or a timestamp in miliseconds.',
			},
		],
	},
];
