import type { INodeProperties } from 'n8n-workflow';

export const threadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['thread'],
			},
		},
		options: [
			{
				name: 'Add Label',
				value: 'addLabels',
				action: 'Add label to thread',
			},
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
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many threads',
			},
			{
				name: 'Remove Label',
				value: 'removeLabels',
				action: 'Remove label from thread',
			},
			{
				name: 'Reply',
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
				resource: ['thread'],
				operation: ['get', 'delete', 'reply', 'trash', 'untrash'],
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
			loadOptionsDependsOn: ['threadId'],
		},
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['thread'],
				operation: ['reply'],
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
				resource: ['thread'],
				operation: ['reply'],
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
				resource: ['thread'],
				operation: ['reply'],
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
				resource: ['thread'],
				operation: ['reply'],
			},
		},
		default: {},
		options: [
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
				description: 'The name displayed in your contacts inboxes',
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
	/* -------------------------------------------------------------------------- */
	/*                                 thread:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['thread'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['thread'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
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
				operation: ['getAll'],
				resource: ['thread'],
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
				resource: ['thread'],
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
		displayName:
			'Fetching a lot of messages may take a long time. Consider using filters to speed things up',
		name: 'filtersNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['thread'],
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
				resource: ['thread'],
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
				description:
					'Only return threads with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                      label:addLabel, removeLabel                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '172ce2c4a72cc243',
		displayOptions: {
			show: {
				resource: ['thread'],
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
				resource: ['thread'],
				operation: ['addLabels', 'removeLabels'],
			},
		},
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	},
];
